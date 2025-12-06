// src/modules/routes/hooks/useRouteById.ts

import { useState, useEffect } from 'react';
import { fetchRouteById } from '../routesApi';
import { type Route } from '../types/route';

interface RouteDetailState {
  route: Route | null;
  loading: boolean;
  error: Error | null;
}

export const useRouteById = (id: number): RouteDetailState => {
  const [state, setState] = useState<RouteDetailState>({
    route: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function loadRoute() {
      // Assume que o useAuth ou o AuthGuard garantiram o token.
      try {
        const rawData = await fetchRouteById(id);
            
            // ⬅️ CRÍTICO: Conversão do GeoJSON (Se for retornado como string)
            const route: Route = {
                ...rawData,
                // Assumindo que geoJsonGeometry é uma string JSON, faça o parse:
                geoJsonGeometry: rawData.geoJsonGeometry,
                // Se já for um objeto JSON válido, apenas use: geoJsonGeometry: rawData.geoJsonGeometry,
            };
        setState({ route, loading: false, error: null });
      } catch (err) {
        // Se a API retornar 401, o AuthGuard já deve ter redirecionado, 
        // mas tratamos o erro de qualquer forma.
        setState({ route: null, loading: false, error: err as Error });
      }
    }
    loadRoute();
  }, [id]);

  return state;
};