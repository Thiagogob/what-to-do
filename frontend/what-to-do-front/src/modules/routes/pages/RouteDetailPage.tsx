// src/modules/routes/pages/RouteDetailPage.tsx (Atualizado)

import React from 'react';
import { useParams } from 'react-router-dom';
import { useRouteById } from '../hooks/useRouteById'; // ⬅️ Novo hook

export const RouteDetailPage: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>(); 
  const id = Number(routeId);
  const { route, loading, error } = useRouteById(id);

  if (!routeId || isNaN(id)) {
    return <div className="p-4 text-red-500">ID da Rota inválido.</div>;
  }

  if (loading) {
    return <div className="p-8">Carregando detalhes da rota #{id}...</div>;
  }
  
  if (error) {
    return <div className="p-8 text-red-500">Erro ao buscar detalhes da rota: {error.message}</div>;
  }

  if (!route) {
      return <div className="p-8">Detalhes da Rota #{id} não encontrados.</div>;
  }

  // ⬅️ Exibição dos dados protegidos
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">{route.name} (ID #{route.id})</h1>
      <p className="text-lg text-gray-700">Detalhes da rota</p>
      
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p>Distância Total: <span className="font-semibold">{Number(route.distanceKm).toFixed(2)} km</span></p>
        <p>Ganho de Elevação: <span className="font-semibold">{Number(route.elevationGainMeters).toFixed(2)} m</span></p>
        {/* Aqui você renderizaria o mapa ou GeoJSON completo */}
      </div>
    </div>
  );
};