import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { CredentialResponse } from '@/types/auth/CredentialResponse'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const idRole = ref<number | null>(null)
  const username = ref<string | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => idRole.value === 1)
  const isEditor = computed(() => idRole.value === 2)

  function setSession(response: CredentialResponse) {
    token.value = response.token
    idRole.value = response.idRole
    username.value = response.username
  }

  function clearSession() {
    token.value = null
    idRole.value = null
    username.value = null
  }

  function getToken() {
    return token.value
  }

  return {
    token,
    idRole,
    username,
    isLoggedIn,
    isAdmin,
    isEditor,
    setSession,
    clearSession,
    getToken,
  }
})
