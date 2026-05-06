import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRouteById } from '../hooks/useRouteById';
import { RouteMap } from '../components/RouteMap';
import { useElevationProfile } from '../hooks/useElevationProfile';
import { ElevationChart } from '../components/ElevationChart';
import type { Feature, FeatureCollection } from 'geojson';
import { httpClient } from '../../../api/httpClient';
import { useAuth } from '../../auth/AuthContext';

export const RouteDetailPage: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const id = Number(routeId);
  const navigate = useNavigate();
  const { route, loading, error, refetch } = useRouteById(id);
  const { user } = useAuth();
  const currentUserId = user?.sub;
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDeletePhoto = async (photoId: number) => {
    if (!window.confirm('Tem certeza que deseja remover esta foto? Esta ação não pode ser desfeita.')) return;
    try {
      await httpClient.delete(`/routes/photos/${photoId}`);
      refetch();
    } catch (err) {
      const status = (err as any).response?.status;
      alert(
        status === 404 ? 'Foto não encontrada.' :
        status === 403 ? 'Você não tem permissão para remover esta foto.' :
        'Falha ao remover a foto. Tente novamente.'
      );
    }
  };

  const handleDownloadGpx = async () => {
    setIsDownloading(true);
    try {
      const response = await httpClient.get(`/routes/download/${id}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/gpx+xml' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', route ? `${route.name.replace(/\s+/g, '_')}.gpx` : 'route.gpx');
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(link);
    } catch (err) {
      const status = (err as any).response?.status;
      alert(
        status === 404
          ? 'O arquivo GPX original não está disponível. Esta rota foi importada de um sistema anterior e o arquivo não foi migrado.'
          : status === 401 || status === 403
          ? 'Acesso negado. Por favor, faça login novamente.'
          : 'Falha ao baixar o arquivo GPX.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const geoJsonData: Feature | FeatureCollection | null =
    (route?.geoJsonGeometry as unknown as Feature | FeatureCollection) || null;
  const profileData = useElevationProfile(geoJsonData);

  if (!routeId || isNaN(id)) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-rose-500">ID da Rota inválido.</p></div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Carregando rota...</p>
        </div>
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-rose-500">{error?.message ?? 'Rota não encontrada.'}</p>
      </div>
    );
  }

  const isOwner = currentUserId && route.userId === currentUserId;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm font-medium transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar
          </button>
          <div className="w-px h-5 bg-slate-600" />
          <h1 className="text-lg font-bold truncate">{route.name}</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Distância Total</p>
            <p className="text-2xl font-bold text-slate-800">{Number(route.distanceKm).toFixed(2)} <span className="text-base font-medium text-slate-500">km</span></p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Ganho de Elevação</p>
            <p className="text-2xl font-bold text-slate-800">{Number(route.elevationGainMeters).toFixed(0)} <span className="text-base font-medium text-slate-500">m</span></p>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Mapa</h2>
          </div>
          {geoJsonData ? (
            <RouteMap geoJson={geoJsonData} />
          ) : (
            <div className="p-6 text-rose-600 text-sm">Erro ao carregar dados do mapa.</div>
          )}
        </div>

        {/* Elevation + Download */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Perfil Topográfico</h2>
            <button
              onClick={handleDownloadGpx}
              disabled={isDownloading}
              className={`flex items-center gap-2 text-sm font-medium py-1.5 px-4 rounded-full transition-colors duration-200 ${
                isDownloading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {isDownloading ? 'Baixando...' : 'Download GPX'}
            </button>
          </div>
          <div className="p-5">
            {geoJsonData && <ElevationChart data={profileData} />}
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">
              Fotos <span className="text-slate-400 font-normal text-sm">({route.photos?.length || 0})</span>
            </h2>
          </div>
          <div className="p-5">
            {route.photos && route.photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {route.photos.map(photo => (
                  <div
                    key={photo.id}
                    className="relative rounded-xl overflow-hidden aspect-square bg-slate-100 group shadow-sm"
                  >
                    <img
                      src={photo.url}
                      alt={`Foto da rota ${route.name}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isOwner && (
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="absolute top-2 right-2 bg-slate-900/70 hover:bg-rose-600 text-white w-7 h-7 rounded-full text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                        title="Remover Foto"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="text-3xl mb-2">📷</div>
                <p className="text-slate-400 text-sm">Nenhuma foto adicionada ainda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
