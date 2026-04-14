/**
 * Custom hook for dashboard state management
 * 
 * Manages period selection, filters, and data fetching
 */

import { useState, useCallback } from 'react'
import { useDashboardMetrics } from '@/lib/queries'

export interface UseDashboardReturn {
  period: string
  setPeriod: (period: string) => void
  metrics: ReturnType<typeof useDashboardMetrics>
}

/**
 * Hook to manage dashboard state
 * 
 * @returns Dashboard state and methods
 * 
 * @example
 * ```tsx
 * const { period, setPeriod, metrics } = useDashboard()
 * ```
 */
export function useDashboard(): UseDashboardReturn {
  const [period, setPeriod] = useState('7d')
  const metrics = useDashboardMetrics(period)

  const handleChangePeriod = useCallback((newPeriod: string) => {
    setPeriod(newPeriod)
  }, [])

  return {
    period,
    setPeriod: handleChangePeriod,
    metrics,
  }
}
