// src/modules/routes/pages/RoutesListPage.tsx

import React from 'react';
import { useRoutes } from '../hooks/useRoutes';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { httpClient } from '../../../api/httpClient';
import { useMemo, useRef } from 'react';
import { type Route } from '../types/route';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

interface CategorizedRoutes {
    [key: string]: Route[];
}

// ⬅️ CRITÉRIOS DE FILTRO
const CRITERIA = {
    EASY_KM: 40,
    EASY_ELEVATION: 450,
    CHALLENGE_MAX_KM: 70,
};

export const RoutesListPage: React.FC = () => {
  const { routes, loading, error, refetch } = useRoutes();
  const navigate = useNavigate();
  const { logout, isAuthenticated, user } = useAuth();

  const currentUserId = user?.sub;

  const carouselRefs = useRef<Record<string, HTMLDivElement | null>>({}); 

  // Função para lidar com a rolagem do carrossel
  const scrollCarousel = (categoryName: string, direction: 'left' | 'right') => {
    const container = carouselRefs.current[categoryName];
    if (container) {
      // Ajuste o valor de scroll. Ex: 350px (largura da rota + espaço)
      const scrollAmount = 350; 
      
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth', // Rolagem suave
      });
    }
  };

  const handleLogout = () => {
    logout(); // Limpa o token no localStorage e no estado global
    navigate('/login'); // Redireciona o usuário para a página de Login
  };

  const handleUploadRoute = () => {
      if (isAuthenticated) {
          // 1. Logado: Vai para a tela de upload (assumindo a rota /upload)
          navigate('/upload'); 
      } else {
          // 2. Deslogado: Redireciona para o login
          // Adicionamos o 'state' para que o usuário seja redirecionado para /upload após o login.
          navigate('/login', { state: { from: '/upload' } }); 
      }
  };

  const handleDelete = async (routeId: number) => {
    if (!window.confirm("Tem certeza que deseja remover esta rota permanentemente? Esta ação não pode ser desfeita.")) {
        return;
    }

    try {
        await httpClient.delete(`/api/routes/${routeId}`);
        alert('Rota removida com sucesso!');
        refetch(); // ⬅️ Recarrega a lista
    } catch (err) {
        // Exibe 404 se o usuário tentar deletar a rota de outro
        const msg = (err as any).response?.status === 404 
            ? "Rota não encontrada ou você não tem permissão para removê-la." 
            : "Falha ao remover a rota. Tente novamente.";
        alert(msg);
        console.error("Erro ao deletar rota:", err);
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

        // 1. CATEGORIZAÇÃO (Mantida a lógica anterior)
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

        // 2. ORDENAÇÃO DENTRO DE CADA CATEGORIA
        // Usamos Object.keys para iterar sobre os nomes das categorias
        Object.keys(categories).forEach(categoryName => {
            categories[categoryName].sort((a, b) => {
                // ORDENAÇÃO CRESCENTE (a.elev - b.elev)
                // Se quiser DECRESCENTE, use: b.elevationGainMeters - a.elevationGainMeters
                return a.elevationGainMeters - b.elevationGainMeters;
            });
        });

        return categories;
    }, [routes]); // Recalcula sempre que a lista de rotas mudar

  if (loading) {
    return (
      <div className="p-4 text-gray-600">
        Carregando rotas... ⏱️
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-100 border border-red-400 rounded">
        Erro ao carregar dados: {error.message}. Você está logado?
      </div>
    );
  }

  if (!routes || routes.length === 0) {
    return (
      <div className="p-4 text-gray-500">
        Nenhuma rota encontrada. Comece a enviar arquivos GPX!
      </div>
    );
  }

return (
    <div className="p-6">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
                Rotas ({routes.length})
            </h1>
              
            <div className="flex space-x-4">
                {/* BOTÃO: ENVIAR ROTA (Lógica de autenticação na função handleUploadRoute) */}
                <button
                    onClick={handleUploadRoute}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 shadow-md"
                >
                    📤 Enviar Rota
                </button>
                
                {/* BOTÃO DE LOGOUT CONDICIONAL */}
                {isAuthenticated && (
                    <button
                        onClick={handleLogout}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 shadow-md"
                    >
                        Logout
                    </button>
                )}
            </div>
        </div>


      <div className="space-y-10">
                {Object.entries(categorizedRoutes).map(([categoryName, routesInCategory]) => (
                    routesInCategory.length > 0 && (
                        <div key={categoryName}>
                            <h2 className="text-2xl font-bold text-gray-700 mt-4 mb-4 border-b pb-2">
                                {categoryName} ({routesInCategory.length})
                            </h2>

                            {/* CONTAINER PRINCIPAL DO CARROSSEL (RELATIVO PARA AS FLECHAS) */}
                            <div className="relative">
                                
                                {/* FLECHA ESQUERDA */}
                                <button
                                    onClick={() => scrollCarousel(categoryName, 'left')}
                                    className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition duration-200 opacity-80 hover:opacity-100 hidden md:block"
                                    title="Anterior"
                                >
                                    <FaChevronLeft size={18} />
                                </button>

                                {/* FLECHA DIREITA */}
                                <button
                                    onClick={() => scrollCarousel(categoryName, 'right')}
                                    className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition duration-200 opacity-80 hover:opacity-100 hidden md:block"
                                    title="Próximo"
                                >
                                    <FaChevronRight size={18} />
                                </button>


                                {/* CONTAINER DE ROLAGEM (Scrollable Div) */}
                                <div 
                                    // ⬅️ Atribuição da ref com sintaxe de bloco para garantir o retorno VOID
                                    ref={el => { carouselRefs.current[categoryName] = el; }}
                                    className="flex overflow-x-auto space-x-4 pb-4 px-10 scrollbar-hide" 
                                >
                                    {routesInCategory.map((route) => {
                                        const isOwner = currentUserId && route.userId === currentUserId; 
                                          
                                        return (
                                            <div
                                                key={route.id}
                                                // w-80 é a largura fixa do card, flex-shrink-0 é crucial
                                                className="w-80 flex-shrink-0 p-4 shadow-xl rounded-lg border-t-4 border-blue-500 hover:shadow-2xl transition duration-300 flex flex-col justify-between bg-white"
                                            >
                                                {/* 1. Área de Dados */}
                                                <div 
                                                    onClick={() => navigate(`/routes/${route.id}`)}
                                                    className="flex-grow cursor-pointer"
                                                >
                                                    <h3 className="text-xl font-semibold text-gray-700 mb-2 truncate" title={route.name}>
                                                        {route.name}
                                                    </h3>

                                                    <div className="space-y-1 text-sm text-gray-500">
                                                        <p>
                                                            <span className="font-medium text-gray-600">Distância:</span>
                                                            {Number(route.distanceKm).toFixed(2)} km
                                                        </p>

                                                        <p>
                                                            <span className="font-medium text-gray-600">Elevação:</span>
                                                            {Number(route.elevationGainMeters).toFixed(0)} m
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* 2. Botões de Ação (Apenas se for o Dono) */}
                                                {isOwner && (
                                                    <div className="flex space-x-2 mt-4 pt-2 border-t border-gray-100">
                                                        
                                                        <button onClick={(e) => { e.stopPropagation(); navigate(`/routes/edit/${route.id}`); }}
                                                            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1 px-3 rounded-lg transition duration-300 text-sm">
                                                            Editar
                                                        </button>

                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(route.id); }}
                                                            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-lg transition duration-300 text-sm">
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
                ))}
            </div>
        </div>
    );
};