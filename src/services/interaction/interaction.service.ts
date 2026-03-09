import apiClient from '@/services/http'
import type { CommentsResponse } from '@/types/interaction/CommentsResponse'
import type { InteractionCommentRequest } from '@/types/interaction/InteractionCommentRequest'
import type { InteractionLikeRequest } from '@/types/interaction/InteractionLikeRequest'

const INTERACTION_URL = '/interaction'

export const interactionService = {
  // POST
  async createLike(data: InteractionLikeRequest): Promise<void> {
    await apiClient.post(`${INTERACTION_URL}/like`, data)
  },

  async createComment(data: InteractionCommentRequest): Promise<void> {
    await apiClient.post(`${INTERACTION_URL}/comment`, data)
  },

  // GET
  async findLikeByUser(idMagazine: number): Promise<boolean> {
    const response = await apiClient.get<boolean>(`${INTERACTION_URL}/like/${idMagazine}`)
    return response.data
  },

  async findAllCommentsByMagazine(idMagazine: number): Promise<CommentsResponse[]> {
    const response = await apiClient.get<CommentsResponse[]>(
      `${INTERACTION_URL}/comment/${idMagazine}`,
    )
    return response.data
  },

  // DELETE
  async deleteComment(idComment: number): Promise<void> {
    await apiClient.delete(`${INTERACTION_URL}/comment/${idComment}`)
  }, // Falta Integrar
}
