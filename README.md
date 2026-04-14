# Dashboard Acompanhamento Turnover

Migração moderna do script de acompanhamento de turnover legado para Next.js + TypeScript + React.

## 🚀 Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
# Edit .env.local with your settings
```

### 3. Run development server

```bash
pnpm dev
# Open http://localhost:3000
```

# Dashboard Acompanhamento Turnover

Migração moderna do script de acompanhamento de turnover legado para Next.js + TypeScript + React com conexão ao pool HTTP interno.

## 🎯 Estado Atual

### ✅ Implementado
- **Frontend**: Dashboard completo React + Recharts com KPIs, gráficos de evolução, volumetria de risco
- **Backend**: API Next.js `/api/dashboard/turnover` com processamento de dados real
- **Integração**: Conexão HTTP ao pool interno (172.17.0.1:8080) seguindo padrão 0007_acomp_lim_auto
- **Fallback**: Mock controlado quando pool indisponível (marcar modo e avisar na UI)
- **Lógica legada**: Processamento completo reproduzido (deduplicação CPF/dia/geo, risco por menor peso, agregações)

### ⚠️ Observações
- **Esquema de tabela**: O projeto atual se conecta ao pool real, mas a tabela `DB_RISCO.dbo.db_risco_dados_contratacao_rh` pode ter um mapeamento diferente do esperado se houver mudanças na estrutura de dados
- **Query de dados**: Requer ajuste da stored procedure ou SQL se o schema da tabela mudou

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
# ou yarn / pnpm
```

### 2. Environment Setup

```bash
# Cria arquivo .env.local com configurações do pool
cat .env.example > .env.local

# Editar .env.local com host/port/database do seu pool:
POOL_RUNTIME=Linux
POOL_HOST=172.17.0.1          # Ou seu host pool
POOL_PORT=8080
POOL_DATABASE=FABRIC_THIAGO
TURNOVER_ALLOW_MOCK_FALLBACK=true  # Fallback quando pool indisponível
```

### 3. Run Development Server

```bash
npm run dev
# Abre http://localhost:3000
```

### 4. Endpoints Disponíveis

- **Dashboard**: http://localhost:3000 (home page com gráficos)
- **API Turnover**: http://localhost:3000/api/dashboard/turnover?period=30d (dados brutos)
- **API Métricas**: http://localhost:3000/api/dashboard/metrics?period=30d (KPIs simples)

---

## 📊 Dashboard Features

### KPIs
- `totalCpfs` — Unicos avaliados no período
- `scoreMedioGlobal` — Score médio global
- `riscoMuitoAlto` / `riscoAlto` / `riscoMedio` / `riscoBaixo` — Distribuição por nível
- `pctAltoMaisMuitoAlto` — % crítico

### Gráficos
1. **Evolução Diária** — Score médio e mediano por cargo com linhas de corte
2. **Volumetria** — Stack bar mostrando distribuição de risco por cargo
3. **Alertas** — Avisos de scores acima de UCL

### Períodos Suportados
- `7d` — Últimos 7 dias
- `30d` — Últimos 30 dias (padrão)
- `90d` — Últimos 90 dias

---

## 🔌 Arquitetura de Pool

A integração com o pool segue exatamente o padrão do projeto 0007 (acomp_lim_auto):

### Flow de Dados
1. **Frontend** (React) → chamada GET `/api/dashboard/turnover?period=30d`
2. **Backend** (Next.js API Route) → Conecta ao pool via HTTP POST
3. **Pool** (172.17.0.1:8080) → POST `/read_sql/` com SQL + database + timeout
4. Response → JSON (string-encoded) de linhas de dados
5. **Processing** → Parse, extração, limpeza, classificação e agregação
6. **Frontend** recebe JSON tipado com KPIs, série diária, distribuição, alertas

### Configuração de Pool (`.env.local`)

```ini
POOL_RUNTIME=Linux              # Linux ou Windows — seleciona host padrão
POOL_HOST=172.17.0.1            # Host HTTP do pool (override padrão)
POOL_PORT=8080                  # Porta HTTP (padrão 8080)
POOL_DATABASE=FABRIC_THIAGO     # Database lógica
TURNOVER_ALLOW_MOCK_FALLBACK=true  # Ativa fallback determinístico quando offline
```

### Fallback Mode
Quando pool está indisponível:
- **Modo ativado**: Gera dados mock determinísticos preservando a mesma lógica de processamento
- **Indicador no payload**: `source.mode = "mock-fallback"` + `source.warning`
- **UI**: Mostra aviso amarelo indicando que é modo fallback
- **Desabilitar**: `TURNOVER_ALLOW_MOCK_FALLBACK=false` → 502 error se pool off

---

## 📁 Estrutura de Dados

### Entrada (Pool)
Linhas brutas da tabela `DB_RISCO.dbo.db_risco_dados_contratacao_rh`:
- `CPF`, `DATA_INSERCAO` (ou `DIA_HORA`/`DATA_ADMISSAO`)
- `SCORE_TURNOVER` (ou `SCORE` se SCORE_TURNOVER não existe)
- `RISCO` (normalizado para BAIXO/MEDIO/ALTO/MUITO_ALTO)
- `ULTIMA_FUNCAO` (ou derivada de flags VENDEDOR/COORD_ADM/ESTOQUISTA/GERENTE)
- `CIDADE`, `ESTADO` (para geo-deduplication)

