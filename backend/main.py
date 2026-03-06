from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt
import bcrypt
import uvicorn

# Importações do seu banco de dados
import models
from database import engine, get_db

# 1. INICIALIZAÇÃO E CONFIGURAÇÃO
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="BoxIPTV Pro - Backend Core")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3006",      
        "http://iptv.tecnopriv.top",  
        "https://iptv.tecnopriv.top", 
        "capacitor://localhost",      
        "http://localhost",
        "https://localhost",           
        "ionic://localhost"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# UTILITÁRIOS
# ==========================================
def limpar_url_iptv(url: str) -> str:
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "http://" + url
    url = url.rstrip('/')
    if url.endswith("player_api.php"):
        url = url.replace("/player_api.php", "").replace("player_api.php", "")
    return url.rstrip('/')

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
        if username is None: raise credenciais_exception
    except jwt.PyJWTError:
        raise credenciais_exception
        
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None: raise credenciais_exception

    if hasattr(user, 'is_active') and not user.is_active:
        raise HTTPException(status_code=403, detail="Sua conta foi desabilitada pelo administrador.")
        
    if not user.is_admin:
         if user.premium_until is None or datetime.utcnow() > user.premium_until:
             raise HTTPException(status_code=403, detail="Seu período premium expirou. Contate o suporte.")
         
    return user

def get_current_admin(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Acesso negado. Privilégios de administrador necessários.")
    return current_user


# 3. SCHEMAS DO PYDANTIC
class UserCreate(BaseModel): username: str; password: str
class UserLogin(BaseModel): username: str; password: str
class PlaylistCreate(BaseModel): name: str; server_url: str; iptv_username: str; iptv_password: str
class PremiumUpdate(BaseModel): dias_adicionais: int
class StatusUpdate(BaseModel): status: str

# ==========================================
# ROTAS DO SISTEMA (LOGIN / REGISTO / PLAYLISTS)
# ==========================================

@app.post("/api/register", tags=["Autenticação"])
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Usuário já registrado")
    novo_usuario = models.User(username=user_data.username, hashed_password=get_password_hash(user_data.password), premium_until=datetime.utcnow() + timedelta(days=7))
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
    if not user.is_admin:
        if user.premium_until is None or datetime.utcnow() > user.premium_until:
            raise HTTPException(status_code=403, detail="Seu período premium expirou.")

    token = create_access_token(data={"sub": user.username, "is_admin": user.is_admin})
    return {"access_token": token, "token_type": "bearer", "premium_until": user.premium_until, "is_admin": user.is_admin}

@app.post("/api/playlists", tags=["Playlists"])
def adicionar_playlist(playlist: PlaylistCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    url_limpa = limpar_url_iptv(playlist.server_url)
    nova_playlist = models.Playlist(name=playlist.name, server_url=url_limpa, iptv_username=playlist.iptv_username, iptv_password=playlist.iptv_password, user_id=current_user.id)
    db.add(nova_playlist)
    db.commit()
    db.refresh(nova_playlist)
    return {"message": "Playlist adicionada com sucesso!", "id": nova_playlist.id}

@app.get("/api/playlists", tags=["Playlists"])
def listar_playlists(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Playlist).filter(models.Playlist.user_id == current_user.id).all()

@app.delete("/api/playlists/{playlist_id}", tags=["Playlists"])
def deletar_playlist(playlist_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id, models.Playlist.user_id == current_user.id).first()
    if not playlist: raise HTTPException(status_code=404, detail="Playlist não encontrada")
    db.delete(playlist)
    db.commit()
    return {"message": "Playlist removida"}

# ==========================================
# ROTAS DO PAINEL ADMIN
# ==========================================

@app.get("/api/admin/users", tags=["Admin"])
def listar_usuarios(admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    resultado = []
    for u in users:
        status_atual = "Ativo"
        if hasattr(u, 'is_active') and not u.is_active: status_atual = "Desabilitado"
        elif not u.is_admin and (u.premium_until is None or u.premium_until < datetime.utcnow()): status_atual = "Expirado"
        resultado.append({"id": u.id, "username": u.username, "premium_until": u.premium_until, "is_admin": u.is_admin, "status": status_atual})
    return resultado

@app.put("/api/admin/users/{user_id}/premium", tags=["Admin"])
def adicionar_dias_premium(user_id: int, update_data: PremiumUpdate, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="Usuário não encontrado")
    data_base = user.premium_until if (user.premium_until and user.premium_until > datetime.utcnow()) else datetime.utcnow()
    user.premium_until = data_base + timedelta(days=update_data.dias_adicionais)
    db.commit()
    return {"message": f"Adicionado {update_data.dias_adicionais} dias."}

@app.put("/api/admin/users/{user_id}/status", tags=["Admin"])
def alterar_status_usuario(user_id: int, update_data: StatusUpdate, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="Usuário não encontrado")
    user.is_active = (update_data.status == "Ativo")
    db.commit()
    return {"message": "Status alterado com sucesso!"}

@app.delete("/api/admin/users/{user_id}", tags=["Admin"])
def deletar_usuario(user_id: int, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.is_admin: raise HTTPException(status_code=403, detail="Não é possível apagar a conta do administrador.")
    db.delete(user)
    db.commit()
    return {"message": "Utilizador apagado."}

@app.get("/api/admin/users/{user_id}/playlists", tags=["Admin"])
def admin_listar_playlists_usuario(user_id: int, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(models.Playlist).filter(models.Playlist.user_id == user_id).all()

@app.post("/api/admin/users/{user_id}/playlists", tags=["Admin"])
def admin_criar_playlist(user_id: int, playlist_data: PlaylistCreate, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    url_limpa = limpar_url_iptv(playlist_data.server_url)
    nova_playlist = models.Playlist(name=playlist_data.name, server_url=url_limpa, iptv_username=playlist_data.iptv_username, iptv_password=playlist_data.iptv_password, user_id=user_id)
    db.add(nova_playlist)
    db.commit()
    return {"message": "Playlist adicionada!"}

@app.put("/api/admin/playlists/{playlist_id}", tags=["Admin"])
def admin_editar_playlist(playlist_id: int, update_data: PlaylistCreate, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist: raise HTTPException(status_code=404, detail="Playlist não encontrada")
    playlist.name = update_data.name
    playlist.server_url = limpar_url_iptv(update_data.server_url)
    playlist.iptv_username = update_data.iptv_username
    playlist.iptv_password = update_data.iptv_password
    db.commit()
    return {"message": "Playlist atualizada!"}

@app.delete("/api/admin/playlists/{playlist_id}", tags=["Admin"])
def admin_remover_playlist(playlist_id: int, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist: raise HTTPException(status_code=404, detail="Playlist não encontrada")
    db.delete(playlist)
    db.commit()
    return {"message": "Playlist removida."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8006, reload=True)