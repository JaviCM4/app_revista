import apiClient from '@/services/http'
import type { FifthReportResponse } from '@/types/reports/five/FifthReportResponse'
import type { FirstReportResponse } from '@/types/reports/one_nine/FirstReportResponse'
import type { FourthReportResponse } from '@/types/reports/four/FourthReportResponse'
import type { SecondReportResponse } from '@/types/reports/two_eight/SecondReportResponse'
import type { SeventhReportResponse } from '@/types/reports/seven/SeventhReportResponse'
import type { SixthReportResponse } from '@/types/reports/six/SixthReportResponse'
import type { ThirdReportResponse } from '@/types/reports/three/ThirdReportResponse'

const REPORTS_URL = '/reports'

type DateInput = Date | string | null

const formatDateParam = (date: DateInput): string | undefined => {
  if (date == null) return undefined
  if (date instanceof Date) return date.toISOString().slice(0, 10)
  return date
}

const rangeParams = (startDate: DateInput, endDate: DateInput) => ({
  params: {
    startDate: formatDateParam(startDate),
    endDate: formatDateParam(endDate),
  },
})

export const reportService = {
  // ── EDITOR ──────────────────────────────────────────────────────────────────

  async getCommentsReport(
    startDate: DateInput,
    endDate: DateInput,
  ): Promise<FirstReportResponse[]> {
    const response = await apiClient.get<FirstReportResponse[]>(
      `${REPORTS_URL}/comments`,
      rangeParams(startDate, endDate),
    )
    return response.data
  },

  async getSubscriptionsReport(
    startDate: DateInput,
    endDate: DateInput,
  ): Promise<SecondReportResponse[]> {
    const response = await apiClient.get<SecondReportResponse[]>(
      `${REPORTS_URL}/subscriptions`,
      rangeParams(startDate, endDate),
    )
    return response.data
  },

  async getLikesReport(startDate: DateInput, endDate: DateInput): Promise<ThirdReportResponse[]> {
    const response = await apiClient.get<ThirdReportResponse[]>(
      `${REPORTS_URL}/likes`,
      rangeParams(startDate, endDate),
    )
    return response.data
  },

  async getPaymentsReport(
    startDate: DateInput,
    endDate: DateInput,
  ): Promise<FourthReportResponse[]> {
    const response = await apiClient.get<FourthReportResponse[]>(
      `${REPORTS_URL}/payments`,
      rangeParams(startDate, endDate),
    )
    return response.data
  },

  // ── ADMIN ────────────────────────────────────────────────────────────────────

  async getFinancialSummaryReport(
    startDate: DateInput,
    endDate: DateInput,
  ): Promise<FifthReportResponse> {
    const response = await apiClient.get<FifthReportResponse>(
      `${REPORTS_URL}/financial-summary`,
      rangeParams(startDate, endDate),
    )
    return response.data
  },

  async getAdvertisementsReport(
    startDate: DateInput,
    endDate: DateInput,
  ): Promise<SixthReportResponse[]> {
    const response = await apiClient.get<SixthReportResponse[]>(
      `${REPORTS_URL}/advertisements`,
      rangeParams(startDate, endDate),
    )
    return response.data
  },

  async getAdvertisersReport(
    startDate: DateInput,
    endDate: DateInput,
  ): Promise<SeventhReportResponse[]> {
    const response = await apiClient.get<SeventhReportResponse[]>(
      `${REPORTS_URL}/advertisers`,
      rangeParams(startDate, endDate),
    )
    return response.data
  },

  async getSubscriptionsAdminReport(
    startDate: DateInput,
    endDate: DateInput,
  ): Promise<SecondReportResponse[]> {
    const response = await apiClient.get<SecondReportResponse[]>(
      `${REPORTS_URL}/subscriptions/admin`,
      rangeParams(startDate, endDate),
    )
    return response.data
  },

  async getCommentsAdminReport(
    startDate: DateInput,
    endDate: DateInput,
  ): Promise<FirstReportResponse[]> {
    const response = await apiClient.get<FirstReportResponse[]>(
      `${REPORTS_URL}/comments/admin`,
      rangeParams(startDate, endDate),
    )
    return response.data
  },
}
