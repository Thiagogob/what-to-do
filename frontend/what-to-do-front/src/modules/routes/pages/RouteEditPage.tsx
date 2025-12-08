// src/modules/routes/pages/RouteEditPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRouteById } from '../hooks/useRouteById'; 
import { httpClient } from '../../../api/httpClient'; // Seu cliente Axios
import { RouteMap } from '../components/RouteMap'; // Opcional, para visualização

export const RouteEditPage: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>(); 
  const id = Number(routeId);
  
  // Hook de busca de dados protegidos
  const { route, loading, error } = useRouteById(id); 
  
  // Estado para gerenciar o formulário
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const navigate = useNavigate();

  // ⬅️ CRÍTICO: Preencher o formulário quando os dados da rota chegarem
  useEffect(() => {
    if (route) {
      setName(route.name);
    }
  }, [route]);

  // Tratamento de estados de carregamento e erro (Herda do useRouteById)
  if (loading) {
    return <div className="p-8">Carregando dados da rota para edição...</div>;
  }
  
  if (error) {
    // O AuthGuard deve ter redirecionado para o login se for 401
    return <div className="p-8 text-red-500">Erro ao carregar rota: {error.message}</div>;
  }

  if (!route) {
    return <div className="p-8">Rota não encontrada.</div>;
  }

  // Lógica de Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    try {
      const updateData = { name }; // Dados a serem enviados
      
      // Envia a requisição PATCH para atualizar o nome no backend
      await httpClient.patch(`/routes/${id}`, updateData); 
      
      alert('Nome da rota atualizado com sucesso!');
      navigate(`/routes/${id}`); // Volta para a tela de detalhes após salvar

    } catch (err) {
      const msg = (err as any).response?.data?.message || 'Falha ao salvar a rota.';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Prepara o GeoJSON (assumindo que já é um objeto)
  const geoJsonData = route.geoJsonGeometry; 


  return (
    <div className="p-6 container mx-auto max-w-4xl">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">
        Editar Rota: {route.name}
      </h2>

      {saveError && (
        <div className="p-3 mb-4 text-red-700 bg-red-100 rounded">{saveError}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 shadow-lg rounded-lg">
        
        {/* Campo de Edição do Nome */}
        <div className="mb-6">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nome da Rota
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={isSaving}
          />
        </div>
        
        {/* Botão de Salvar */}
        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className={`w-full py-2 px-4 font-semibold rounded-lg transition duration-300 ${
            isSaving || !name.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
      
      {/* Visualização do Mapa (Opcional, mas útil) */}
      <div className="mt-8">
        <h3 className="text-2xl font-semibold mb-3">Visualização do Percurso</h3>
        {geoJsonData && <RouteMap geoJson={geoJsonData} />}
      </div>
    </div>
  );
};