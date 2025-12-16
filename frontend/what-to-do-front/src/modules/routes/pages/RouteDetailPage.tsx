// src/modules/routes/pages/RouteDetailPage.tsx (Atualizado)

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useRouteById } from '../hooks/useRouteById'; //
import { RouteMap } from '../components/RouteMap';
import { useElevationProfile } from '../hooks/useElevationProfile'; // 
import { ElevationChart } from '../components/ElevationChart'; // 
import type { Feature, FeatureCollection } from 'geojson';
import { httpClient } from '../../../api/httpClient';
import { useAuth } from '../../auth/AuthContext';


const API_URL = import.meta.env.VITE_API_URL;

const GCS_BASE_URL = import.meta.env.VITE_GCS_BASE_URL;

export const RouteDetailPage: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>(); 
  const id = Number(routeId);
  const { route, loading, error, refetch } = useRouteById(id);


  const{user} = useAuth();
  const currentUserId = user?.sub;
  const [isDownloading, setIsDownloading] = useState(false);
  
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

  const handleDownloadGpx = async () => {
    setIsDownloading(true);

    try {
        const url = `/routes/download/${id}`;
        
        // 1. Faz a requisição usando o httpClient para incluir o token JWT
        const response = await httpClient.get(url, {
            // CRÍTICO: Configura a resposta como 'blob' (Binary Large Object)
            // Isso permite que o Axios lide com o arquivo binário (GPX/XML)
            responseType: 'blob', 
        });

        // 2. Cria um URL temporário para o BLOB retornado
        const blob = new Blob([response.data], { type: 'application/gpx+xml' });
        const downloadUrl = window.URL.createObjectURL(blob);
        
        // 3. Simula um clique em um link <a> para forçar o download
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        // Define o nome do arquivo para o navegador
        const fileName = route ? route.name.replace(/\s+/g, '_') + '.gpx' : 'route_download.gpx';
        link.setAttribute('download', fileName);
        
        // Adiciona o link ao DOM, clica nele e remove
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(link);

    } catch (err) {
        console.error("Erro ao fazer download da rota:", err);
        const status = (err as any).response?.status;
        if (status === 401 || status === 403) {
            alert("Acesso negado. Por favor, faça login novamente.");
        } else {
            alert("Falha ao baixar o arquivo GPX.");
        }
    } finally {
        setIsDownloading(false);
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

  const downloadUrl = `${API_URL}/routes/download/${id}`;

  // Exibição dos dados protegidos
  return (
    <div className="p-6">
      
<div className="flex justify-between items-start mb-4"> 
            
            {/* CONTAINER ESQUERDO: Agrupa Voltar + Título */}
            <div className="flex items-center space-x-4">
                
                {/* 1. BOTÃO HOME/VOLTAR */}
                <Link
                    to="/" 
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-300 shadow-md flex items-center space-x-1"
                    title="Voltar para a lista de rotas"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    <span>Voltar</span>
                </Link>

                {/* ⬅️ 2. NOVO CONTAINER CENTRALIZADOR */}
                <div className="flex flex-col items-center">
                    <h1 className="text-3xl font-bold mb-1">{route.name}</h1>
                </div>
            </div>
            </div>

      <p className="text-lg text-gray-700"></p>
      <div className="mt-8">
                <h3 className="text-2xl font-semibold mb-3">Mapa</h3>
                
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

          
            <button
                onClick={handleDownloadGpx}
                disabled={isDownloading} // Desabilita durante o download
                className={`font-semibold py-2 px-4 rounded-lg transition duration-300 shadow-md flex items-center space-x-2 ${
                    isDownloading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
                title="Download do arquivo GPX original"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                <span>{isDownloading ? 'Baixando...' : 'Download GPX'}</span>
            </button>
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

                            const fullImageUrl = `${GCS_BASE_URL}${photo.filePath}`; 
                            
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