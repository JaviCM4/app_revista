import apiClient from '@/services/http'
import type { CreateTagRequest } from '@/types/magazine/tag/CreateRequest'
import type { TagResponse } from '@/types/magazine/tag/TagResponse'

const TAGS_URL = '/tags'

export const tagService = {
  // POST
  async createMagazineTag(data: CreateTagRequest): Promise<void> {
    await apiClient.post(`${TAGS_URL}`, data)
  },

  // GET
  async findByMagazineId(idMagazine: number): Promise<TagResponse[]> {
    const response = await apiClient.get(`${TAGS_URL}/${idMagazine}`)
    return response.data
  },

  // DELETE
  async deleteTag(idTag: number): Promise<void> {
    await apiClient.delete(`${TAGS_URL}/${idTag}`)
  },
}
