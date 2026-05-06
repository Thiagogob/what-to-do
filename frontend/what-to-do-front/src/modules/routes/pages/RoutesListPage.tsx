import React from 'react';
import { useRoutes } from '../hooks/useRoutes';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { httpClient } from '../../../api/httpClient';
import { useMemo, useRef } from 'react';
import { type Route } from '../types/route';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface CategorizedRoutes {
  [key: string]: Route[];
}

const CRITERIA = {
  EASY_KM: 40,
  EASY_ELEVATION: 450,
  CHALLENGE_MAX_KM: 70,
};

const CATEGORY_META: Record<string, { icon: string; accent: string }> = {
  'Passeios divertidos':         { icon: '🌿', accent: 'bg-emerald-500' },
  'Pra Quem Procura um Desafio': { icon: '⛰️', accent: 'bg-amber-500'   },
  'Rotas Longas':                { icon: '🗺️', accent: 'bg-blue-500'    },
  'Moderadas/Outras':            { icon: '🚵', accent: 'bg-slate-400'   },
};

export const RoutesListPage: React.FC = () => {
  const { routes, loading, error, refetch } = useRoutes();
  const navigate = useNavigate();
  const { logout, isAuthenticated, user } = useAuth();
  const currentUserId = user?.sub;
  const carouselRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollCarousel = (categoryName: string, direction: 'left' | 'right') => {
    const container = carouselRefs.current[categoryName];
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleUploadRoute = () => {
    if (isAuthenticated) {
      navigate('/upload');
    } else {
      navigate('/login', { state: { from: '/upload' } });
    }
  };

  const handleDelete = async (routeId: number) => {
    if (!window.confirm('Tem certeza que deseja remover esta rota permanentemente? Esta ação não pode ser desfeita.')) return;
    try {
      await httpClient.delete(`/routes/${routeId}`);
      refetch();
    } catch (err) {
      const msg = (err as any).response?.status === 404
        ? 'Rota não encontrada ou você não tem permissão para removê-la.'
        : 'Falha ao remover a rota. Tente novamente.';
      alert(msg);
    }
  };

  const categorizedRoutes = useMemo(() => {
    if (!routes) return {};
    const categories: CategorizedRoutes = {
      'Passeios divertidos': [],
      'Pra Quem Procura um Desafio': [],
      'Rotas Longas': [],
      'Moderadas/Outras': [],
    };
    routes.forEach(route => {
      const dist = route.distanceKm;
      const elev = route.elevationGainMeters;
      if (dist < CRITERIA.EASY_KM && elev < CRITERIA.EASY_ELEVATION) {
        categories['Passeios divertidos'].push(route);
      } else if (dist >= CRITERIA.EASY_KM && dist < CRITERIA.CHALLENGE_MAX_KM) {
        categories['Pra Quem Procura um Desafio'].push(route);
      } else if (dist >= CRITERIA.CHALLENGE_MAX_KM) {
        categories['Rotas Longas'].push(route);
      } else {
        categories['Moderadas/Outras'].push(route);
      }
    });
    Object.keys(categories).forEach(cat => {
      categories[cat].sort((a, b) => a.elevationGainMeters - b.elevationGainMeters);
    });
    return categories;
  }, [routes]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Carregando rotas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-rose-600 font-medium">Erro ao carregar dados: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">União Outdoor</h1>
            <p className="text-emerald-300 text-sm mt-0.5">
              {routes?.length ?? 0} rotas disponíveis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleUploadRoute}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2 px-5 rounded-full text-sm transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Enviar Rota
            </button>
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 font-medium py-2 px-4 rounded-full text-sm transition-colors duration-200"
              >
                Sair
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-14">
        {!routes || routes.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🗺️</div>
            <p className="text-slate-500 text-lg">Nenhuma rota encontrada.</p>
            <p className="text-slate-400 text-sm mt-1">Comece enviando um arquivo GPX!</p>
          </div>
        ) : (
          Object.entries(categorizedRoutes).map(([categoryName, routesInCategory]) =>
            routesInCategory.length > 0 && (
              <div key={categoryName}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-2xl">{CATEGORY_META[categoryName]?.icon}</span>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{categoryName}</h2>
                    <p className="text-slate-400 text-sm">{routesInCategory.length} {routesInCategory.length === 1 ? 'rota' : 'rotas'}</p>
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={() => scrollCarousel(categoryName, 'left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-slate-200 p-2.5 rounded-full shadow-md hover:shadow-lg transition-all duration-200 hidden md:flex items-center justify-center"
                  >
                    <FaChevronLeft size={14} className="text-slate-600" />
                  </button>

                  <button
                    onClick={() => scrollCarousel(categoryName, 'right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-slate-200 p-2.5 rounded-full shadow-md hover:shadow-lg transition-all duration-200 hidden md:flex items-center justify-center"
                  >
                    <FaChevronRight size={14} className="text-slate-600" />
                  </button>

                  <div
                    ref={el => { carouselRefs.current[categoryName] = el; }}
                    className="flex overflow-x-auto gap-4 pb-4 px-10 scrollbar-hide"
                  >
                    {routesInCategory.map(route => {
                      const isOwner = currentUserId && route.userId === currentUserId;
                      const accent = CATEGORY_META[categoryName]?.accent ?? 'bg-emerald-500';

                      return (
                        <div
                          key={route.id}
                          className="w-68 flex-shrink-0 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col"
                          style={{ minWidth: '260px' }}
                        >
                          <div className={`h-1 ${accent}`} />

                          <div
                            className="p-5 flex-grow cursor-pointer"
                            onClick={() => navigate(`/routes/${route.id}`)}
                          >
                            <h3 className="font-semibold text-slate-800 text-base mb-4 truncate" title={route.name}>
                              {route.name}
                            </h3>
                            <div className="flex gap-5">
                              <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Distância</p>
                                <p className="text-slate-700 font-semibold text-sm mt-0.5">{Number(route.distanceKm).toFixed(1)} km</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Elevação</p>
                                <p className="text-slate-700 font-semibold text-sm mt-0.5">{Number(route.elevationGainMeters).toFixed(0)} m</p>
                              </div>
                            </div>
                          </div>

                          {isOwner && (
                            <div className="px-5 pb-4 flex gap-2 border-t border-slate-100 pt-3">
                              <button
                                onClick={e => { e.stopPropagation(); navigate(`/routes/edit/${route.id}`); }}
                                className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium py-1.5 rounded-lg text-xs transition-colors duration-200"
                              >
                                Editar
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); handleDelete(route.id); }}
                                className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium py-1.5 rounded-lg text-xs transition-colors duration-200"
                              >
                                Remover
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
};
