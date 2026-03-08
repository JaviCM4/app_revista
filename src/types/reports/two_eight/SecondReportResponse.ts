import type { ReportSubscription } from '@/types/reports/two_eight/ReportSubscription'

export interface SecondReportResponse {
  idMagazine: number
  nameMagazine: string
  subscriptions: ReportSubscription[]
}