### Processamento (3 etapas)
1. **Extract** — Normaliza CPF, data, score, risco, função; filtra nulls
2. **Classify** — Deduplicação por `CPF/__DATA_DIA` mantendo último + menor risco
3. **Aggregate** — Group by `DATA_DIA/__FUNCAO` e cálculo de métricas (média, mediana, volume, KPIs)

### Saída (API Response)
```typescript
{
  period: "30d",
  generatedAt: "2026-04-07T19:XX:XXZ",
  source: { mode: "pool" | "mock-fallback", warning?: string, ... },
  cutsByRole: { /* Cortes por cargo */ },
  kpis: { totalCpfs, scoreMedioGlobal, riscoMuitoAlto, ... },
  dailyScoreByCargo: [ { date, cargo, scoreMedio, scoreMediano, volumeCpfs }, ... ],
  riskDistribution: [ { cargo, risco, count, pct }, ... ],
  alertas: [ { cargo, mensagem }, ... ],
}
```

---

## 🔐 Segurança & Observações

- ✅ TypeScript strict — Tipagem completa no backend
- ✅ Pool credentials — Via env vars (nunca hardcoded)
- ✅ Fallback controlado — Não compromete UI quando offline
- ⚠️ **Validação de entrada** — Pool é fonte confiável; sem validação extra de malware
- ⚠️ **Cache** — Sem cache implementado (sempre fresco do pool)

---

## 🛠️ Development Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Build para produção
npm run start        # Roda build de produção
npm run type-check   # TypeScript validation
npm run lint         # ESLint check
npm run format       # Prettier format
npm run test         # Vitest (watch mode)
npm run test:cov     # Test coverage
```

---

## 📚 Tecnologias

| Layer | Tech |
|---|---|
| **Frontend** | Next.js 14 + React 18 + TypeScript |
| **UI** | Recharts (gráficos), Tailwind CSS (styles) |
| **Backend** | Next.js API Routes |
| **Data** | HTTP client nativo (fetch API) |
| **Formatos** | JSON, ISO8601 dates |

---

## 🤔 Troubleshooting

### "Pool unreachable"
- Verificar `POOL_HOST` e `POOL_PORT` em `.env.local`
- Confirmar que pool está rodando: `telnet [POOL_HOST] [POOL_PORT]`
- Se offline: `TURNOVER_ALLOW_MOCK_FALLBACK=true` (padrão)

### "extractedRows: 0"
- Verificar schema da tabela de source
- Confirmar que colunas esperadas existem: CPF, DATA_INSERCAO/DIA_HORA/DATA_ADMISSAO, SCORE_TURNOVER/SCORE, RISCO
- Testar query manualmente no pool

### "Dashboard carregando infinitamente"
- Abrir DevTools (F12) → Console e Network
- Confirmar que `/api/dashboard/turnover` retorna 200 (não 502)
- Se 502: verificar logs do server (`npm run dev` output)

---

## 📖 Links Relacionados

- **Projeto legado**: Script Python em anexo (acomp_turnover_riscos.py)
- **Projeto referência**: `/home/ubuntu/DS/Estudos/0007_acomp_lim_auto/` (padrão pool)
- **Pool schema**: DB_RISCO.dbo.db_risco_dados_contratacao_rh
- **Database**: FABRIC_THIAGO

---

## ⚙️ Environment Variables

```ini
# Exposto ao browser (público)
NEXT_PUBLIC_APP_NAME=Turnover Dashboard

# Servidor (privado)
POOL_RUNTIME=Linux
POOL_HOST=172.17.0.1
POOL_PORT=8080
POOL_DATABASE=FABRIC_THIAGO
TURNOVER_ALLOW_MOCK_FALLBACK=true
```


Type `/` in the chat to see available commands:

- `/dashboard-page` - Bootstrap a new page
- `/dashboard-widget` - Create a widget
- `/data-hook` - Generate a data hook
- `/export-csv` - Add CSV export
- `/form-builder` - Build a form

---

**Questions?** See the [main README](../../README.md) for workspace-wide guidelines.

```
project_name/
├── src/
│   └── project_name/
│       ├── __init__.py
│       ├── data/           # Dataset loading and splitting
│       ├── preprocessing/  # Feature engineering pipelines
│       ├── models/         # Model architecture definitions
│       ├── training/       # Training loop and checkpointing
│       ├── evaluation/     # Metrics and evaluation reports
│       └── serving/        # Inference wrapper
├── tests/
│   ├── conftest.py
│   ├── unit/
│   └── integration/
├── notebooks/              # Exploratory analysis (not production code)
├── docs/
│   └── decisions/          # ADRs
├── .env.example
├── pyproject.toml
└── README.md
```

## Contributing

1. Create a feature branch: `git checkout -b feat/<short-description>`
2. Make changes following the conventions in `.github/instructions/`
3. Run checks: `ruff check . && ruff format . && pytest --cov=src`
4. Open a pull request

## License

MIT
