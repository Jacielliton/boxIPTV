import getpass
import bcrypt
from datetime import datetime, timedelta
from database import SessionLocal
import models

def get_password_hash(password: str):
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_bytes.decode('utf-8')

def criar_admin():
    print("=======================================")
    print("  Gerenciador de Admin - BoxIPTV Pro   ")
    print("=======================================")
    
    username = input("Digite o nome do usuário Admin: ").strip()
    if not username:
        print("Erro: O nome de usuário não pode estar vazio.")
        return

    password = getpass.getpass("Digite a senha: ").strip()
    if not password:
        print("Erro: A senha não pode estar vazia.")
        return

    db = SessionLocal()
    try:
        # Verifica se o usuário já existe
        user = db.query(models.User).filter(models.User.username == username).first()
        
        if user:
            print(f"\n[!] O usuário '{username}' já existe.")
            confirmacao = input("Deseja promovê-lo a Admin e atualizar a senha? (s/n): ")
            if confirmacao.lower() == 's':
                user.is_admin = True
                user.hashed_password = get_password_hash(password)
                # Dá 10 anos de premium para o admin não se preocupar
                user.premium_until = datetime.utcnow() + timedelta(days=3650) 
                db.commit()
                print(f"\n[SUCESSO] Usuário '{username}' promovido a Admin!")
            else:
                print("Operação cancelada.")
            return

        # Se não existe, cria um novo
        novo_admin = models.User(
            username=username,
            hashed_password=get_password_hash(password),
            is_admin=True,
            premium_until=datetime.utcnow() + timedelta(days=3650) # 10 anos de premium
        )
        db.add(novo_admin)
        db.commit()
        print(f"\n[SUCESSO] Administrador '{username}' criado com sucesso!")

    except Exception as e:
        print(f"\n[ERRO] Ocorreu um problema: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Garante que as tabelas existam antes de tentar inserir
    from database import engine
    models.Base.metadata.create_all(bind=engine)
    criar_admin()