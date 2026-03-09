import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Agrega token de autenticación a cada solicitud
apiClient.interceptors.request.use((config) => {
  const authStore = useAuthStore()
  const token = authStore.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Manejo global de errores
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      return Promise.reject(
        error.response?.data?.message || error.response?.data || 'Error en la solicitud',
      )
    }
    return Promise.reject('Error de conexión con el servidor')
  },
)

export default apiClient
