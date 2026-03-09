import apiClient from '@/services/http'
import type { PreferenceCreateRequest } from '@/types/preference/PreferenceCreateResquest'
import type { PreferenceFindResponse } from '@/types/preference/PreferenceFindResponse'

const PREFERENCE_URL = '/preferences'

export const preferenceService = {
  // POST
  async createPreference(data: PreferenceCreateRequest): Promise<void> {
    await apiClient.post(`${PREFERENCE_URL}`, data)
  },

  // GET
  async findMyPreferences(): Promise<PreferenceFindResponse[]> {
    const response = await apiClient.get<PreferenceFindResponse[]>(`${PREFERENCE_URL}`)
    return response.data
  },

  async findAllPreferenceAndCategory(): Promise<PreferenceFindResponse> {
    const response = await apiClient.get<PreferenceFindResponse>(`${PREFERENCE_URL}/options`)
    return response.data
  },

  // DELETE
  async deletePreference(idPreference: number): Promise<void> {
    await apiClient.delete(`${PREFERENCE_URL}/${idPreference}`)
  },
}
