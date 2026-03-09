import apiClient from '@/services/http'
import type { AdBlockCreateRequest } from '@/types/advertisement/AdBlockCreateRequest'
import type { AdCreateRequest } from '@/types/advertisement/AdCreateRequest'
import type { AdFindResponse } from '@/types/advertisement/AdFindResponse'

const ADS_URL = '/ads'

export const advertisementService = {
  // POST
  async createAd(data: AdCreateRequest): Promise<void> {
    await apiClient.post(`${ADS_URL}`, data)
  },

  async blockAd(data: AdBlockCreateRequest): Promise<void> {
    await apiClient.post(`${ADS_URL}/block`, data)
  },

  // PUT
  async disableAd(idAdvertisement: number): Promise<void> {
    await apiClient.put(`${ADS_URL}/${idAdvertisement}`)
  },

  // GET
  async findAllByMagazine(idMagazine: number): Promise<AdFindResponse[]> {
    const response = await apiClient.get<AdFindResponse[]>(`${ADS_URL}/magazine/${idMagazine}`)
    return response.data
  },

  async findAllByAdvertiser(): Promise<AdFindResponse[]> {
    const response = await apiClient.get<AdFindResponse[]>(`${ADS_URL}/advertiser`)
    return response.data
  },

  async findAllAdvertisement(): Promise<AdFindResponse[]> {
    const response = await apiClient.get<AdFindResponse[]>(`${ADS_URL}/magazine`)
    return response.data
  },

  async getBlockCostByMagazine(idMagazine: number): Promise<number> {
    const response = await apiClient.get<number>(`${ADS_URL}/block/${idMagazine}`)
    return response.data
  },
}
