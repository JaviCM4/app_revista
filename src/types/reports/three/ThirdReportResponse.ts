import type { LikeReport } from '@/types/reports/three/LikeReport'

export interface ThirdReportResponse {
  idMagazine: number
  nameMagazine: string
  likes: LikeReport[]
}
