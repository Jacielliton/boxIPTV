from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt
import bcrypt
import requests
import uvicorn
import time

# Importações do seu banco de dados (certifique-se de que database.py e models.py estão na mesma pasta)
import models
from database import engine, get_db

# 1. INICIALIZAÇÃO E CONFIGURAÇÃO
# Cria as tabelas no SQLite se não existirem
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="BoxIPTV Pro")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# O Cache para as rotas IPTV antigas
cache = {}
CACHE_TTL = 3600  # 1 hora

def get_cache_key(server_url, username, tipo):
    return f"{server_url}_{username}_{tipo}"

# 2. CONFIGURAÇÕES DE SEGURANÇA E JWT
SECRET_KEY = "chave-super-secreta-mude-em-producao" # Troque isso quando for para a VPS
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def verify_password(plain_password: str, hashed_password: str):
    # O bcrypt compara os bytes, por isso fazemos o encode
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str):
    # Gera o salt e o hash em bytes, depois descodifica para string para gravar no SQLite
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_bytes.decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta = timedelta(hours=24)):
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
        
    # Bloqueia se não for admin e o premium expirou
    if not user.is_admin and datetime.utcnow() > user.premium_until:
         raise HTTPException(status_code=403, detail="Seu período premium expirou. Contate o suporte.")
         
    return user

def get_current_admin(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado. Privilégios de administrador necessários.")
    return current_user


# 3. SCHEMAS DO PYDANTIC (Para validar entrada de dados)
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


# ==========================================
# ROTAS DO SISTEMA (NOVAS)
# ==========================================

@app.post("/api/register", tags=["Autenticação"])
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Usuário já registrado")
    
    novo_usuario = models.User(
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password)
    )
    db.add(novo_usuario)
    db.commit()
    return {"message": "Usuário criado com sucesso. Você tem 7 dias grátis!"}

@app.post("/api/login", tags=["Autenticação"])
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == user_data.username).first()
    
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciais incorretas")
        
    if not user.is_admin and datetime.utcnow() > user.premium_until:
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
    url_limpa = playlist.server_url.rstrip('/')
    
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
# ROTAS DO PAINEL ADMIN (NOVAS)
# ==========================================

@app.get("/api/admin/users", tags=["Admin"])
def listar_usuarios(admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "premium_until": u.premium_until,
            "is_admin": u.is_admin,
            "status": "Ativo" if u.premium_until > datetime.utcnow() else "Expirado"
        } for u in users
    ]

