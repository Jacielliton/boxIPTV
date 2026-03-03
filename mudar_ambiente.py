import os
import re

# Caminho para a pasta onde estão os ficheiros React (.jsx)
# Presume que o script está na raiz do projeto (fora da pasta frontend)
PASTA_SRC = os.path.join(os.getcwd(), "frontend", "src")

# Os URLs dos seus 3 ambientes
AMBIENTES = {
    "1": {"nome": "Localhost (Desenvolvimento local)", "url": "http://localhost:8006"},
    "2": {"nome": "APP / Domínio (Produção / APK)", "url": "http://iptv.tecnopriv.top"},
    "3": {"nome": "VPS (IP Direto)", "url": "http://72.60.3.89:8006"}
}

# Regex para procurar qualquer um dos URLs antigos no código
URLS_ANTIGOS = [
    r"http://localhost:8006",
    r"http://iptv\.tecnopriv\.top",
    r"http://72\.60\.3\.89:8006"
]
regex_urls = re.compile("|".join(URLS_ANTIGOS))

def limpar_tela():
    os.system('cls' if os.name == 'nt' else 'clear')

def trocar_urls(nova_url, nome_ambiente):
    arquivos_alterados = 0
    total_trocas = 0

    print(f"\nProcurando ficheiros em: {PASTA_SRC}")
    print("-" * 50)

    # Percorre todos os ficheiros dentro da pasta frontend/src
    for root, dirs, files in os.walk(PASTA_SRC):
        for file in files:
            if file.endswith((".jsx", ".js")):
                filepath = os.path.join(root, file)
                
                # Lê o conteúdo do ficheiro
                with open(filepath, 'r', encoding='utf-8') as f:
                    conteudo = f.read()

                # Substitui os URLs antigos pela nova URL
                novo_conteudo, count = re.subn(regex_urls, nova_url, conteudo)

                # Se encontrou e substituiu algo, guarda o ficheiro
                if count > 0:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(novo_conteudo)
                    print(f"✅ {file} -> {count} URL(s) atualizada(s)")
                    arquivos_alterados += 1
                    total_trocas += count

    print("-" * 50)
    print(f"🚀 SUCESSO! Ambiente alterado para: {nome_ambiente}")
    print(f"   Nova URL ativa: {nova_url}")
    print(f"   Ficheiros modificados: {arquivos_alterados}")
    print(f"   Total de substituições: {total_trocas}")
    print("-" * 50)

def menu():
    limpar_tela()
    print("==========================================")
    print("   GERENCIADOR DE AMBIENTES - BOXIPTV     ")
    print("==========================================")
    
    for key, env in AMBIENTES.items():
        print(f" [{key}] {env['nome']}")
        print(f"     URL: {env['url']}\n")
    
    print(" [0] Sair")
    print("==========================================")
    
    escolha = input("Escolha o ambiente desejado (0-3): ")
    
    if escolha == "0":
        print("Saindo...")
        return
    elif escolha in AMBIENTES:
        ambiente_selecionado = AMBIENTES[escolha]
        trocar_urls(ambiente_selecionado['url'], ambiente_selecionado['nome'])
    else:
        print("Opção inválida. Tente novamente.")
        input("Pressione Enter para continuar...")
        menu()

if __name__ == "__main__":
    # Verifica se a pasta frontend/src existe
    if not os.path.exists(PASTA_SRC):
        print(f"❌ ERRO: A pasta '{PASTA_SRC}' não foi encontrada.")
        print("Certifique-se de executar este script na raiz do projeto (ao lado da pasta 'frontend').")
    else:
        menu()