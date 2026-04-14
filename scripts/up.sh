#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[INFO] Encerrando processos antigos do Next e liberando porta 3000..."
pkill -f "next dev" 2>/dev/null || true
if command -v lsof >/dev/null 2>&1; then
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

if [[ ! -f ".env.local" ]]; then
  echo "[WARN] .env.local nao encontrado. Copiando de .env.example"
  cp .env.example .env.local
fi

if [[ ! -d node_modules ]]; then
  echo "[INFO] Instalando dependencias npm..."
  npm install
fi

echo "[INFO] Subindo frontend + backend (Next.js app + API routes) em http://localhost:3000"
exec npm run dev -- --hostname 0.0.0.0 --port 3000
