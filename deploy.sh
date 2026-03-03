#!/bin/bash

# ==========================================
# CONFIGURAÇÕES
# ==========================================
PROJECT_DIR="/var/www/boxIPTV"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"

# O IP e porta (ou domínio) da sua API
API_URL="http://72.60.3.89:8006" 

echo "=========================================="
echo "🚀 INICIANDO DEPLOY AUTOMÁTICO - BOXIPTV"
echo "=========================================="

# 1. Puxar atualizações do Git (Descomente a linha abaixo se quiser que o script faça git pull automaticamente)
# echo "📥 Baixando atualizações do repositório..."
# cd $PROJECT_DIR
# git pull

# 2. Substituir localhost pelo IP da VPS dinamicamente
echo "🔍 Ajustando URLs da API no Frontend..."
# O comando FIND procura todos os arquivos .jsx e .js e o SED substitui a URL
find $FRONTEND_DIR/src -type f \( -name "*.jsx" -o -name "*.js" \) -exec sed -i "s|http://localhost:8006|$API_URL|g" {} +

# 3. Compilar o Frontend
echo "📦 Instalando dependências e compilando o Frontend..."
cd $FRONTEND_DIR
npm install
npm run build

# 4. Reiniciar os serviços
echo "🔄 Reiniciando Backend (FastAPI) e Nginx..."
sudo systemctl restart boxiptv-backend
sudo systemctl restart nginx

echo "=========================================="
echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo "🌐 Acesse: http://iptv.tecnopriv.top"
echo "=========================================="