// src/modules/routes/routesApi.ts

import { httpClient } from '../../api/httpClient'; // Ajuste o caminho conforme sua estrutura
import type { RouteListResponse } from './types/route';
import { type Route } from './types/route';

/**
 * Busca todas as rotas do usuário logado na API.
 * @returns Promise<RouteListResponse>
 */
export async function fetchAllRoutes(): Promise<RouteListResponse> {
  const response = await httpClient.get<RouteListResponse>('/routes');
  return response.data;
}


export async function fetchRouteById(id: number): Promise<Route> {
  const response = await httpClient.get<Route>(`/routes/${id}`);
  return response.data;
}


