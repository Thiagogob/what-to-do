
export interface Route {
  id: number;
  name: string;          // O título da rota
  distanceKm: number;     // Distância em quilômetros
  elevationGainMeters: number;
  geoJsonGeometry: any  // Ganho total de elevação
  
}

export interface RouteEditData {
  id: number;
  name: string; // O campo editável
  distanceKm: number;
  elevationGainMeters: number;
  geoJsonGeometry: any; // O objeto GeoJSON (pode ser necessário para visualização)
  // ... outros campos necessários
}
// O DTO de resposta para a lista (se a API retornar um array diretamente)
export type RouteListResponse = Route[];