import { NextRequest, NextResponse } from 'next/server'

const CARGOS = [
  'CONSULTOR DE VENDAS',
  'COORDENADOR ADMINISTRATIVO',
  'GERENTE',
  'ESTOQUISTA',
] as const

const RISCOS = ['BAIXO', 'MEDIO', 'ALTO', 'MUITO_ALTO'] as const

const CORTES_POR_CARGO: Record<(typeof CARGOS)[number], { MEDIO: number; ALTO: number; MUITO_ALTO: number }> = {
  'CONSULTOR DE VENDAS': { MEDIO: 45.9319, ALTO: 58.6783, MUITO_ALTO: 70.6409 },
  'COORDENADOR ADMINISTRATIVO': { MEDIO: 19.704, ALTO: 27.7202, MUITO_ALTO: 38.472 },
  GERENTE: { MEDIO: 17.442, ALTO: 26.9734, MUITO_ALTO: 36.8284 },
  ESTOQUISTA: { MEDIO: 36.1929, ALTO: 50.5046, MUITO_ALTO: 63.7055 },
}

type Period = '7d' | '30d' | '90d'

type InputRow = Record<string, unknown>

interface ExtractedRow {
  CPF: string
  DATAREF: Date
  DATA_DIA: string
  SCORE_TURNOVER: number
  RISCO: string
  ULTIMA_FUNCAO: string
  CIDADE?: string
  ESTADO?: string
}

interface ClassifiedRow {
  CPF: string
  DATA_DIA: string
  SCORE_TURNOVER: number
  ULTIMA_FUNCAO: string
  RISCO: (typeof RISCOS)[number]
  DATAREF: Date
}

interface DailyRow {
  date: string
  cargo: (typeof CARGOS)[number]
  scoreMedio: number
  scoreMediano: number
  volumeCpfs: number
}

interface DistributionRow {
  cargo: string
  risco: (typeof RISCOS)[number]
  count: number
  pct: number
}

interface RawDistributionGeneralRow {
  risco: (typeof RISCOS)[number]
  count: number
  pct: number
}

interface RawDistributionByCargoRow {
  cargo: string
  risco: (typeof RISCOS)[number]
  count: number
  pct: number
}

interface TurnoverPayload {
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
  cutsByRole: typeof CORTES_POR_CARGO
  kpis: {
    totalCpfs: number
    scoreMedioGlobal: number
    riscoMuitoAlto: number
    riscoAltoMaisMuitoAlto: number
    riscoMedio: number
    riscoBaixo: number
    pctAltoMaisMuitoAlto: number
  }
  dailyScoreByCargo: DailyRow[]
  riskDistribution: DistributionRow[]
  rawPassages: {
    total: number
    riskDistributionGeneral: RawDistributionGeneralRow[]
    riskDistributionByCargo: RawDistributionByCargoRow[]
  }
  alertas: Array<{ cargo: string; mensagem: string }>
}

function normalizePeriod(input: string | null): Period {
  if (input === '7d' || input === '30d' || input === '90d') return input
  return '30d'
}

function daysFromPeriod(period: Period): number {
  if (period === '7d') return 7
  if (period === '90d') return 90
  return 30
}

function round(value: number, places = 2): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

function toDateIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim()
    if (!normalized) return null
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d
  }
  return null
}

function normalizeRisk(raw: unknown): string {
  const risk = String(raw ?? 'NAO_CLASSIFICADO').trim().toUpperCase()
  if (risk === 'MUITO ALTO') return 'MUITO_ALTO'
  if (risk === 'MUITO_ALTO') return 'MUITO_ALTO'
  if (risk === 'MEDIO' || risk === 'MÉDIO') return 'MEDIO'
  if (risk === 'ALTO') return 'ALTO'
  if (risk === 'BAIXO') return 'BAIXO'
  return 'NAO_CLASSIFICADO'
}

function deriveUltimaFuncao(row: InputRow): string {
  const existing = String(row.ULTIMA_FUNCAO ?? row.CARGO ?? '').trim()
  if (existing) return existing.toUpperCase()

  const v = Number(row.VENDEDOR ?? 0) === 1
  const c = Number(row.COORD_ADM ?? 0) === 1
  const e = Number(row.ESTOQUISTA ?? 0) === 1
  const g = Number(row.GERENTE ?? 0) === 1

  if (v) return 'CONSULTOR DE VENDAS'
  if (c) return 'COORDENADOR ADMINISTRATIVO'
  if (e) return 'ESTOQUISTA'
  if (g) return 'GERENTE'
  return 'OUTROS/DESCONHECIDO'
}

