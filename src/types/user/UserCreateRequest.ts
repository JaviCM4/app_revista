export interface UserCreateRequest {
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
  password: string
}
