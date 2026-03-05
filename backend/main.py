from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt
import bcrypt
import httpx
import uvicorn
import time

# Importações do seu banco de dados
import models
from database import engine, get_db

# 1. INICIALIZAÇÃO E CONFIGURAÇÃO
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="BoxIPTV Pro")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3006",      # Para testes de desenvolvimento local com o Vite
        "http://iptv.tecnopriv.top",  # Acesso web via HTTP
        "https://iptv.tecnopriv.top", # Acesso web seguro via HTTPS
        "capacitor://localhost",      # Essencial para o App Mobile (iOS) rodar
        "http://localhost",           # Essencial para o App Mobile (Android Webview)
        "ionic://localhost"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cache = {}
CACHE_TTL = 3600  # 1 hora

# ==========================================
# ROTAS DE PROXY IPTV
# ==========================================

# 1. FUNÇÃO MÁGICA: Limpa e corrige a URL
def limpar_url_iptv(url: str) -> str:
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "http://" + url
    
    url = url.rstrip('/')
    if url.endswith("player_api.php"):
        url = url.replace("/player_api.php", "").replace("player_api.php", "")
        
    return url.rstrip('/')

def get_cache_key(server_url, username, tipo):
    return f"{server_url}_{username}_{tipo}"

# Disfarce global
HEADERS_IPTV = {"User-Agent": "IPTVSmartersPlayer"}

# 2. CONFIGURAÇÕES DE SEGURANÇA E JWT
SECRET_KEY = "chave-super-secreta-mude-em-producao"
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def verify_password(plain_password: str, hashed_password: str):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str):
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_bytes.decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta = timedelta(days=3650)):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credenciais_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credenciais_exception
    except jwt.PyJWTError:
        raise credenciais_exception
        
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credenciais_exception

    if hasattr(user, 'is_active') and not user.is_active:
        raise HTTPException(status_code=403, detail="Sua conta foi desabilitada pelo administrador.")
        
    # BLINDAGEM: Verifica se é None (nulo) antes de tentar comparar datas
    if not user.is_admin:
         if user.premium_until is None or datetime.utcnow() > user.premium_until:
             raise HTTPException(status_code=403, detail="Seu período premium expirou. Contate o suporte.")
         
    return user

def get_current_admin(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado. Privilégios de administrador necessários.")
    return current_user


# 3. SCHEMAS DO PYDANTIC
class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class PlaylistCreate(BaseModel):
    name: str
    server_url: str
    iptv_username: str
    iptv_password: str

class PremiumUpdate(BaseModel):
    dias_adicionais: int

class StatusUpdate(BaseModel):
    status: str


# ==========================================
# ROTAS DO SISTEMA
# ==========================================

@app.post("/api/register", tags=["Autenticação"])
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Usuário já registrado")
    
    # Dá os 7 dias grátis fisicamente na base de dados
    novo_usuario = models.User(
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        premium_until=datetime.utcnow() + timedelta(days=7)
    )
    db.add(novo_usuario)
    db.commit()
    return {"message": "Usuário criado com sucesso. Você tem 7 dias grátis!"}

@app.post("/api/login", tags=["Autenticação"])
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == user_data.username).first()
    
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciais incorretas")

    if hasattr(user, 'is_active') and not user.is_active:
        raise HTTPException(status_code=403, detail="Conta desabilitada pelo administrador.")
        
    # BLINDAGEM NO LOGIN: Verifica se a conta normal expirou ou está nula
    if not user.is_admin:
        if user.premium_until is None or datetime.utcnow() > user.premium_until:
            raise HTTPException(status_code=403, detail="Seu período premium expirou.")

    token = create_access_token(data={"sub": user.username, "is_admin": user.is_admin})
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "premium_until": user.premium_until,
        "is_admin": user.is_admin
    }