function normalizePoolRowKeys(row: InputRow): InputRow {
  const normalized: InputRow = {}
  Object.entries(row).forEach(([key, value]) => {
    const upper = key.toUpperCase()
    normalized[upper] = value
    if (upper.startsWith('TIMESTAMP_')) {
      normalized[upper.replace('TIMESTAMP_', '')] = value
    }
  })
  return normalized
}

function chooseDateColumn(rows: InputRow[]): 'DATA_INSERCAO' | 'DIA_HORA' | 'DATA_ADMISSAO' {
  if (rows.some((row) => row.DATA_INSERCAO !== undefined)) return 'DATA_INSERCAO'
  if (rows.some((row) => row.DIA_HORA !== undefined)) return 'DIA_HORA'
  return 'DATA_ADMISSAO'
}

function toPoolHost(): string {
  const runtime = (process.env.POOL_RUNTIME ?? 'Linux').trim().toLowerCase()
  const defaultHost = runtime === 'linux' ? '172.22.1.202' : 'qqmtz1598'
  const runtimeHost = process.env[`POOL_HOST_${runtime.toUpperCase()}`]
  return process.env.POOL_HOST ?? runtimeHost ?? defaultHost
}

function buildDateWindow(period: Period): { di: string; de: string } {
  const now = new Date()
  now.setDate(now.getDate() - 1)
  const de = toDateIsoDay(now)
  const days = daysFromPeriod(period)
  const start = new Date(now)
  start.setDate(now.getDate() - (days - 1))
  const di = toDateIsoDay(start)
  return { di, de }
}

function buildSql(period: Period): string {
  const { di, de } = buildDateWindow(period)
  return `
    SELECT *
    FROM DB_RISCO.dbo.db_risco_dados_contratacao_rh
    WHERE data_insercao >= '${di}'
      AND data_insercao <= '${de}'
  `
}

function mockPoolRows(period: Period): InputRow[] {
  const days = daysFromPeriod(period)
  const out: InputRow[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const date = toDateIsoDay(d)

    CARGOS.forEach((cargo, cargoIndex) => {
      const corteMedio = CORTES_POR_CARGO[cargo].MEDIO
      const base = corteMedio * (0.88 + (cargoIndex % 3) * 0.03)
      const swing = Math.sin((i + cargoIndex * 2) / 4) * 3.1

      for (let j = 0; j < 6; j += 1) {
        const cpfNumber = 10000000000 + cargoIndex * 100000 + i * 10 + j
        const score = round(base + swing + j * 0.7, 4)
        out.push({
          CPF: String(cpfNumber),
          DATA_INSERCAO: `${date}T0${(j % 9) + 1}:10:00.000Z`,
          SCORE_TURNOVER: score,
          ULTIMA_FUNCAO: cargo,
          RISCO: score >= CORTES_POR_CARGO[cargo].MUITO_ALTO
            ? 'MUITO ALTO'
            : score >= CORTES_POR_CARGO[cargo].ALTO
              ? 'ALTO'
              : score >= CORTES_POR_CARGO[cargo].MEDIO
                ? 'MEDIO'
                : 'BAIXO',
          CIDADE: 'CIDADE_TESTE',
          ESTADO: 'SP',
        })
      }
    })
  }

  return out
}

function rowsFromPoolBody(body: unknown): InputRow[] {
  if (Array.isArray(body)) {
    return body.filter((row): row is InputRow => typeof row === 'object' && row !== null)
  }

  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body)
      // Pool can return stringified JSON; handle double-parsing
      if (typeof parsed === 'string') {
        const reparsed = JSON.parse(parsed)
        if (Array.isArray(reparsed)) {
          return reparsed.filter((row): row is InputRow => typeof row === 'object' && row !== null)
        }
      }
      if (Array.isArray(parsed)) {
        return parsed.filter((row): row is InputRow => typeof row === 'object' && row !== null)
      }

      if (parsed && typeof parsed === 'object') {
        const values = Object.values(parsed as Record<string, InputRow>)
        if (values.length > 0) return values
      }
    } catch {
      return []
    }
  }

  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>
    if (Array.isArray(obj.data)) {
      return obj.data.filter((row): row is InputRow => typeof row === 'object' && row !== null)
    }
  }

  return []
}

