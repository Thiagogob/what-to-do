// src/modules/auth/pages/RegisterPage.tsx

import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext'; 
import { registerApi } from '../authApi'; // ⬅️ Nova função API

export const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth(); // Assume que o registro também autentica o usuário imediatamente

  const from = location.state?.from?.pathname || '/'; 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Chama a função API para criar o usuário e obter o token
      const response = await registerApi(username, password); 
      const token = response.access_token; 
      
      // 2. Autentica e armazena o token
      login(token); 
      
      // 3. Redireciona o usuário para a página original ou home
      navigate(from, { replace: true });

    } catch (err) {
      // Trata erros de requisição (ex: usuário já existe)
      const errorMsg = (err as any).response?.data?.message || 'Falha ao criar conta. Tente novamente.';
      setError(errorMsg);

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-gray-900">
          Criar Conta
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            className={`w-full py-2 px-4 font-semibold rounded-lg transition duration-300 ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            disabled={isLoading}
          >
            {isLoading ? 'Cadastrando...' : 'Criar Conta'}
          </button>
        </form>
        
        {/* Link para a página de Login */}
        <p className="mt-4 text-center text-sm text-gray-600">
          Já tem uma conta?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Faça Login
          </Link>
        </p>
      </div>
    </div>
  );
};