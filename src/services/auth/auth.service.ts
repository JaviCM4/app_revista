import apiClient from '@/services/http'
import type { CredentialRequest } from '@/types/auth/CredentialRequest'
import type { CredentialResponse } from '@/types/auth/CredentialResponse'
import type { EmailRequest } from '@/types/auth/EmailRequest'
import type { FirstRequest } from '@/types/auth/FirstRequest'
import type { RecoverPasswordRequest } from '@/types/auth/RecoverPasswordRequest'
import type { TokenLoginRequest } from '@/types/auth/TokenLoginRequest'

const AUTH_URL = '/auth'

export const authService = {
  // POST
  async login(data: CredentialRequest): Promise<CredentialResponse> {
    const response = await apiClient.post<CredentialResponse>(`${AUTH_URL}`, data)
    return response.data
  },

  async firstLogin(data: FirstRequest): Promise<void> {
    await apiClient.post(`${AUTH_URL}/first-login`, data)
  },

  async verifyLoginToken(data: TokenLoginRequest): Promise<CredentialResponse> {
    const response = await apiClient.post<CredentialResponse>(`${AUTH_URL}/verify-login`, data)
    return response.data
  },

  async recoverPassword(data: EmailRequest): Promise<void> {
    await apiClient.post(`${AUTH_URL}/recover-password`, data)
  },

  async verifyPasswordRecoveryToken(data: RecoverPasswordRequest): Promise<void> {
    await apiClient.post(`${AUTH_URL}/verify-recover`, data)
  },

  // UPDATE
  async toggleVerification(): Promise<void> {
    await apiClient.put(`${AUTH_URL}`)
  },

  async sendLoginToken(idUser: number): Promise<void> {
    await apiClient.put(`${AUTH_URL}/${idUser}`)
  },
}
