import { headers } from 'next/headers'
import { TurnoverDashboard, type Period, type TurnoverPayload } from '@/components/dashboard/TurnoverDashboard'

export const dynamic = 'force-dynamic'

async function getInitialTurnoverData(period: Period): Promise<TurnoverPayload> {
  const headerStore = headers()
  const host = headerStore.get('host') ?? 'localhost:3000'
  const port = host.split(':')[1] ?? process.env.PORT ?? '3000'
  const internalBaseUrl = process.env.INTERNAL_API_BASE_URL ?? `http://127.0.0.1:${port}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  const response = await fetch(`${internalBaseUrl}/api/dashboard/turnover?period=${period}`, {
    cache: 'no-store',
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout))

  if (!response.ok) {
    throw new Error(`Falha ao buscar dados iniciais do dashboard: ${response.status}`)
  }

  return response.json() as Promise<TurnoverPayload>
}

export default async function Home() {
  const initialPeriod: Period = '30d'

  try {
    const initialData = await getInitialTurnoverData(initialPeriod)
    return <TurnoverDashboard initialData={initialData} initialPeriod={initialPeriod} />
  } catch (error) {
    return (
      <main className="dashboard-shell">
        <div className="relative mx-auto max-w-3xl px-4 py-16 md:px-6">
          <section className="rounded-[1.8rem] border border-rose-200 bg-white p-8 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-600">Erro de carregamento</p>
            <h1 className="mt-3 text-3xl font-semibold text-stone-950">Não foi possível renderizar o dashboard</h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              {error instanceof Error ? error.message : 'Erro desconhecido ao montar a tela inicial.'}
            </p>
          </section>
        </div>
      </main>
    )
  }
}
