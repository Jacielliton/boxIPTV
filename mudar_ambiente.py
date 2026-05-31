import os
import re

# Ajuste para garantir que acha a pasta 'frontend/src' onde quer que o script seja rodado
PASTA_SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend", "src")

AMBIENTES = {
    "1": {"nome": "Localhost (Desenvolvimento local)", "url": "http://localhost:8006"},
    "2": {"nome": "APP Android / Domínio (HTTPS Seguro)", "url": "https://iptv.tecnopriv.top"},
    "3": {"nome": "VPS (IP Direto)", "url": "http://72.60.3.89:8006"},
    "4": {"nome": "Produção Web Nginx (Caminho Relativo)", "url": ""},
    "5": {"nome": "Railway (Produção Backend)", "url": "https://boxiptv-production.up.railway.app"} 
}

def limpar_tela():
    os.system('cls' if os.name == 'nt' else 'clear')

def trocar_urls(nova_url, nome_ambiente):
    arquivos_alterados = 0
    print(f"\nProcurando ficheiros em: {PASTA_SRC}")

    urls_antigas = [
        "http://localhost:8006",
        "https://iptv.tecnopriv.top",
        "http://72.60.3.89:8006",
        "https://boxiptv-production.up.railway.app",
        "boxiptv-production.up.railway.app"
    ]

    for root, dirs, files in os.walk(PASTA_SRC):
        for file in files:
            if file.endswith((".jsx", ".js")):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    conteudo = f.read()
                
                novo_conteudo = conteudo
                for url_antiga in urls_antigas:
                    if nova_url != "":
                        novo_conteudo = novo_conteudo.replace(url_antiga, nova_url)
                    else:
                        # Se for a opção 4 (caminho relativo vazio), removemos apenas as URLs antigas base
                        novo_conteudo = novo_conteudo.replace(url_antiga + "/api", "/api")
                
                if novo_conteudo != conteudo:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(novo_conteudo)
                    arquivos_alterados += 1
                    print(f" -> Modificado: {file}")
                    
    print(f"\n==============================================")
    print(f"🚀 Ambiente alterado para: {nome_ambiente}")
    print(f"✅ {arquivos_alterados} ficheiros atualizados com sucesso.")
    print(f"==============================================\n")

if __name__ == "__main__":
    limpar_tela()
    print("=== MUDANÇA DE AMBIENTE BOXIPTV ===")
    for key, env in AMBIENTES.items():
        print(f" [{key}] {env['nome']}")
    escolha = input("\nEscolha (1-4): ")
    if escolha in AMBIENTES:
        trocar_urls(AMBIENTES[escolha]['url'], AMBIENTES[escolha]['nome'])
    else:
        print("Escolha inválida.")