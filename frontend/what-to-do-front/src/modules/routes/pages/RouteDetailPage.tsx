// src/modules/routes/pages/RouteDetailPage.tsx (Atualizado)

import React from 'react';
import { useParams } from 'react-router-dom';
import { useRouteById } from '../hooks/useRouteById'; //
import { RouteMap } from '../components/RouteMap';
import { useElevationProfile } from '../hooks/useElevationProfile'; // 
import { ElevationChart } from '../components/ElevationChart'; // 
import type { Feature, FeatureCollection } from 'geojson';
import { API_URL, httpClient } from '../../../api/httpClient';
import { useAuth } from '../../auth/AuthContext';

export const RouteDetailPage: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>(); 
  const id = Number(routeId);
  const { route, loading, error, refetch } = useRouteById(id);


  const{user} = useAuth();
  const currentUserId = user?.sub;

  const handleDeletePhoto = async (photoId: number) => {
    if (!window.confirm("Tem certeza que deseja remover esta foto? Esta ação não pode ser desfeita.")) {
        return;
    }

    try {
        // Rota backend: DELETE /routes/photos/:photoId
        await httpClient.delete(`/routes/photos/${photoId}`); 
        alert('Foto removida com sucesso!');
        refetch(); // ⬅️ FORÇA O RECARREGAMENTO DOS DETALHES DA ROTA
    } catch (err) {
        const status = (err as any).response?.status;
        let msg = "Falha ao remover a foto. Tente novamente.";

        if (status === 404) {
            msg = "Foto não encontrada.";
        } else if (status === 403) {
            msg = "Você não tem permissão para remover esta foto (não é o proprietário da rota).";
        }
        
        alert(msg);
        console.error("Erro ao deletar foto:", err);
    }
  };

  const geoJsonData: Feature | FeatureCollection | null = (route?.geoJsonGeometry as unknown as (Feature | FeatureCollection)) || null;

  const profileData = useElevationProfile(geoJsonData);
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

  const isOwner = currentUserId && route.userId === currentUserId;

  // Exibição dos dados protegidos
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">{route.name} (ID #{route.id})</h1>
      <p className="text-lg text-gray-700">Detalhes da rota</p>
      <div className="mt-8">
                <h3 className="text-2xl font-semibold mb-3">Visualização Interativa (Mapbox)</h3>
                
                {/* ⬅️ Passamos o objeto JSON analisado */}
                {geoJsonData ? (
                    <RouteMap geoJson={geoJsonData} />
                ) : (
                    <div className="bg-red-100 p-4 rounded text-red-700">
                        Erro ao carregar dados do mapa. O formato GeoJSON está inválido.
                    </div>
                )}

                <div className="mt-8">
          <h3 className="text-2xl font-semibold mb-3">Perfil Topográfico</h3>
          {geoJsonData && <ElevationChart data={profileData} />} 
      </div>
                
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p>Distância Total: <span className="font-semibold">{Number(route.distanceKm).toFixed(2)} km</span></p>
        <p>Ganho de Elevação: <span className="font-semibold">{Number(route.elevationGainMeters).toFixed(2)} m</span></p>
        {/* Aqui você renderizaria o mapa ou GeoJSON completo */}
      </div>

      <div className="mt-8">
                <h3 className="text-2xl font-semibold mb-3 border-b pb-2">Fotos da Rota ({route.photos?.length || 0})</h3>
                
                {route.photos && route.photos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {route.photos.map((photo) => {
                            // 3. CONSTRUIR O URL COMPLETO DA IMAGEM
                            const fullImageUrl = `${API_URL}${photo.url}`; 
                            
                            return (
                                // ⬅️ Adicionado 'relative' e 'group' para o botão flutuante
                                <div 
                                    key={photo.id} 
                                    className="relative rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition duration-200 bg-white group"
                                >
                                    <img 
                                        src={fullImageUrl} 
                                        alt={`Foto da rota ${route.name}`} 
                                        className="w-full h-48 object-cover"
                                        loading="lazy"
                                    />
                                    
                                    {/* ⬅️ BOTÃO DE DELETAR CONDICIONAL */}
                                    {isOwner && (
                                        <button
                                            onClick={() => handleDeletePhoto(photo.id)}
                                            // Posição: Canto superior direito, visível ao passar o mouse
                                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full text-sm opacity-0 group-hover:opacity-100 transition duration-300 shadow-md"
                                            title="Remover Foto"
                                        >
                                            &times;
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-4 bg-yellow-50 rounded text-yellow-700">
                        Nenhuma foto adicionada a esta rota ainda.
                    </div>
                )}
            </div>
    </div>
    </div>
  );
};