async function fetchPoolRows(period: Period): Promise<InputRow[]> {
  const host = toPoolHost()
  const port = process.env.POOL_PORT ?? '8080'
  const database = 'FABRIC_THIAGO'
  const sql = buildSql(period)

  const response = await fetch(`http://${host}:${port}/read_sql/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      database,
      sql,
      timeout: 300,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Pool read_sql falhou (${response.status}): ${detail.slice(0, 300)}`)
  }

  const body = await response.json()
  return rowsFromPoolBody(body)
}

function extractRows(rawRows: InputRow[], deduplicateByCpfAndDay = true): ExtractedRow[] {
  if (rawRows.length === 0) return []

  const normalizedRows = rawRows.map((row) => normalizePoolRowKeys(row))
  const dateCol = chooseDateColumn(normalizedRows)
  const validRows: ExtractedRow[] = []

  normalizedRows.forEach((row) => {
    const date = parseDate(row[dateCol])
    const scoreFallback = parseNumber(row.SCORE)
    const score = parseNumber(row.SCORE_TURNOVER) ?? scoreFallback
    if (!date || score === null) return

    const cpfRaw = String(row.CPF ?? '').replace(/\D/g, '')
    const cpf = cpfRaw.padStart(11, '0').slice(-11)
    if (!cpf) return

    validRows.push({
      CPF: cpf,
      DATAREF: date,
      DATA_DIA: toDateIsoDay(date),
      SCORE_TURNOVER: score,
      RISCO: normalizeRisk(row.RISCO),
      ULTIMA_FUNCAO: deriveUltimaFuncao(row),
      CIDADE: row.CIDADE ? String(row.CIDADE) : undefined,
      ESTADO: row.ESTADO ? String(row.ESTADO) : undefined,
    })
  })

  validRows.sort((a, b) => a.DATAREF.getTime() - b.DATAREF.getTime())

  if (!deduplicateByCpfAndDay) return validRows

  const dedup = new Map<string, ExtractedRow>()
  validRows.forEach((row) => {
    const city = row.CIDADE ?? ''
    const state = row.ESTADO ?? ''
    const key = `${row.CPF}__${row.DATA_DIA}__${city}__${state}`
    dedup.set(key, row)
  })

  return Array.from(dedup.values())
}

function toRiskWeight(risk: string): number {
  if (risk === 'BAIXO') return 1
  if (risk === 'MEDIO') return 2
  if (risk === 'ALTO') return 3
  if (risk === 'MUITO_ALTO') return 4
  return 5
}

function fromRiskWeight(weight: number): (typeof RISCOS)[number] {
  if (weight <= 1) return 'BAIXO'
  if (weight === 2) return 'MEDIO'
  if (weight === 3) return 'ALTO'
  return 'MUITO_ALTO'
}

function processAndClassify(extractedRows: ExtractedRow[]): ClassifiedRow[] {
  const grouped = new Map<string, ClassifiedRow>()

  extractedRows.forEach((row) => {
    const key = `${row.CPF}__${row.DATA_DIA}`
    const current = grouped.get(key)
    const riskWeight = toRiskWeight(row.RISCO)

    if (!current) {
      grouped.set(key, {
        CPF: row.CPF,
        DATA_DIA: row.DATA_DIA,
        SCORE_TURNOVER: row.SCORE_TURNOVER,
        ULTIMA_FUNCAO: row.ULTIMA_FUNCAO,
        RISCO: fromRiskWeight(riskWeight),
        DATAREF: row.DATAREF,
      })
      return
    }

    current.SCORE_TURNOVER = Math.min(current.SCORE_TURNOVER, row.SCORE_TURNOVER)
    current.ULTIMA_FUNCAO = row.DATAREF >= current.DATAREF ? row.ULTIMA_FUNCAO : current.ULTIMA_FUNCAO
    current.DATAREF = row.DATAREF > current.DATAREF ? row.DATAREF : current.DATAREF
    current.RISCO = fromRiskWeight(Math.min(toRiskWeight(current.RISCO), riskWeight))
  })

  return Array.from(grouped.values()).sort((a, b) => a.DATAREF.getTime() - b.DATAREF.getTime())
}

