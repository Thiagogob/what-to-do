import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRouteById } from '../hooks/useRouteById';
import { httpClient } from '../../../api/httpClient';
import { RouteMap } from '../components/RouteMap';
import { useDropzone } from 'react-dropzone';

export const RouteEditPage: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const id = Number(routeId);
  const { route, loading, error } = useRouteById(id);
  const [name, setName] = useState('');
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (route) setName(route.name);
  }, [route]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setNewPhotos(prev => [...prev, ...acceptedFiles]);
    setSaveError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: { 'image/jpeg': ['.jpeg', '.jpg'], 'image/png': ['.png'] },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);
    const formData = new FormData();
    formData.append('name', name);
    newPhotos.forEach(photo => formData.append('photos', photo));
    try {
      await httpClient.patch(`/routes/${id}`, formData);
      navigate(`/routes/${id}`);
    } catch (err) {
      setSaveError((err as any).response?.data?.message || 'Falha ao salvar. Verifique o tamanho dos arquivos.');
    } finally {
      setIsSaving(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(`/routes/${id}`)}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm font-medium transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar
          </button>
          <div className="w-px h-5 bg-slate-600" />
          <h1 className="text-lg font-bold truncate">Editar: {route.name}</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {saveError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
            {saveError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
              Nome da Rota
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              required
              disabled={isSaving}
            />
          </div>

          {/* Photo dropzone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Adicionar Fotos <span className="text-slate-400 font-normal">(máx. 5)</span>
            </label>
            <div
              {...getRootProps()}
              className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors duration-200 cursor-pointer ${
                isDragActive
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-slate-200 bg-slate-50 hover:border-emerald-300'
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-3xl mb-2">🖼️</div>
              <p className="text-slate-500 text-sm font-medium">Arraste fotos aqui ou clique para selecionar</p>
              <p className="text-slate-400 text-xs mt-1">JPG, PNG</p>
            </div>

            {newPhotos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {newPhotos.map((photo, index) => (
                  <div key={index} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full text-xs text-emerald-700">
                    <span className="max-w-32 truncate">{photo.name}</span>
                    <button
                      type="button"
                      onClick={() => setNewPhotos(newPhotos.filter((_, i) => i !== index))}
                      className="text-emerald-500 hover:text-rose-500 transition-colors font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving || !name.trim()}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors duration-200 ${
              isSaving || !name.trim()
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>

        {/* Map preview */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Visualização do Percurso</h3>
          </div>
          {route.geoJsonGeometry && <RouteMap geoJson={route.geoJsonGeometry} />}
        </div>
      </div>
    </div>
  );
};
