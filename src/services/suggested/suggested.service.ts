import apiClient from '@/services/http'
import type { SuggestedCostCreateRequest } from '@/types/suggested/SuggestedCostCreateRequest'
import type { SuggestedCostResponse } from '@/types/suggested/SuggestedCostResponse'

const SUGGESTED_COST_URL = '/suggested-costs'

export const suggestedCostService = {
  // POST
  async create(data: SuggestedCostCreateRequest): Promise<void> {
    await apiClient.post(`${SUGGESTED_COST_URL}`, data)
  }, // Falta Integrar

  // GET
  async findAll(): Promise<SuggestedCostResponse[]> {
    const response = await apiClient.get<SuggestedCostResponse[]>(SUGGESTED_COST_URL)
    return response.data
  },

  // DELETE
  async delete(id: number): Promise<void> {
    await apiClient.delete(`${SUGGESTED_COST_URL}/${id}`)
  }, // Falta Integrar
}
