// src/modules/auth/types/auth.ts

export interface AuthUser {
  username: string;
  sub: number; // ID do Usuário
  iat: number;
  exp: number;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}