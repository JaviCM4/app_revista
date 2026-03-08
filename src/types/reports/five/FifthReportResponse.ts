import type { MagazineReport } from '@/types/reports/five/MagazineReport'
import type { AdReport } from '@/types/reports/five/AdReport'
import type { AdBlockReport } from '@/types/reports/common/AdBlockReport'

export interface FifthReportResponse {
  magazines: MagazineReport[]
  ads: AdReport[]
  adBlocks: AdBlockReport[]
}
