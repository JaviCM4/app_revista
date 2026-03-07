export interface UserCreateAdminRequest {
  idUserType: number
  userStatus: number
  sexType: number
  municipioId: number
  username: string
  names: string
  lastNames: string
  dateOfBirth?: string | null
  photography?: string | null
  description?: string | null
  phone: number
  email: string
}
