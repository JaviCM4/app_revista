import type { CommentReport } from '@/types/reports/one_nine/CommentReport'

export interface FirstReportResponse {
  idMagazine: number
  nameMagazine: string
  comments: CommentReport[]
}
