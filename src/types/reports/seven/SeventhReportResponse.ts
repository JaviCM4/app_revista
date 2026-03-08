import type { AdCostReport } from '@/types/reports/seven/AdCostReport'

export interface SeventhReportResponse {
  advertiserName: string
  advertisements: AdCostReport[]
}
