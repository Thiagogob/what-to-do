// src/modules/routes/hooks/useRoutes.ts

import { useState, useEffect } from 'react';
import { fetchAllRoutes } from '../routesApi';
import type { Route } from '../types/route';

// Interface para o estado que o hook retorna
interface RouteState {
  routes: Route[] | null;
  loading: boolean;
  error: Error | null;
}

export const useRoutes = (): RouteState => {
  const [state, setState] = useState<RouteState>({
    routes: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function loadRoutes() {
      try {
        // Assume que o httpClient já tem o token JWT para esta chamada
        const data = await fetchAllRoutes();
        setState({ routes: data, loading: false, error: null });
      } catch (err) {
        console.error("Erro ao buscar rotas:", err);
        // Em um projeto real, você verificaria se é erro 401 para deslogar o usuário.
        setState({ routes: null, loading: false, error: err as Error });
      }
    }
    loadRoutes();
  }, []); // Executa apenas uma vez ao montar o componente

  return state;
};