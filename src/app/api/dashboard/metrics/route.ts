import { NextRequest, NextResponse } from 'next/server'

type Period = '7d' | '30d' | '90d'

function multiplierFromPeriod(period: Period): number {
  if (period === '30d') return 1.35
  if (period === '90d') return 1.9
  return 1
}

export async function GET(request: NextRequest) {
  const periodParam = request.nextUrl.searchParams.get('period')
  const period: Period =
    periodParam === '30d' || periodParam === '90d' ? periodParam : '7d'

  const k = multiplierFromPeriod(period)
  const totalRequests = Math.round(1450 * k)
  const approvalRate = Number((82.4 - (k - 1) * 1.8).toFixed(1))
  const rejectionRate = Number((100 - approvalRate).toFixed(1))
  const averageScore = Number((42.7 + (k - 1) * 2.6).toFixed(2))

  return NextResponse.json({
    totalRequests,
    approvalRate,
    rejectionRate,
    averageScore,
    timestamp: new Date().toISOString(),
  })
}