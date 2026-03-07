export interface UserUpdateRequest {
    names: string;
    lastNames: string;
    dateOfBirth?: string | null;
    photography?: string | null;
    description?: string | null;
}
