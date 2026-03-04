import os
import re

PASTA_SRC = os.path.join(os.getcwd(), "frontend", "src")

AMBIENTES = {
    "1": {"nome": "Localhost (Desenvolvimento local)", "url": "http://localhost:8006"},
    "2": {"nome": "APP / Domínio (HTTPS Seguro)", "url": "https://iptv.tecnopriv.top"}, # <-- HTTPS e sem porta!
    "3": {"nome": "VPS (IP Direto)", "url": "http://72.60.3.89:8006"}
}

URLS_ANTIGOS = [
    r"http://iptv\.tecnopriv\.top:8006",
    r"http://localhost:8006:8006",
    r"https://iptv\.tecnopriv\.top",
    r"http://iptv\.tecnopriv\.top",
    r"http://localhost:8006",
    r"http://72\.60\.3\.89:8006"
]
regex_urls = re.compile("|".join(URLS_ANTIGOS))

def limpar_tela():
    os.system('cls' if os.name == 'nt' else 'clear')

def trocar_urls(nova_url, nome_ambiente):
    arquivos_alterados = 0
    print(f"\nProcurando ficheiros em: {PASTA_SRC}")
    for root, dirs, files in os.walk(PASTA_SRC):
        for file in files:
            if file.endswith((".jsx", ".js")):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    conteudo = f.read()
                novo_conteudo, count = re.subn(regex_urls, nova_url, conteudo)
                if count > 0:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(novo_conteudo)
                    arquivos_alterados += 1
    print(f"🚀 Ambiente alterado para: {nome_ambiente}")

if __name__ == "__main__":
    limpar_tela()
    for key, env in AMBIENTES.items():
        print(f" [{key}] {env['nome']}")
    escolha = input("\nEscolha (0-3): ")
    if escolha in AMBIENTES:
        trocar_urls(AMBIENTES[escolha]['url'], AMBIENTES[escolha]['nome'])