function buildDailyRows(classifiedRows: ClassifiedRow[]): DailyRow[] {
  const map = new Map<string, { scores: number[]; cpfs: Set<string> }>()

  classifiedRows.forEach((row) => {
    const key = `${row.DATA_DIA}__${row.ULTIMA_FUNCAO}`
    const entry = map.get(key) ?? { scores: [], cpfs: new Set<string>() }
    entry.scores.push(row.SCORE_TURNOVER)
    entry.cpfs.add(row.CPF)
    map.set(key, entry)
  })

  const out: DailyRow[] = []

  map.forEach((entry, key) => {
    const [date, cargo] = key.split('__')
    const ordered = [...entry.scores].sort((a, b) => a - b)
    const middle = Math.floor(ordered.length / 2)
    const median =
      ordered.length % 2 === 0
        ? (ordered[middle - 1] + ordered[middle]) / 2
        : ordered[middle]

    out.push({
      date,
      cargo: cargo as (typeof CARGOS)[number],
      scoreMedio: round(ordered.reduce((acc, v) => acc + v, 0) / Math.max(ordered.length, 1), 2),
      scoreMediano: round(median, 2),
      volumeCpfs: entry.cpfs.size,
    })
  })

  out.sort((a, b) => a.date.localeCompare(b.date) || a.cargo.localeCompare(b.cargo))
  return out
}

function buildDistributionFromClassified(rows: ClassifiedRow[]): DistributionRow[] {
  const byCargoRisk = new Map<string, number>()
  const byCargoTotal = new Map<string, number>()

  rows.forEach((row) => {
    const key = `${row.ULTIMA_FUNCAO}__${row.RISCO}`
    byCargoRisk.set(key, (byCargoRisk.get(key) ?? 0) + 1)
    byCargoTotal.set(row.ULTIMA_FUNCAO, (byCargoTotal.get(row.ULTIMA_FUNCAO) ?? 0) + 1)
  })

  const out: DistributionRow[] = []

  const cargos = Array.from(byCargoTotal.keys()).sort((a, b) => a.localeCompare(b))

  cargos.forEach((cargo) => {
    RISCOS.forEach((risco) => {
      const key = `${cargo}__${risco}`
      const count = byCargoRisk.get(key) ?? 0
      const totalCargo = byCargoTotal.get(cargo) ?? 1
      out.push({
        cargo,
        risco,
        count,
        pct: round((count / totalCargo) * 100, 1),
      })
    })
  })

  return out
}

function buildRawDistributions(rows: ExtractedRow[]): {
  riskDistributionGeneral: RawDistributionGeneralRow[]
  riskDistributionByCargo: RawDistributionByCargoRow[]
} {
  const byRisk = new Map<(typeof RISCOS)[number], number>()
  const byCargoRisk = new Map<string, number>()
  const byCargoTotal = new Map<string, number>()

  rows.forEach((row) => {
    const risk = fromRiskWeight(toRiskWeight(row.RISCO))
    byRisk.set(risk, (byRisk.get(risk) ?? 0) + 1)

    const key = `${row.ULTIMA_FUNCAO}__${risk}`
    byCargoRisk.set(key, (byCargoRisk.get(key) ?? 0) + 1)
    byCargoTotal.set(row.ULTIMA_FUNCAO, (byCargoTotal.get(row.ULTIMA_FUNCAO) ?? 0) + 1)
  })

  const totalRows = Math.max(rows.length, 1)
  const riskDistributionGeneral = RISCOS.map((risco) => {
    const count = byRisk.get(risco) ?? 0
    return {
      risco,
      count,
      pct: round((count / totalRows) * 100, 1),
    }
  })

  const cargos = Array.from(byCargoTotal.keys()).sort((a, b) => a.localeCompare(b))
  const riskDistributionByCargo: RawDistributionByCargoRow[] = []
  cargos.forEach((cargo) => {
    const totalCargo = byCargoTotal.get(cargo) ?? 1
    RISCOS.forEach((risco) => {
      const key = `${cargo}__${risco}`
      const count = byCargoRisk.get(key) ?? 0
      riskDistributionByCargo.push({
        cargo,
        risco,
        count,
        pct: round((count / totalCargo) * 100, 1),
      })
    })
  })

  return {
    riskDistributionGeneral,
    riskDistributionByCargo,
  }
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((acc, v) => acc + v, 0) / values.length
}

