import apiClient from '@/services/http'
import type { CategoryResponse } from '@/types/magazine/category/CategoryResponse'
import type { CreateRequest } from '@/types/magazine/category/CreateRequest'

const MAGAZINE_CATEGORIES_URL = '/categories/magazines'

export const categoryService = {
  // POST
  async createMagazineCategory(data: CreateRequest): Promise<void> {
    await apiClient.post(`${MAGAZINE_CATEGORIES_URL}`, data)
  },

  // GET
  async findByMagazineId(idMagazine: number): Promise<CategoryResponse[]> {
    const response = await apiClient.get(`${MAGAZINE_CATEGORIES_URL}/${idMagazine}`)
    return response.data
  },

  // DELETE
  async deleteMagazineCategory(idMagazineCategory: number): Promise<void> {
    await apiClient.delete(`${MAGAZINE_CATEGORIES_URL}/${idMagazineCategory}`)
  },
}
