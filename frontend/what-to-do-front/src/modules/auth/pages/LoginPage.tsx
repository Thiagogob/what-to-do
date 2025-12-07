// src/modules/auth/pages/LoginPage.tsx

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext'; // Hook do AuthContext
import { loginApi } from '../authApi'; // ⬅️ Vamos criar esta função na próxima etapa

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth(); // Obtém a função login do contexto

  // Captura o caminho de onde o usuário veio (ex: /routes/20)
  const from = location.state?.from?.pathname || '/'; 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 2. Chama a função API para autenticar e obter o token
      const response = await loginApi(username, password);
      const token = response.access_token; // Seu backend retorna 'access_token' (snake_case)
      
      // 3. Atualiza o Contexto Global e armazena o token
      login(token); 
      
      // 4. Redireciona o usuário para a página original que ele tentou acessar
      navigate(from, { replace: true });

    } catch (err) {
      // Trata erros de requisição (ex: 401 Unauthorized)
      const errorMsg = (err as any).response?.data?.message || 'Falha na autenticação. Verifique suas credenciais.';
      setError(errorMsg);

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-gray-900">
          Faça Login
        </h2>
        
        {error && (
          <p className="p-3 text-sm text-center text-red-700 bg-red-100 border border-red-300 rounded">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nome de Usuário
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            className={`w-full py-2 px-4 font-semibold rounded-lg transition duration-300 ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            disabled={isLoading}
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};