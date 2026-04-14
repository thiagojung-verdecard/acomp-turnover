'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type Period = '7d' | '30d' | '90d'
export type RiskLevel = 'BAIXO' | 'MEDIO' | 'ALTO' | 'MUITO_ALTO'
type Tone = 'neutral' | 'good' | 'warn' | 'danger'

export interface TurnoverPayload {
  period: Period
  generatedAt: string
  source: {
    mode: 'pool' | 'mock-fallback'
    database: string
    table: string
    rawRows: number
    extractedRows: number
    classifiedRows: number
    warning?: string
  }
  cutsByRole: Record<string, { MEDIO: number; ALTO: number; MUITO_ALTO: number }>
  kpis: {
    totalCpfs: number
    scoreMedioGlobal: number
    riscoMuitoAlto: number
    riscoAltoMaisMuitoAlto: number
    riscoMedio: number
    riscoBaixo: number
    pctAltoMaisMuitoAlto: number
  }
  dailyScoreByCargo: Array<{
    date: string
    cargo: string
    scoreMedio: number
    scoreMediano: number
    volumeCpfs: number
  }>
  riskDistribution: Array<{
    cargo: string
    risco: RiskLevel
    count: number
    pct: number
  }>
  alertas: Array<{ cargo: string; mensagem: string }>
}

interface Props {
  initialData: TurnoverPayload
  initialPeriod: Period
}

const PERIOD_OPTIONS: Period[] = ['7d', '30d', '90d']

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
}

const RISK_COLORS: Record<RiskLevel, string> = {
  BAIXO: '#119669',
  MEDIO: '#d6951a',
  ALTO: '#e26d28',
  MUITO_ALTO: '#d83a48',
}

const TONE_CONFIG: Record<Tone, { card: string; label: string; icon: string }> = {
  neutral: {
    card: 'border-stone-200 bg-white',
    label: 'text-stone-500',
    icon: 'bg-stone-100 text-stone-700',
  },
  good: {
    card: 'border-emerald-200 bg-emerald-50/80',
    label: 'text-emerald-700',
    icon: 'bg-emerald-100 text-emerald-700',
  },
  warn: {
    card: 'border-amber-200 bg-amber-50/80',
    label: 'text-amber-700',
    icon: 'bg-amber-100 text-amber-700',
  },
  danger: {
    card: 'border-rose-200 bg-rose-50/80',
    label: 'text-rose-700',
    icon: 'bg-rose-100 text-rose-700',
  },
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6" />
      <path d="M23 11h-6" />
    </svg>
  )
}

function IconGauge({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 14l4-4" />
      <path d="M3.34 17a10 10 0 1 1 17.32 0" />
    </svg>
  )
}

