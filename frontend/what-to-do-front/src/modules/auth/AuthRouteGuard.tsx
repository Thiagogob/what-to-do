// src/modules/auth/AuthRouteGuard.tsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext'; // Hook que criamos

export const AuthRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation(); // Captura a URL atual para redirecionamento após login

  if (isLoading) {
    // Não redirecionar enquanto o token está sendo verificado no localStorage
    return <div className="p-8 text-center">Verificando autenticação...</div>;
  }

  if (!isAuthenticated) {
    // ⬅️ Redireciona para a página de Login, passando a URL atual como estado.
    // Assim, o usuário será levado de volta para a rota de detalhes após o login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se estiver autenticado, renderiza a rota filha (RouteDetailPage)
  return <>{children}</>;
};