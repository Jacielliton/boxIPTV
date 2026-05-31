import os
import re

# Aponta para a raiz do frontend e para a pasta src
PASTA_FRONTEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
PASTA_SRC = os.path.join(PASTA_FRONTEND, "src")
ARQUIVO_INDEX = os.path.join(PASTA_FRONTEND, "index.html")

AMBIENTES = {
    "1": {"nome": "Localhost", "url": "http://localhost:8006"},
    "2": {"nome": "APP Android / Domínio", "url": "https://iptv.tecnopriv.top"},
    "3": {"nome": "VPS", "url": "http://72.60.3.89:8006"},
    "4": {"nome": "Produção Web Nginx", "url": ""},
    "5": {"nome": "Railway", "url": "https://boxiptv-production.up.railway.app"} 
}

def limpar_tela():
    os.system('cls' if os.name == 'nt' else 'clear')

def trocar_urls(nova_url, nome_ambiente):
    arquivos_alterados = 0
    
    # Regex rigorosa: Pega os IPs antigos e todas as variações (corretas ou bugadas) da URL do Railway
    padrao_urls = re.compile(
        r"(http://localhost:8006|"
        r"https://iptv\.tecnopriv\.top|"
        r"http://72\.60\.3\.89:8006|"
        r"https://https//boxiptv-production\.up\.railway\.app|"
        r"https://https://boxiptv-production\.up\.railway\.app|"
        r"https://boxiptv-production\.up\.railway\.app|"
        r"boxiptv-production\.up\.railway\.app)"
    )

    def processar_arquivo(filepath):
        nonlocal arquivos_alterados
        with open(filepath, 'r', encoding='utf-8') as f:
            conteudo = f.read()
        
        # Se for o ambiente relativo (4), limpa a string base. Caso contrário, aplica a URL completa.
        novo_conteudo = padrao_urls.sub("" if nova_url == "" else nova_url, conteudo)
        
        if novo_conteudo != conteudo:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(novo_conteudo)
            arquivos_alterados += 1
            print(f" -> Modificado: {os.path.basename(filepath)}")

    print(f"\nProcurando ficheiros em: {PASTA_SRC} e index.html")

    # 1. Processar a pasta src (Arquivos React)
    for root, dirs, files in os.walk(PASTA_SRC):
        for file in files:
            if file.endswith((".jsx", ".js")):
                processar_arquivo(os.path.join(root, file))
    
    # 2. Processar o index.html principal (Tela da TV)
    if os.path.exists(ARQUIVO_INDEX):
        processar_arquivo(ARQUIVO_INDEX)

    print(f"\n==============================================")
    print(f"🚀 Ambiente alterado para: {nome_ambiente}")
    print(f"✅ {arquivos_alterados} ficheiros atualizados com sucesso.")
    print(f"==============================================\n")

if __name__ == "__main__":
    limpar_tela()
    print("=== MUDANÇA DE AMBIENTE BOXIPTV ===")
    for key, env in AMBIENTES.items():
        print(f" [{key}] {env['nome']}")
    escolha = input("\nEscolha (1-5): ")
    if escolha in AMBIENTES:
        trocar_urls(AMBIENTES[escolha]['url'], AMBIENTES[escolha]['nome'])
    else:
        print("Escolha inválida.")