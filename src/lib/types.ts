/**
 * Shared TypeScript types and interfaces for the dashboard
 */

export interface DashboardMetrics {
  totalRequests: number
  approvalRate: number
  rejectionRate: number
  averageScore: number
  timestamp: Date
}

export interface ApiResponse<T> {
  data: T
  error: null
  timestamp: Date
}

export interface ApiError {
  data: null
  error: {
    message: string
    code: string
    statusCode: number
  }
  timestamp: Date
}
