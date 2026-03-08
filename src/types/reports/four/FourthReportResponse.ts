import type { PaymentReport } from '@/types/reports/common/PaymentReport'
import type { AdBlockReport } from '@/types/reports/common/AdBlockReport'

export interface FourthReportResponse {
  idMagazine: number
  nameMagazine: string
  paymentReports: PaymentReport[]
  adBlocks: AdBlockReport[]
}
