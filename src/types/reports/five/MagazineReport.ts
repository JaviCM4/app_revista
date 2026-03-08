import type { PaymentReport } from '@/types/reports/common/PaymentReport'

export interface MagazineReport {
  nameMagazine: string
  payments: PaymentReport[]
}
