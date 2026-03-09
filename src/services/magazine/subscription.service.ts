import apiClient from '@/services/http'
import type { SubscriptionRequest } from '@/types/magazine/subscription/SubscriptionRequest'

const SUBSCRIPTIONS_URL = '/subscriptions'

export const subscriptionService = {
  // POST
  async createSubscription(data: SubscriptionRequest): Promise<void> {
    await apiClient.post(`${SUBSCRIPTIONS_URL}`, data)
  },

  // DELETE
  async deleteSubscription(idMagazine: number): Promise<void> {
    await apiClient.delete(`${SUBSCRIPTIONS_URL}/${idMagazine}`)
  },
}
