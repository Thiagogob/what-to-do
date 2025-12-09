// src/modules/routes/hooks/useRouteById.ts

import { useState, useEffect, useCallback } from 'react';
import { fetchRouteById } from '../routesApi';
import { type Route } from '../types/route';

interface RouteDetailState {
  route: Route | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useRouteById = (id: number): RouteDetailState => {
  const [state, setState] = useState<Omit<RouteDetailState, 'refetch'>>({
    route: null,
    loading: true,
    error: null,
  });

  const[refreshKey, setRefreshKey] = useState(0)

  // Função que incrementa a chave, forçando a re-execução do useEffect
  const refetch = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []); 

useEffect(() => {
    async function loadRoute() {
      // Começa o carregamento
      setState(s => ({ ...s, loading: true, error: null }));
      
      try {
        const rawData = await fetchRouteById(id);
            
            // CRÍTICO: Conversão do GeoJSON (Se for retornado como string)
            const route: Route = {
                ...rawData,
                // Assumindo que geoJsonGeometry é uma string JSON, faça o parse:
                geoJsonGeometry: rawData.geoJsonGeometry,
            };
        setState({ route, loading: false, error: null });
      } catch (err) {
        // Se a API retornar 401, o AuthGuard já deve ter redirecionado, 
        // mas tratamos o erro de qualquer forma.
        setState({ route: null, loading: false, error: err as Error });
      }
    }
    // O re-fetch acontece quando id OU refreshKey mudam
    loadRoute();
  }, [id, refreshKey]); // ⬅️ Dependência adicionada

  return { ...state, refetch }; // ⬅️ Retorna o estado e a função refetch
};