// src/modules/auth/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import {type AuthState, type AuthUser } from './types/auth';

interface AuthContextType extends AuthState {
    login: (token: string) => void;
    logout: () => void;
    // Função para verificar o token e carregar o usuário, se necessário
    loadUser: (token: string) => void; 
}

// Valores iniciais e tipo
const initialAuthContext: AuthContextType = {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true, // Começa como true para verificar o token inicial
    login: () => {},
    logout: () => {},
    loadUser: () => {},
};

const AuthContext = createContext<AuthContextType>(initialAuthContext);

export const useAuth = () => useContext(AuthContext);

export const clearAuthStorage = () => {
    localStorage.removeItem('accessToken');
};

// src/modules/auth/AuthContext.tsx (Foco na implementação da função login)

// ... (imports e interfaces) ...

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>(initialAuthContext);

    // Função para decodificar o token e obter os dados do usuário
    // (Pode ser simples, mas em produção deve validar com o backend)
    const decodeToken = (token: string): AuthUser => {
        // ⚠️ Simplificado: Em produção, você usaria uma biblioteca como 'jwt-decode'
        const payloadBase64 = token.split('.')[1];
        const payloadJson = atob(payloadBase64);
        const payload = JSON.parse(payloadJson);
        return {
            username: payload.username,
            sub: payload.sub,
            iat: payload.iat,
            exp: payload.exp,
        } as AuthUser;
    };

    const login = (token: string) => {
        try {
            const user = decodeToken(token);
            // Armazena no Local Storage para persistência
            localStorage.setItem('accessToken', token); 
            
            setState(s => ({
                ...s,
                user: user,
                accessToken: token,
                isAuthenticated: true,
                isLoading: false,
            }));
        } catch (e) {
            console.error('Erro ao decodificar token:', e);
            // Se falhar, faz logout
            logout();
        }
    };
    
const logout = () => {
    // ⬅️ Use a função global que o Interceptor também usa
    clearAuthStorage(); 
    setState(s => ({
        ...s,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
    }));
    // Opcional: Redirecionar para a home
};

    // Atualize o useEffect para usar decodeToken ao carregar
    useEffect(() => {
        const storedToken = localStorage.getItem('accessToken');
        if (storedToken) {
            try {
                 const user = decodeToken(storedToken);
                 setState(s => ({
                    ...s, 
                    user: user,
                    accessToken: storedToken, 
                    isAuthenticated: true,
                    isLoading: false 
                }));
            } catch (e) {
                // Se o token for inválido/expirado, remove e define como não logado
                logout(); 
            }
        } else {
             setState(s => ({ ...s, isLoading: false }));
        }
    }, []);

    const contextValue: AuthContextType = {
        ...state,
        login,
        logout,
        loadUser: function (token: string): void {
            throw new Error('Function not implemented.');
        }
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};