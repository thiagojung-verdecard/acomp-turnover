$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path '.env.local')) {
  Write-Host '[WARN] .env.local nao encontrado. Copiando de .env.example'
  Copy-Item '.env.example' '.env.local'
}

if (-not (Test-Path 'node_modules')) {
  Write-Host '[INFO] Instalando dependencias npm...'
  npm install
}

Write-Host '[INFO] Subindo frontend + backend (Next.js app + API routes) em http://localhost:3000'
npm run dev
