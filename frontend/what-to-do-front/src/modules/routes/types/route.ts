
export interface Route {
  id: number;
  name: string;          // O título da rota
  distanceKm: number;     // Distância em quilômetros
  elevationGainMeters: number;  // Ganho total de elevação
  
}
// O DTO de resposta para a lista (se a API retornar um array diretamente)
export type RouteListResponse = Route[];