
export interface Route {
  id: number;
  name: string;          // O título da rota
  distanceKm: number;     // Distância em quilômetros
  elevationGainMeters: number;
  geoJsonGeometry: any  // Ganho total de elevação
  userId: number;
  photos: RoutePhoto[];
}

export interface RouteEditData {
  id: number;
  name: string; // O campo editável
  distanceKm: number;
  elevationGainMeters: number;
  geoJsonGeometry: any; // O objeto GeoJSON (pode ser necessário para visualização)
  // ... outros campos necessários
}

export interface RoutePhoto {
    id: number;
    url: string;
    filePath: string; // Ex: /api/routes/photos/nome-arquivo.jpg
    // Adicione outros campos se necessário (ex: filePath, order, createdAt)
}
// O DTO de resposta para a lista (se a API retornar um array diretamente)
export type RouteListResponse = Route[];