function IconAlert({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconRefresh({ className, spinning }: { className?: string; spinning?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className ?? ''} ${spinning ? 'animate-spin' : ''}`}
      style={spinning ? { animationDuration: '0.8s' } : undefined}
    >
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  )
}

function IconDatabase({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" />
      <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
    </svg>
  )
}

function IconBars({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function IconArrowTrend({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  )
}

function IconTarget({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-stone-400">
      <IconBars className="h-10 w-10 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

function StatTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      <button type="button" className="rounded-full p-0.5 text-stone-400 transition hover:text-stone-600">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>
      {visible ? <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-xl border border-stone-200 bg-white p-3 text-xs leading-relaxed text-stone-600 shadow-xl">{text}</div> : null}
    </div>
  )
}

function useRelativeTime(iso: string | null) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!iso) return
    function compute() {
      const diff = Math.floor((Date.now() - new Date(iso!).getTime()) / 1000)
      if (diff < 60) return `há ${diff}s`
      if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
      return `há ${Math.floor(diff / 3600)} h`
    }
    setLabel(compute())
    const id = setInterval(() => setLabel(compute()), 30000)
    return () => clearInterval(id)
  }, [iso])

  return label
}

function StatCard({ title, value, subtitle, tone, icon, tooltip }: { title: string; value: string; subtitle?: string; tone: Tone; icon: ReactNode; tooltip?: string }) {
  const cfg = TONE_CONFIG[tone]

  return (
    <article className={`rounded-[1.4rem] border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${cfg.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${cfg.label}`}>{title}</p>
          {tooltip ? <StatTooltip text={tooltip} /> : null}
        </div>
        <div className={`rounded-xl p-2.5 ring-1 ring-black/5 ${cfg.icon}`}>{icon}</div>
      </div>
      <p className="mt-4 font-mono text-4xl font-bold leading-none text-stone-950">{value}</p>
      {subtitle ? <p className="mt-2 text-sm text-stone-500">{subtitle}</p> : null}
    </article>
  )
}

function TopSummaryStrip({ data }: { data: TurnoverPayload }) {
  const highestRiskRole = [...data.riskDistribution]
    .filter((item) => item.risco === 'MUITO_ALTO')
    .sort((a, b) => b.count - a.count)[0]

  return (
    <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <article className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_38%),linear-gradient(135deg,#0f172a_0%,#1f2937_55%,#0f172a_100%)] p-6 text-white shadow-lg">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">Visão executiva</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Turnover sob monitoramento contínuo</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Consolidado do período com classificação por risco, cortes por cargo e volumetria de colaboradores avaliados.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-right">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Período</p>
              <p className="mt-1 text-xl font-semibold">{PERIOD_LABELS[data.period]}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Criticidade</p>
              <p className="mt-1 text-xl font-semibold">{data.kpis.pctAltoMaisMuitoAlto.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </article>

      <article className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Maior pressão</p>
        <p className="mt-3 text-2xl font-semibold text-stone-900">{highestRiskRole?.cargo ?? 'Sem dados'}</p>
        <p className="mt-2 text-sm text-stone-500">
          {highestRiskRole ? `${highestRiskRole.count} colaboradores em risco muito alto` : 'Nenhum cargo com risco crítico no período.'}
        </p>
        <div className="mt-5 rounded-2xl bg-stone-50 p-4">
          <div className="flex items-center gap-2 text-sm text-stone-600">
            <IconDatabase className="text-stone-500" />
            <span>{data.source.mode === 'pool' ? 'Dados reais do banco' : 'Modo fallback local'}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-stone-400">Linhas brutas</p>
              <p className="font-mono text-lg font-semibold text-stone-900">{data.source.rawRows.toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-stone-400">Classificadas</p>
              <p className="font-mono text-lg font-semibold text-stone-900">{data.source.classifiedRows.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>
      </article>
    </section>
  )
}

function ExecutiveSidebar({ data }: { data: TurnoverPayload }) {
  const sourceLabel = data.source.mode === 'pool' ? 'Banco de dados' : 'Fallback local'

  return (
    <aside className="dashboard-panel sticky top-6 hidden h-fit p-5 xl:block">
      <p className="panel-kicker">Navegação</p>
      <h2 className="mt-2 text-xl font-semibold text-stone-950">Leitura rápida</h2>

      <nav className="mt-5 space-y-2 text-sm">
        <a href="#overview" className="dashboard-nav-item">Visão geral</a>
        <a href="#timeseries" className="dashboard-nav-item">Evolução temporal</a>
        <a href="#distribution" className="dashboard-nav-item">Distribuição de risco</a>
        <a href="#roles" className="dashboard-nav-item">Ranking por cargo</a>
        <a href="#data-quality" className="dashboard-nav-item">Qualidade da ingestão</a>
      </nav>

      <div className="mt-6 rounded-2xl bg-stone-50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">Fonte ativa</p>
        <p className="mt-2 text-sm font-medium text-stone-900">{sourceLabel}</p>
        <p className="mt-1 text-xs leading-5 text-stone-500">{data.source.table}</p>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="flex items-center gap-2 text-stone-500">
            <IconArrowTrend className="text-sky-700" />
            <span className="text-xs uppercase tracking-[0.16em]">Criticidade</span>
          </div>
          <p className="mt-3 font-mono text-3xl font-semibold text-stone-950">{data.kpis.pctAltoMaisMuitoAlto.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-stone-500">Base classificada em alto ou muito alto.</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="flex items-center gap-2 text-stone-500">
            <IconTarget className="text-emerald-700" />
            <span className="text-xs uppercase tracking-[0.16em]">Cobertura</span>
          </div>
          <p className="mt-3 font-mono text-3xl font-semibold text-stone-950">{data.source.classifiedRows}</p>
          <p className="mt-1 text-xs text-stone-500">Registros finais considerados no painel.</p>
        </div>
      </div>
    </aside>
  )
}

function RoleSummaryTable({ data }: { data: TurnoverPayload }) {
  const roleRows = useMemo(() => {
    const scoreByRole = new Map<string, { total: number; count: number }>()
    const riskByRole = new Map<string, { alto: number; muitoAlto: number; total: number }>()

    data.dailyScoreByCargo.forEach((row) => {
      const current = scoreByRole.get(row.cargo) ?? { total: 0, count: 0 }
      current.total += row.scoreMedio
      current.count += 1
      scoreByRole.set(row.cargo, current)
    })

    data.riskDistribution.forEach((row) => {
      const current = riskByRole.get(row.cargo) ?? { alto: 0, muitoAlto: 0, total: 0 }
      current.total += row.count
      if (row.risco === 'ALTO') current.alto += row.count
      if (row.risco === 'MUITO_ALTO') current.muitoAlto += row.count
      riskByRole.set(row.cargo, current)
    })

    return Array.from(riskByRole.entries())
      .map(([cargo, risk]) => {
        const score = scoreByRole.get(cargo)
        const pctCritico = risk.total > 0 ? ((risk.alto + risk.muitoAlto) / risk.total) * 100 : 0
        return {
          cargo,
          mediaScore: score ? score.total / score.count : 0,
          volume: risk.total,
          alto: risk.alto,
          muitoAlto: risk.muitoAlto,
          pctCritico,
        }
      })
      .sort((a, b) => b.pctCritico - a.pctCritico)
  }, [data])

  return (
    <article id="roles" className="dashboard-panel p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="panel-kicker">Prioridade por cargo</p>
          <h2 className="panel-title">Ranking de criticidade</h2>
          <p className="panel-subtitle">Leitura operacional para priorização de atuação por função.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-stone-400">
              <th className="pb-1 font-semibold">Cargo</th>
              <th className="pb-1 font-semibold">Score médio</th>
              <th className="pb-1 font-semibold">Volume</th>
              <th className="pb-1 font-semibold">Críticos</th>
              <th className="pb-1 font-semibold">Pressão</th>
            </tr>
          </thead>
          <tbody>
            {roleRows.map((row) => (
              <tr key={row.cargo} className="rounded-2xl bg-stone-50 text-sm text-stone-700 shadow-[inset_0_0_0_1px_rgba(231,229,228,1)]">
                <td className="rounded-l-2xl px-4 py-4 font-semibold text-stone-900">{row.cargo}</td>
                <td className="px-4 py-4 font-mono">{row.mediaScore.toFixed(2)}</td>
                <td className="px-4 py-4 font-mono">{row.volume}</td>
                <td className="px-4 py-4 font-mono">{row.alto + row.muitoAlto}</td>
                <td className="rounded-r-2xl px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-200">
                      <div className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b_0%,#ef4444_100%)]" style={{ width: `${Math.min(row.pctCritico, 100)}%` }} />
                    </div>
                    <span className="font-mono text-xs font-semibold text-stone-700">{row.pctCritico.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}

export function TurnoverDashboard({ initialData, initialPeriod }: Props) {
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [selectedCargo, setSelectedCargo] = useState<string>(initialData.dailyScoreByCargo[0]?.cargo ?? 'GERENTE')
  const [data, setData] = useState<TurnoverPayload>(initialData)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(initialData.generatedAt)
  const firstLoadDone = useRef(true)
  const relativeTime = useRelativeTime(lastFetchedAt)

  const fetchData = useCallback(async (nextPeriod: Period) => {
    setIsFetching(true)
    setError(null)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
      const response = await fetch(`/api/dashboard/turnover?period=${nextPeriod}`, {
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`Falha ao carregar API: ${response.status}`)
      const payload = (await response.json()) as TurnoverPayload
      setData(payload)
      setLastFetchedAt(payload.generatedAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      clearTimeout(timeout)
      setIsFetching(false)
    }
  }, [])

  useEffect(() => {
    if (firstLoadDone.current) {
      firstLoadDone.current = false
      return
    }
    void fetchData(period)
  }, [period, fetchData])

  const cargos = useMemo(() => Array.from(new Set((data.dailyScoreByCargo ?? []).map((r) => r.cargo))), [data])

  useEffect(() => {
    if (!cargos.length) return
    if (!cargos.includes(selectedCargo)) setSelectedCargo(cargos[0])
  }, [cargos, selectedCargo])

  const trendData = useMemo(() => data.dailyScoreByCargo.filter((r) => r.cargo === selectedCargo), [data, selectedCargo])

  const distributionChartData = useMemo(() => {
    const byCargo: Record<string, { cargo: string; BAIXO: number; MEDIO: number; ALTO: number; MUITO_ALTO: number }> = {}
    data.riskDistribution.forEach((row) => {
      if (!byCargo[row.cargo]) {
        byCargo[row.cargo] = { cargo: row.cargo, BAIXO: 0, MEDIO: 0, ALTO: 0, MUITO_ALTO: 0 }
      }
      byCargo[row.cargo][row.risco] = row.count
    })
    return Object.values(byCargo)
  }, [data])

  const cut = data.cutsByRole[selectedCargo]

  return (
    <main className="dashboard-shell">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-4rem] h-80 w-80 rounded-full bg-sky-200/35 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-96 w-96 rounded-full bg-orange-100/60 blur-3xl" />
      </div>

      {isFetching ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/45 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm text-stone-600 shadow-lg">
            <IconRefresh spinning className="text-sky-700" />
            Atualizando {PERIOD_LABELS[period]}...
          </div>
        </div>
      ) : null}

      <div className="relative mx-auto max-w-[1600px] px-4 py-8 md:px-6 xl:px-8">
        <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">Monitoramento operacional</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-950">Dashboard de Turnover RH</h1>
            <p className="mt-2 text-sm text-stone-500">
              {data.source.mode === 'pool' ? 'Dados reais do banco DB_RISCO' : 'Fallback local'}
              <span className="mx-2 text-stone-300">·</span>
              <span title={new Date(lastFetchedAt ?? data.generatedAt).toLocaleString('pt-BR')}>Atualizado {relativeTime || 'agora'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.16em] text-stone-400">Origem</p>
              <p className="mt-1 font-medium text-stone-800">{data.source.table}</p>
            </div>
            <label className="text-sm font-medium text-stone-600" htmlFor="period">Período</label>
            <select
              id="period"
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-700 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            >
              {PERIOD_OPTIONS.map((item) => <option key={item} value={item}>{PERIOD_LABELS[item]}</option>)}
            </select>
            <button
              type="button"
              onClick={() => void fetchData(period)}
              className="inline-flex items-center gap-2 rounded-2xl bg-stone-950 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800"
            >
              <IconRefresh /> Atualizar
            </button>
          </div>
        </header>

        {error ? <section className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Falha ao atualizar: {error}</section> : null}
        {data.source.warning ? <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">Aviso de conectividade: {data.source.warning}</section> : null}

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <ExecutiveSidebar data={data} />

          <div>
            <section id="overview">
              <TopSummaryStrip data={data} />
            </section>

            <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-6">
          <StatCard title="CPFs avaliados" value={data.kpis.totalCpfs.toLocaleString('pt-BR')} subtitle="volume único consolidado" tone="neutral" icon={<IconUsers className="text-stone-700" />} tooltip="Quantidade única de CPFs avaliados no período." />
          <StatCard title="Score médio" value={data.kpis.scoreMedioGlobal.toFixed(2)} subtitle="média geral da base classificada" tone="neutral" icon={<IconGauge className="text-stone-700" />} tooltip="Média do score turnover após deduplicação e classificação por dia." />
          <StatCard title="Muito alto" value={data.kpis.riscoMuitoAlto.toLocaleString('pt-BR')} subtitle="casos críticos" tone="danger" icon={<IconAlert className="text-rose-700" />} />
          <StatCard title="Alto + muito alto" value={data.kpis.riscoAltoMaisMuitoAlto.toLocaleString('pt-BR')} subtitle={`${data.kpis.pctAltoMaisMuitoAlto.toFixed(1)}% da base`} tone="warn" icon={<IconAlert className="text-amber-700" />} />
          <StatCard title="Risco médio" value={data.kpis.riscoMedio.toLocaleString('pt-BR')} subtitle="monitoramento preventivo" tone="warn" icon={<IconGauge className="text-amber-700" />} />
          <StatCard title="Risco baixo" value={data.kpis.riscoBaixo.toLocaleString('pt-BR')} subtitle="faixa controlada" tone="good" icon={<IconUsers className="text-emerald-700" />} />
            </section>

            <section id="timeseries" className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
              <article className="dashboard-panel p-6">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="panel-kicker">Evolução temporal</p>
                <h2 className="panel-title">Score diário por cargo</h2>
                <p className="panel-subtitle">Comparativo entre score médio e mediano com cortes de risco por função.</p>
              </div>
              <select
                value={selectedCargo}
                onChange={(e) => setSelectedCargo(e.target.value)}
                className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              >
                {cargos.map((cargo) => <option key={cargo} value={cargo}>{cargo}</option>)}
              </select>
            </div>

            <div className="h-[400px]">
              {trendData.length === 0 ? (
                <EmptyChart message="Sem série temporal disponível para o cargo selecionado." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#78716c' }} tickLine={false} axisLine={{ stroke: '#d6d3d1' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#78716c' }} tickLine={false} axisLine={{ stroke: '#d6d3d1' }} />
                    <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #e7e5e4', boxShadow: '0 12px 30px rgba(0,0,0,.08)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="scoreMedio" stroke="#0f4c81" strokeWidth={3} dot={false} name="Score médio" />
                    <Line type="monotone" dataKey="scoreMediano" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="6 6" dot={false} name="Score mediano" />
                    {cut ? <ReferenceLine y={cut.MEDIO} stroke="#d6951a" strokeDasharray="4 4" label="Corte médio" /> : null}
                    {cut ? <ReferenceLine y={cut.ALTO} stroke="#e26d28" strokeDasharray="4 4" label="Corte alto" /> : null}
                    {cut ? <ReferenceLine y={cut.MUITO_ALTO} stroke="#d83a48" strokeDasharray="4 4" label="Corte muito alto" /> : null}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
              </article>

              <article id="distribution" className="dashboard-panel p-6">
            <div className="mb-5">
              <p className="panel-kicker">Composição</p>
              <h2 className="panel-title">Distribuição de risco</h2>
              <p className="panel-subtitle">Volumetria por cargo e faixa de risco consolidada.</p>
            </div>

            <div className="h-[400px]">
              {distributionChartData.length === 0 ? (
                <EmptyChart message="Sem distribuição de risco para o período selecionado." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionChartData} margin={{ top: 16, right: 12, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                    <XAxis dataKey="cargo" tick={{ fontSize: 11, fill: '#78716c' }} interval={0} angle={-12} textAnchor="end" height={70} tickLine={false} axisLine={{ stroke: '#d6d3d1' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#78716c' }} tickLine={false} axisLine={{ stroke: '#d6d3d1' }} />
                    <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #e7e5e4', boxShadow: '0 12px 30px rgba(0,0,0,.08)' }} />
                    <Legend />
                    <Bar dataKey="BAIXO" fill={RISK_COLORS.BAIXO} radius={[5, 5, 0, 0]} />
                    <Bar dataKey="MEDIO" fill={RISK_COLORS.MEDIO} radius={[5, 5, 0, 0]} />
                    <Bar dataKey="ALTO" fill={RISK_COLORS.ALTO} radius={[5, 5, 0, 0]} />
                    <Bar dataKey="MUITO_ALTO" fill={RISK_COLORS.MUITO_ALTO} radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
              </article>
            </section>

            <section className="mt-6">
              <article id="data-quality" className="dashboard-panel p-6">
            <div className="mb-4">
              <p className="panel-kicker">Diagnóstico</p>
              <h2 className="panel-title">Qualidade da ingestão</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Linhas brutas</p>
                <p className="mt-2 font-mono text-2xl font-semibold text-stone-900">{data.source.rawRows.toLocaleString('pt-BR')}</p>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Linhas extraídas</p>
                <p className="mt-2 font-mono text-2xl font-semibold text-stone-900">{data.source.extractedRows.toLocaleString('pt-BR')}</p>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-400">Classificadas</p>
                <p className="mt-2 font-mono text-2xl font-semibold text-stone-900">{data.source.classifiedRows.toLocaleString('pt-BR')}</p>
              </div>
            </div>
              </article>
            </section>

            <section className="mt-6">
              <RoleSummaryTable data={data} />
            </section>

            {data.alertas.length > 0 ? (
              <section className="mt-6">
                <div className="mb-3 flex items-center gap-2">
                  <IconAlert className="text-rose-600" />
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-700">Alertas ativos ({data.alertas.length})</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {data.alertas.map((alerta, index) => (
                    <article key={`${alerta.cargo}-${index}`} className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">{alerta.cargo}</p>
                      <p className="mt-2 text-sm leading-6 text-rose-900">{alerta.mensagem}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}