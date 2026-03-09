import apiClient from '@/services/http'
import type { CategoryMagazine } from '@/types/tipos/CategoryMagazine'

const MAGAZINE_CATEGORIES_URL = '/type/cat/magazine'

export const categoryMagazineService = {
  // GET
  async findAllTypeCategoryMagazine(): Promise<CategoryMagazine[]> {
    const response = await apiClient.get(`${MAGAZINE_CATEGORIES_URL}`)
    return response.data
  },
}
