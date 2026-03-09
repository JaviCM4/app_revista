import apiClient from '@/services/http'
import type { EditionCreateRequest } from '@/types/edition/EditionCreateRequest'
import type { EditionFindResponse } from '@/types/edition/EditionFindResponse'

const EDITIONS_URL = '/editions'

export const editionService = {
  // POST
  async createEdition(data: EditionCreateRequest): Promise<void> {
    await apiClient.post(`${EDITIONS_URL}`, data)
  },

  // GET
  async findAllEditionsByMagazine(idMagazine: number): Promise<EditionFindResponse> {
    const response = await apiClient.get<EditionFindResponse>(`${EDITIONS_URL}/${idMagazine}`)
    return response.data
  },

  // DELETE
  async deleteEdition(idEdition: number): Promise<void> {
    await apiClient.delete(`${EDITIONS_URL}/${idEdition}`)
  },
}
