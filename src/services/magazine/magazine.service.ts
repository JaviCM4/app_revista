import apiClient from '@/services/http'
import type { AdminAndEditorResponse } from '@/types/magazine/AdminAndEditorResponse'
import type { NormaResponse } from '@/types/magazine/NormaResponse'
import type { MagazineCreateRequest } from '@/types/magazine/MagazineCreateRequest'
import type { UpdateCostRequest } from '@/types/magazine/UpdateCostRequest'
import type { UpdatePermissionsRequest } from '@/types/magazine/UpdatePermissionsRequest'

const MAGAZINES_URL = '/magazines'

export const magazineService = {
  // POST
  async createMagazine(data: MagazineCreateRequest): Promise<void> {
    await apiClient.post(`${MAGAZINES_URL}`, data)
  },

  // UPDATE
  async updateCostMagazine(data: UpdateCostRequest): Promise<void> {
    await apiClient.put(`${MAGAZINES_URL}/cost`, data)
  },

  async updatePermissionsMagazine(data: UpdatePermissionsRequest): Promise<void> {
    await apiClient.put(`${MAGAZINES_URL}/permissions`, data)
  },

  // GET - Públicos
  async findAllMagazines(): Promise<NormaResponse[]> {
    const response = await apiClient.get(`${MAGAZINES_URL}`)
    return response.data
  },

  async findAllByCategory(idCategory: number): Promise<NormaResponse[]> {
    const response = await apiClient.get(`${MAGAZINES_URL}/category/${idCategory}`)
    return response.data
  },

  async findAllByTag(tag: string): Promise<NormaResponse[]> {
    const response = await apiClient.get(`${MAGAZINES_URL}/tags/${tag}`)
    return response.data
  },

  // GET - Por Rol
  async findAllEditor(): Promise<AdminAndEditorResponse[]> {
    const response = await apiClient.get(`${MAGAZINES_URL}/editor`)
    return response.data
  },

  async findAllSubscriber(): Promise<NormaResponse[]> {
    const response = await apiClient.get(`${MAGAZINES_URL}/subscriber`)
    return response.data
  },

  async findAllAdmin(): Promise<AdminAndEditorResponse[]> {
    const response = await apiClient.get(`${MAGAZINES_URL}/admin`)
    return response.data
  },
}
