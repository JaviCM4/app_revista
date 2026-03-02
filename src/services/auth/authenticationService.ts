import type { AuthenticationRequest } from "@/types/auth/AuthenticationRequest";
import type { AuthenticationResponse } from "@/types/auth/AuthenticationResponse";
import axios from "axios";

const apiClient = axios.create({
    baseURL: "http://localhost:8080/v1/auth",
    headers: {
        "Content-Type": "application/json"
    }
});

export async function login(credentials: AuthenticationRequest): Promise<AuthenticationResponse> {
    try {
        const response = await apiClient.post<AuthenticationResponse>("/login", credentials);
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) { 
            if (error.response) { 
                throw error.response.data;
            } 
            throw "Error de Axios sin respuesta"; 
        }
        throw "Error de conexión con el servidor";
    }
}