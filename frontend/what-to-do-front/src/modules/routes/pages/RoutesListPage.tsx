// src/modules/routes/pages/RoutesListPage.tsx

import React from 'react';
import { useRoutes } from '../hooks/useRoutes';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { httpClient } from '../../../api/httpClient';


export const RoutesListPage: React.FC = () => {
  const { routes, loading, error, refetch } = useRoutes();
  const navigate = useNavigate();
  const { logout, isAuthenticated, user } = useAuth();

  const currentUserId = user?.sub;

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
        await httpClient.delete(`/routes/${routeId}`);
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


        <div className="space-y-4">
            {routes.map((route) => {
                
               
                const isOwner = currentUserId && route.userId === currentUserId; 
                  
                return (
                    <div
                        key={route.id}
                        className="p-4 shadow-lg rounded-lg border-l-4 border-blue-500 hover:shadow-xl transition duration-300 flex justify-between items-center"
                    >
                        {/* 1. Área de Dados (Click para Detalhes) */}
                        <div 
                            onClick={() => navigate(`/routes/${route.id}`)}
                            className="flex-grow cursor-pointer"
                        >
                            <h2 className="text-xl font-semibold text-gray-700 mb-2">{route.name}</h2>

                            <div className="flex space-x-6 text-sm text-gray-500">
                                <p>
                                    <span className="font-medium text-gray-600">Distância:</span>
                                    {Number(route.distanceKm).toFixed(2)} km
                                </p>

                                <p>
                                    <span className="font-medium text-gray-600">Ganho de Elevação:</span>
                                    {Number(route.elevationGainMeters).toFixed(0)} m
                                </p>
                            </div>
                        </div>

                        {/* 2. Botões de Ação (Apenas se for o Dono) */}
                        {isOwner && (
                            <div className="flex space-x-2 ml-4">
                                
                                {/* Botão de Edição */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Impede o clique no div principal
                                        navigate(`/routes/edit/${route.id}`);
                                    }}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1 px-3 rounded-lg transition duration-300 shadow-md text-sm"
                                >
                                    Editar
                                </button>

                                {/* Botão de Remoção */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Impede o clique no div principal
                                        handleDelete(route.id);
                                    }}
                                    className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-lg transition duration-300 shadow-md text-sm"
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
);
};