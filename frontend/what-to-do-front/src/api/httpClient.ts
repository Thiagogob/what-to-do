// src/api/httpClient.ts (CORRIGIDO)

import axios from 'axios';
import { clearAuthStorage } from '../modules/auth/AuthContext'; 

// URL e Instância de Cliente (sem alterações)
//export const API_URL = 'http://localhost:3005'; 
const API_URL = import.meta.env.VITE_API_URL;
export const httpClient = axios.create({
  baseURL: '/api',
  headers: {
    
  },
});




// -----------------------------------------------------
// 1. INTERCEPTOR DE REQUISIÇÃO (ADICIONA O TOKEN JWT) 
// -----------------------------------------------------
httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken'); 
    
    // Anexa o token para requisições autenticadas (exceto Login/Register)
    if (token) { 
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// -----------------------------------------------------
// 2. INTERCEPTOR DE RESPOSTA (TRATAMENTO DO ERRO 401)
// -----------------------------------------------------
httpClient.interceptors.response.use(
  (response) => response, 
  (error) => {
    const originalRequest = error.config;
    
    // Verifica se é um erro 401 E não é a própria tentativa de login que falhou
    if (error.response && error.response.status === 401 && originalRequest.url !== '/auth/login') {
      
      console.warn('Sessão expirada (401). Limpando token e redirecionando.');
      
      clearAuthStorage();
      window.location.href = '/login'; 
      
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