function std(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

function assemblePayload(period: Period, rawRows: InputRow[], mode: 'pool' | 'mock-fallback', warning?: string): TurnoverPayload {
  const extractedRows = extractRows(rawRows)
  const extractedRowsWithoutDedup = extractRows(rawRows, false)
  const classifiedRows = processAndClassify(extractedRows)
  const dailyRows = buildDailyRows(classifiedRows)
  const distribution = buildDistributionFromClassified(classifiedRows)
  const rawDistributions = buildRawDistributions(extractedRowsWithoutDedup)

  const scoreValues = classifiedRows.map((r) => r.SCORE_TURNOVER)
  const mediaGeral = mean(scoreValues)
  const desvioGeral = std(scoreValues)
  const ucl = mediaGeral + 3 * desvioGeral

  const totalCpfs = new Set(classifiedRows.map((r) => r.CPF)).size
  const scoreMedioGlobal = round(mediaGeral, 2)

  const altoMuitoAlto = classifiedRows.filter((r) => r.RISCO === 'ALTO' || r.RISCO === 'MUITO_ALTO').length
  const medio = classifiedRows.filter((r) => r.RISCO === 'MEDIO').length
  const baixo = classifiedRows.filter((r) => r.RISCO === 'BAIXO').length
  const muitoAlto = classifiedRows.filter((r) => r.RISCO === 'MUITO_ALTO').length

  const lastDate = dailyRows[dailyRows.length - 1]?.date
  const alertas = dailyRows
    .filter((r) => r.date === lastDate)
    .filter((r) => r.scoreMedio > ucl && r.volumeCpfs >= 3)
    .map((r) => ({
      cargo: r.cargo,
      mensagem: `Score medio ${r.scoreMedio.toFixed(3)} acima do UCL ${ucl.toFixed(3)} com volume ${r.volumeCpfs}.`,
    }))

  return {
    period,
    generatedAt: new Date().toISOString(),
    source: {
      mode,
      database: 'FABRIC_THIAGO',
      table: 'DB_RISCO.dbo.db_risco_dados_contratacao_rh',
      rawRows: rawRows.length,
      extractedRows: extractedRows.length,
      classifiedRows: classifiedRows.length,
      warning,
    },
    cutsByRole: CORTES_POR_CARGO,
    kpis: {
      totalCpfs,
      scoreMedioGlobal,
      riscoMuitoAlto: muitoAlto,
      riscoAltoMaisMuitoAlto: altoMuitoAlto,
      riscoMedio: medio,
      riscoBaixo: baixo,
      pctAltoMaisMuitoAlto: round((altoMuitoAlto / Math.max(classifiedRows.length, 1)) * 100, 1),
    },
    dailyScoreByCargo: dailyRows,
    riskDistribution: distribution,
    rawPassages: {
      total: extractedRowsWithoutDedup.length,
      riskDistributionGeneral: rawDistributions.riskDistributionGeneral,
      riskDistributionByCargo: rawDistributions.riskDistributionByCargo,
    },
    alertas,
  }
}

export async function GET(request: NextRequest) {
  try {
    const period = normalizePeriod(request.nextUrl.searchParams.get('period'))
    const rawRows = await fetchPoolRows(period)
    return NextResponse.json(assemblePayload(period, rawRows, 'pool'))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido na API de turnover.'
    const allowFallback = (process.env.TURNOVER_ALLOW_MOCK_FALLBACK ?? 'true').toLowerCase() === 'true'
    if (allowFallback) {
      const period = normalizePeriod(request.nextUrl.searchParams.get('period'))
      const rawRows = mockPoolRows(period)
      return NextResponse.json(assemblePayload(period, rawRows, 'mock-fallback', message))
    }

    return NextResponse.json({ error: message, hint: 'Verifique conectividade com POOL_HOST/POOL_PORT e acesso de rede ao pool interno.' }, { status: 502 })
  }
}