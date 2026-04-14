/**
 * React Query hooks for fetching dashboard data
 */

import { useQuery } from '@tanstack/react-query'
import { DashboardMetrics } from './types'

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  metrics: () => [...dashboardQueryKeys.all, 'metrics'] as const,
  metricsByPeriod: (period: string) =>
    [...dashboardQueryKeys.metrics(), period] as const,
}

/**
 * Hook to fetch dashboard metrics
 * 
 * @param period - Time period ('7d', '30d', '90d')
 * @returns Query result with metrics data
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useDashboardMetrics('7d')
 * ```
 */
export function useDashboardMetrics(period: string = '7d') {
  return useQuery({
    queryKey: dashboardQueryKeys.metricsByPeriod(period),
    queryFn: async () => {
      const res = await fetch(
        `/api/dashboard/metrics?period=${period}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!res.ok) {
        throw new Error(`Failed to fetch metrics: ${res.statusText}`)
      }

      const data = await res.json()
      return data as DashboardMetrics
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    retry: 2,
  })
}
