// src/api/httpClient.ts

import axios from 'axios';

// 1. Configuração da URL Base do Backend
// Para desenvolvimento, usaremos a porta onde seu NestJS está exposto localmente.
// Nota: Se estiver rodando o frontend fora do Docker e o backend no Docker, 
// a URL pode ser http://localhost:3005 (ou a porta que você mapeou)
const API_URL = 'http://localhost:3005'; 

// 2. Criar a instância do Axios
export const httpClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 3. Adicionar um Interceptor de Requisição para JWT
// Este interceptor será executado antes de cada requisição.
httpClient.interceptors.request.use(
  (config) => {
    // ⚠️ CRÍTICO: Obter o token JWT
    // Em um aplicativo real, o token deve ser armazenado de forma segura (ex: Local Storage ou Cookies).
    // Assumimos que o token está em localStorage, usando a chave 'accessToken'.
    const token = localStorage.getItem('accessToken'); 

    // Se o token existir e a requisição não for para login/registro (que não precisam de token):
    if (token) {
      // Anexa o token no cabeçalho Authorization no formato Bearer
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 4. (Opcional) Interceptor de Resposta para Refresh Token ou Desconexão
// Você pode adicionar lógica aqui para:
// - Detectar erro 401 (Não Autorizado) e redirecionar o usuário para a tela de login.
// - Tentar um refresh token se a API suportar.

// httpClient.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       // Ex: Limpar o localStorage e redirecionar para /login
//       console.log('Sessão expirada. Redirecionando para login.');
//     }
//     return Promise.reject(error);
//   }
// );