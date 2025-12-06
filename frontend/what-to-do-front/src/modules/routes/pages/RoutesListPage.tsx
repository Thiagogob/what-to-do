// src/modules/routes/pages/RoutesListPage.tsx

import React from 'react';
import { useRoutes } from '../hooks/useRoutes';
import { useNavigate } from 'react-router-dom';

export const RoutesListPage: React.FC = () => {
  const { routes, loading, error } = useRoutes();
  const navigate = useNavigate();

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
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
              Rotas ({routes.length})
          </h1>

          <div className="space-y-4">
              {routes.map((route) => (
                  // Usando classes Tailwind para um layout limpo
                  <div
                      key={route.id}
                      onClick={() => navigate(`/routes/${route.id}`)}
                      className="p-4 shadow-lg rounded-lg border-l-4 border-blue-500 hover:shadow-xl transition duration-300"
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
              ))}
          </div>
      </div>
  );
};