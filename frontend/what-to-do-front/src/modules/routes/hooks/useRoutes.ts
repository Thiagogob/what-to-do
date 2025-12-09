// src/modules/routes/hooks/useRoutes.ts

import { useState, useEffect, useCallback } from 'react';
import { fetchAllRoutes } from '../routesApi';
import type { Route } from '../types/route';

// Interface para o estado que o hook retorna
interface RouteState {
  routes: Route[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useRoutes = (): RouteState => {
  const [state, setState] = useState<Omit<RouteState, 'refetch'>>({
    routes: null,
    loading: true,
    error: null,
  });

const [refetchIndex, setRefetchIndex] = useState(0);

  // ⬅️ NOVO: Função para o refetch
  const refetch = useCallback(() => {
      setRefetchIndex(prev => prev + 1);
  }, []);

 useEffect(() => {
    async function loadRoutes() {
      try {
        setState(s => ({ ...s, loading: true, error: null })); // Inicia loading
        const data = await fetchAllRoutes();
        setState(s => ({ ...s, routes: data, loading: false }));
      } catch (err) {
        console.error("Erro ao buscar rotas:", err);
        setState(s => ({ ...s, routes: null, loading: false, error: err as Error }));
      }
    }
    loadRoutes();
  }, [refetchIndex]); // ⬅️ Agora depende do refetchIndex

  return { ...state, refetch }; // ⬅️ Retorna a função refetch
};