@app.put("/api/admin/users/{user_id}/premium", tags=["Admin"])
def adicionar_dias_premium(user_id: int, update_data: PremiumUpdate, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    data_base = user.premium_until if user.premium_until > datetime.utcnow() else datetime.utcnow()
    user.premium_until = data_base + timedelta(days=update_data.dias_adicionais)
    
    db.commit()
    return {"message": f"Adicionado {update_data.dias_adicionais} dias para {user.username}. Válido até {user.premium_until.strftime('%d/%m/%Y')}"}


# ==========================================
# ROTAS ANTIGAS DE PROXY IPTV (MANTIDAS)
# ==========================================

@app.get("/api/auth", tags=["IPTV Proxy"])
def verificar_login_iptv(server_url: str, user: str, passw: str):
    api_url = f"{server_url}/player_api.php?username={user}&password={passw}"
    try:
        response = requests.get(api_url, timeout=15)
        response.raise_for_status()
        dados = response.json()
        if "user_info" in dados and dados["user_info"].get("auth") == 1:
            return {"status": "sucesso", "mensagem": "Login aprovado no IPTV"}
        else:
            raise HTTPException(status_code=401, detail="Usuário ou senha IPTV incorretos.")
    except requests.exceptions.RequestException:
        raise HTTPException(status_code=400, detail="Não foi possível conectar ao servidor IPTV.")
    except ValueError:
        raise HTTPException(status_code=400, detail="O servidor retornou uma resposta inválida.")

@app.get("/api/filmes", tags=["IPTV Proxy"])
def get_filmes(server_url: str, user: str, passw: str):
    cache_key = get_cache_key(server_url, user, "filmes")
    agora = time.time()
    
    if cache_key in cache and (agora - cache[cache_key]["timestamp"] < CACHE_TTL):
        return cache[cache_key]["data"]

    api_url = f"{server_url}/player_api.php?username={user}&password={passw}&action=get_vod_streams"
    try:
        response = requests.get(api_url, timeout=20)
        response.raise_for_status()
        dados = response.json()
        cache[cache_key] = {"data": dados, "timestamp": agora}
        return dados
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar filmes: {str(e)}")

@app.get("/api/series", tags=["IPTV Proxy"])
def get_series(server_url: str, user: str, passw: str):
    cache_key = get_cache_key(server_url, user, "series")
    agora = time.time()
    
    if cache_key in cache and (agora - cache[cache_key]["timestamp"] < CACHE_TTL):
        return cache[cache_key]["data"]

    api_url = f"{server_url}/player_api.php?username={user}&password={passw}&action=get_series"
    try:
        response = requests.get(api_url, timeout=20)
        response.raise_for_status()
        dados = response.json()
        cache[cache_key] = {"data": dados, "timestamp": agora}
        return dados
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar séries: {str(e)}")

@app.get("/api/series/{series_id}", tags=["IPTV Proxy"])
def get_series_info(series_id: int, server_url: str, user: str, passw: str):
    api_url = f"{server_url}/player_api.php?username={user}&password={passw}&action=get_series_info&series_id={series_id}"
    try:
        response = requests.get(api_url, timeout=15)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar info da série: {str(e)}")

@app.get("/api/ao-vivo", tags=["IPTV Proxy"])
def get_ao_vivo(server_url: str, user: str, passw: str):
    cache_key = get_cache_key(server_url, user, "ao_vivo")
    agora = time.time()
    
    if cache_key in cache and (agora - cache[cache_key]["timestamp"] < CACHE_TTL):
        return cache[cache_key]["data"]

    api_url = f"{server_url}/player_api.php?username={user}&password={passw}&action=get_live_streams"
    try:
        response = requests.get(api_url, timeout=20)
        response.raise_for_status()
        dados = response.json()
        cache[cache_key] = {"data": dados, "timestamp": agora}
        return dados
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar TV ao vivo: {str(e)}")

@app.get("/api/categorias/{tipo}", tags=["IPTV Proxy"])
def get_categorias(tipo: str, server_url: str, user: str, passw: str):
    action_map = {
        "filmes": "get_vod_categories",
        "series": "get_series_categories",
        "ao-vivo": "get_live_categories"
    }
    
    if tipo not in action_map:
        raise HTTPException(status_code=400, detail="Tipo de categoria inválido")

    action = action_map[tipo]
    cache_key = get_cache_key(server_url, user, f"cat_{tipo}")
    agora = time.time()
    
    if cache_key in cache and (agora - cache[cache_key]["timestamp"] < CACHE_TTL):
        return cache[cache_key]["data"]

    api_url = f"{server_url}/player_api.php?username={user}&password={passw}&action={action}"
    try:
        response = requests.get(api_url, timeout=15)
        response.raise_for_status()
        dados = response.json()
        cache[cache_key] = {"data": dados, "timestamp": agora}
        return dados
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar categorias: {str(e)}")

@app.get("/api/filmes/{vod_id}", tags=["IPTV Proxy"])
def get_filme_info(vod_id: int, server_url: str, user: str, passw: str):
    api_url = f"{server_url}/player_api.php?username={user}&password={passw}&action=get_vod_info&vod_id={vod_id}"
    try:
        response = requests.get(api_url, timeout=15)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar info do filme: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8006, reload=True)