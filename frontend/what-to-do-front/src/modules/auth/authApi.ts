// src/modules/auth/authApi.ts

import { httpClient } from '../../api/httpClient'; // Seu cliente Axios
import type { LoginResponse } from './types/auth'; 




/**
 * Envia credenciais para o backend e retorna o token JWT.
 */
export async function loginApi(username: string, password: string): Promise<LoginResponse> {
  const response = await httpClient.post<LoginResponse>('/api/auth/login', {
    username,
    password,
  });
  // O status de sucesso é 201 Created (HTTPStatus.CREATED no NestJS)
  return response.data;
}