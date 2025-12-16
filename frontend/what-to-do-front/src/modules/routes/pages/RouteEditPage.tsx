// src/modules/routes/pages/RouteEditPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRouteById } from '../hooks/useRouteById'; 
import { httpClient } from '../../../api/httpClient'; // Seu cliente Axios
import { RouteMap } from '../components/RouteMap'; // Opcional, para visualização
import { useDropzone } from 'react-dropzone';


export const RouteEditPage: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>(); 
  const id = Number(routeId);
  
  // Hook de busca de dados protegidos
  const { route, loading, error } = useRouteById(id); 
  
  // Estado para gerenciar o formulário
  const [name, setName] = useState('');
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const navigate = useNavigate();


  // ⬅️ CRÍTICO: Preencher o formulário quando os dados da rota chegarem
  useEffect(() => {
    if (route) {
      setName(route.name);
    }
  }, [route]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
      // Adiciona as novas fotos ao array existente
      setNewPhotos(prevPhotos => [...prevPhotos, ...acceptedFiles]);
      setSaveError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      multiple: true, // Permitir múltiplas fotos
      accept: {
          'image/jpeg': ['.jpeg', '.jpg'],
          'image/png': ['.png'],
      },
  });

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
    
    // 1. Criar FormData para enviar JSON e Arquivos juntos
    const formData = new FormData();
    
    // 2. Anexar o campo JSON que foi editado (name)
    // O NestJS espera que o campo 'name' seja enviado assim para o @Body()
    formData.append('name', name); 

    // 3. Anexar as novas fotos (chave 'photos' deve corresponder ao FileFieldsInterceptor)
    newPhotos.forEach(photo => {
        formData.append('photos', photo); 
    });

  try {
      // 4. Envia o PATCH com FormData
      // Axios detecta FormData e define Content-Type: multipart/form-data
      await httpClient.patch(`/api/routes/${id}`, formData); 
      
      alert('Rota e fotos atualizadas com sucesso!');
      navigate(`/routes/${id}`); 

    } catch (err) {
      const msg = (err as any).response?.data?.message || 'Falha ao salvar a rota. Verifique se o tamanho dos arquivos não é muito grande.';
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
        
 <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Adicionar Fotos (Máx. 5)
            </label>
            <div 
                {...getRootProps()} 
                className={`p-6 border-2 border-dashed rounded-md text-center transition duration-300 ${
                    isDragActive ? 'bg-indigo-50 border-indigo-500' : 'bg-gray-50 border-gray-300'
                } cursor-pointer`}
            >
                <input {...getInputProps()} />
                <p className="text-gray-600">Arraste e solte fotos aqui, ou clique para selecionar.</p>
                <p className="text-xs text-gray-400 mt-1">Formatos aceitos: JPG, PNG.</p>
            </div>
            
            {/* 3. Visualização das Fotos Selecionadas */}
            {newPhotos.length > 0 && (
                <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700">Fotos prontas para upload: {newPhotos.length}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {newPhotos.map((photo, index) => (
                            <div key={index} className="flex items-center space-x-2 bg-indigo-100 p-2 rounded text-xs">
                                <span>{photo.name}</span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation(); 
                                        setNewPhotos(newPhotos.filter((_, i) => i !== index));
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* 4. Botão de Salvar */}
        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className={`w-full py-2 px-4 font-semibold rounded-lg shadow-md transition duration-300 ${
            isSaving || !name.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
      
      {/* Visualização do Mapa (GeoJSON) */}
      <div className="mt-8">
        <h3 className="text-2xl font-semibold mb-3">Visualização do Percurso</h3>
        {geoJsonData && <RouteMap geoJson={geoJsonData} />}
      </div>
    </div>
  );
};