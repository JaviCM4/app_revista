import apiClient from '@/services/http'
import type { UserCreateAdminRequest } from '@/types/user/UserCreateAdminRequest'
import type { UserCreateRequest } from '@/types/user/UserCreateRequest'
import type { UserCreateResponse } from '@/types/user/UserCreateResponse'
import type { UserFindResponse } from '@/types/user/UserFindResponse'
import type { UserUpdateRequest } from '@/types/user/UserUpdateRequest'
import type { UserUpdateResponse } from '@/types/user/UserUpdateResponse'

const USERS_URL = '/users'

export const userService = {
  // POST
  async createUserAndCredential(data: UserCreateRequest): Promise<UserCreateResponse> {
    const response = await apiClient.post<UserCreateResponse>(`${USERS_URL}`, data)
    return response.data
  },

  async createUserAndCredentialAdmin(data: UserCreateAdminRequest): Promise<UserCreateResponse> {
    const response = await apiClient.post<UserCreateResponse>(`${USERS_URL}/admin`, data)
    return response.data
  },

  // GET
  async findAllUsers(): Promise<UserFindResponse[]> {
    const response = await apiClient.get<UserFindResponse[]>(`${USERS_URL}/list`)
    return response.data
  }, //Falta Integrar

  async findMyUser(): Promise<UserFindResponse> {
    const response = await apiClient.get<UserFindResponse>(`${USERS_URL}`)
    return response.data
  },

  // UPDATE
  async updateUser(data: UserUpdateRequest): Promise<UserUpdateResponse> {
    const response = await apiClient.put<UserUpdateResponse>(`${USERS_URL}`, data)
    return response.data
  },

  async updateMoney(money: number): Promise<void> {
    await apiClient.put(`${USERS_URL}/${money}`)
  },

  // DELETE
  async suspendUser(idUser: number): Promise<void> {
    await apiClient.delete(`${USERS_URL}/${idUser}`)
  }, //Falta Integrar
}