@app.post("/api/playlists", tags=["Playlists"])
def adicionar_playlist(playlist: PlaylistCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # MÁGICA: Limpa a URL antes de guardar na Base de Dados!
    url_limpa = limpar_url_iptv(playlist.server_url)
    
    nova_playlist = models.Playlist(
        name=playlist.name,
        server_url=url_limpa,
        iptv_username=playlist.iptv_username,
        iptv_password=playlist.iptv_password,
        user_id=current_user.id
    )
    db.add(nova_playlist)
    db.commit()
    db.refresh(nova_playlist)
    return {"message": "Playlist adicionada com sucesso!", "id": nova_playlist.id}

@app.get("/api/playlists", tags=["Playlists"])
def listar_playlists(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    playlists = db.query(models.Playlist).filter(models.Playlist.user_id == current_user.id).all()
    return playlists


# ==========================================
# ROTAS DO PAINEL ADMIN
# ==========================================

@app.get("/api/admin/users", tags=["Admin"])
def listar_usuarios(admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    
    resultado = []
    for u in users:
        status_atual = "Ativo"
        if hasattr(u, 'is_active') and not u.is_active:
            status_atual = "Desabilitado"
        # BLINDAGEM NO PAINEL ADMIN
        elif not u.is_admin and (u.premium_until is None or u.premium_until < datetime.utcnow()):
            status_atual = "Expirado"
            
        resultado.append({
            "id": u.id,
            "username": u.username,
            "premium_until": u.premium_until,
            "is_admin": u.is_admin,
            "status": status_atual
        })
        
    return resultado

@app.put("/api/admin/users/{user_id}/premium", tags=["Admin"])
def adicionar_dias_premium(user_id: int, update_data: PremiumUpdate, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # BLINDAGEM: Se não tiver data ou já tiver expirado, usa a data de hoje como base
    data_base = user.premium_until if (user.premium_until and user.premium_until > datetime.utcnow()) else datetime.utcnow()
    user.premium_until = data_base + timedelta(days=update_data.dias_adicionais)
    
    db.commit()
    return {"message": f"Adicionado {update_data.dias_adicionais} dias para {user.username}. Válido até {user.premium_until.strftime('%d/%m/%Y')}"}

@app.put("/api/admin/users/{user_id}/status", tags=["Admin"])
def alterar_status_usuario(user_id: int, update_data: StatusUpdate, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    user.is_active = (update_data.status == "Ativo")
    db.commit()
    return {"message": f"Status de {user.username} alterado para {update_data.status}!"}

@app.delete("/api/admin/users/{user_id}", tags=["Admin"])
def deletar_usuario(user_id: int, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.is_admin:
        raise HTTPException(status_code=403, detail="Não é possível apagar a conta do administrador mestre.")
    db.delete(user)
    db.commit()
    return {"message": "Utilizador apagado permanentemente."}

# GESTÃO DE PLAYLISTS POR PARTE DO ADMIN
@app.get("/api/admin/users/{user_id}/playlists", tags=["Admin"])
def admin_listar_playlists_usuario(user_id: int, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    playlists = db.query(models.Playlist).filter(models.Playlist.user_id == user_id).all()
    return playlists

@app.post("/api/admin/users/{user_id}/playlists", tags=["Admin"])
def admin_criar_playlist(user_id: int, playlist_data: PlaylistCreate, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    url_limpa = limpar_url_iptv(playlist_data.server_url)
    
    nova_playlist = models.Playlist(
        name=playlist_data.name,
        server_url=url_limpa,
        iptv_username=playlist_data.iptv_username,
        iptv_password=playlist_data.iptv_password,
        user_id=user_id
    )
    db.add(nova_playlist)
    db.commit()
    return {"message": "Playlist adicionada com sucesso ao utilizador!"}

@app.put("/api/admin/playlists/{playlist_id}", tags=["Admin"])
def admin_editar_playlist(playlist_id: int, update_data: PlaylistCreate, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist não encontrada")
        
    playlist.name = update_data.name
    playlist.server_url = limpar_url_iptv(update_data.server_url) # Limpa na edição
    playlist.iptv_username = update_data.iptv_username
    playlist.iptv_password = update_data.iptv_password
    db.commit()
    return {"message": "Playlist atualizada com sucesso!"}

@app.delete("/api/admin/playlists/{playlist_id}", tags=["Admin"])
def admin_remover_playlist(playlist_id: int, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist não encontrada")
    db.delete(playlist)
    db.commit()
    return {"message": "Playlist removida pelo administrador."}


# ==========================================
# ROTAS DE PROXY IPTV
# ==========================================

@app.get("/api/auth", tags=["IPTV Proxy"])
async def verificar_login_iptv(server_url: str, user: str, passw: str):
    base_url = limpar_url_iptv(server_url)
    api_url = f"{base_url}/player_api.php?username={user}&password={passw}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(api_url, headers=HEADERS_IPTV, timeout=20.0) # Notar o 'await'
            response.raise_for_status()
            dados = response.json()
            if "user_info" in dados and dados["user_info"].get("auth") == 1:
                return {"status": "sucesso", "mensagem": "Login aprovado no IPTV"}
            else:
                raise HTTPException(status_code=401, detail="Usuário ou senha IPTV incorretos.")
        except Exception:
            raise HTTPException(status_code=400, detail="Não foi possível conectar ao servidor IPTV.")

@app.get("/api/filmes", tags=["IPTV Proxy"])
async def get_filmes(server_url: str, user: str, passw: str):
    base_url = limpar_url_iptv(server_url)
    cache_key = get_cache_key(base_url, user, "filmes")
    agora = time.time()
    if cache_key in cache and (agora - cache[cache_key]["timestamp"] < CACHE_TTL):
        return cache[cache_key]["data"]
    
    api_url = f"{base_url}/player_api.php?username={user}&password={passw}&action=get_vod_streams"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(api_url, headers=HEADERS_IPTV, timeout=20.0) # Notar o 'await'
            response.raise_for_status()
            try:
                dados = response.json()
                cache[cache_key] = {"data": dados, "timestamp": agora}
                return dados
            except ValueError:
                return [] # Escudo Ativo
        except Exception:
            return [] # Escudo Ativo

@app.get("/api/series", tags=["IPTV Proxy"])
async def get_series(server_url: str, user: str, passw: str):
    base_url = limpar_url_iptv(server_url)
    cache_key = get_cache_key(base_url, user, "series")
    agora = time.time()
    if cache_key in cache and (agora - cache[cache_key]["timestamp"] < CACHE_TTL):
        return cache[cache_key]["data"]
        
    api_url = f"{base_url}/player_api.php?username={user}&password={passw}&action=get_series"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(api_url, headers=HEADERS_IPTV, timeout=20)
            response.raise_for_status()
            try:
                dados = response.json()
                cache[cache_key] = {"data": dados, "timestamp": agora}
                return dados
            except ValueError:
                return []
        except Exception:
            return []

@app.get("/api/series/{series_id}", tags=["IPTV Proxy"])
async def get_series_info(series_id: int, server_url: str, user: str, passw: str):
    base_url = limpar_url_iptv(server_url)
    api_url = f"{base_url}/player_api.php?username={user}&password={passw}&action=get_series_info&series_id={series_id}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(api_url, headers=HEADERS_IPTV, timeout=15)
            response.raise_for_status()
            try:
                return response.json()
            except ValueError:
                return {"info": {"name": "Série", "description": "Info indisponível."}, "episodes": {}}
        except Exception:
            return {"info": {"name": "Série", "description": "Info indisponível."}, "episodes": {}}

@app.get("/api/ao-vivo", tags=["IPTV Proxy"])
async def get_ao_vivo(server_url: str, user: str, passw: str):
    base_url = limpar_url_iptv(server_url)
    cache_key = get_cache_key(base_url, user, "ao_vivo")
    agora = time.time()
    if cache_key in cache and (agora - cache[cache_key]["timestamp"] < CACHE_TTL):
        return cache[cache_key]["data"]
        
    api_url = f"{base_url}/player_api.php?username={user}&password={passw}&action=get_live_streams"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(api_url, headers=HEADERS_IPTV, timeout=20)
            response.raise_for_status()
            try:
                dados = response.json()
                cache[cache_key] = {"data": dados, "timestamp": agora}
                return dados
            except ValueError:
                return []
        except Exception:
            return []

@app.get("/api/categorias/{tipo}", tags=["IPTV Proxy"])
async def get_categorias(tipo: str, server_url: str, user: str, passw: str):
    base_url = limpar_url_iptv(server_url)
    action_map = {"filmes": "get_vod_categories", "series": "get_series_categories", "ao-vivo": "get_live_categories"}
    if tipo not in action_map:
        raise HTTPException(status_code=400, detail="Tipo de categoria inválido")
    
    action = action_map[tipo]
    cache_key = get_cache_key(base_url, user, f"cat_{tipo}")
    agora = time.time()
    if cache_key in cache and (agora - cache[cache_key]["timestamp"] < CACHE_TTL):
        return cache[cache_key]["data"]
        
    api_url = f"{base_url}/player_api.php?username={user}&password={passw}&action={action}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(api_url, headers=HEADERS_IPTV, timeout=15)
            response.raise_for_status()
            try:
                dados = response.json()
                cache[cache_key] = {"data": dados, "timestamp": agora}
                return dados
            except ValueError:
                return []
        except Exception:
            return []

@app.get("/api/filmes/{vod_id}", tags=["IPTV Proxy"])
async def get_filme_info(vod_id: int, server_url: str, user: str, passw: str):
    base_url = limpar_url_iptv(server_url)
    api_url = f"{base_url}/player_api.php?username={user}&password={passw}&action=get_vod_info&vod_id={vod_id}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(api_url, headers=HEADERS_IPTV, timeout=15)
            response.raise_for_status()
            try:
                return response.json()
            except ValueError:
                return {"info": {"name": "Filme", "description": "Informações não disponibilizadas pelo servidor."}, "movie_data": {"stream_id": vod_id, "container_extension": "mp4"}}
        except Exception:
            return {"info": {"name": "Filme", "description": "Informações não disponibilizadas pelo servidor."}, "movie_data": {"stream_id": vod_id, "container_extension": "mp4"}}

@app.get("/api/epg", tags=["IPTV Proxy"])
async def get_epg(stream_id: int, server_url: str, user: str, passw: str):
    base_url = limpar_url_iptv(server_url)
    cache_key = get_cache_key(base_url, user, f"epg_{stream_id}")
    agora = time.time()
    if cache_key in cache and (agora - cache[cache_key]["timestamp"] < 900):
        return cache[cache_key]["data"]
        
    api_url = f"{base_url}/player_api.php?username={user}&password={passw}&action=get_short_epg&stream_id={stream_id}&limit=10"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(api_url, headers=HEADERS_IPTV, timeout=10)
            response.raise_for_status()
            try:
                dados = response.json()
                cache[cache_key] = {"data": dados, "timestamp": agora}
                return dados
            except ValueError:
                return {"epg_listings": []}
        except Exception:
            return {"epg_listings": []}

@app.delete("/api/playlists/{playlist_id}", tags=["Playlists"])
def deletar_playlist(playlist_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id, models.Playlist.user_id == current_user.id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist não encontrada")
    db.delete(playlist)
    db.commit()
    return {"message": "Playlist removida"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8006, reload=True)