export interface UserFindResponse {
    id: number;
    names: string;
    lastNames: string;
    dateOfBirth?: string | null;
    photography?: string | null;
    description?: string | null;
    availableMoney: number;
    userTypeName: string;
    userStatusName: string;
    sexTypeName: string;
    municipalityName: string;
}
