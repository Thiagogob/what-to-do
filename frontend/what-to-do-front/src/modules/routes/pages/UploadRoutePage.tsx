import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpClient } from '../../../api/httpClient';
import { useDropzone } from 'react-dropzone';

export const UploadRoutePage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (acceptedFiles.length > 0) {
      const uploaded = acceptedFiles[0];
      if (uploaded.type === 'application/gpx+xml' || uploaded.name.toLowerCase().endsWith('.gpx')) {
        setFile(uploaded);
      } else {
        setErrorMessage('Por favor, selecione um arquivo válido com extensão .gpx.');
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'application/gpx+xml': ['.gpx', '.xml'] },
  });

  const handleSubmit = async () => {
    if (!file) { setErrorMessage('Selecione um arquivo GPX antes de enviar.'); return; }
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const formData = new FormData();
    formData.append('routeFile', file);
    try {
      const response = await httpClient.post('/routes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { routeId, name } = response.data;
      setSuccessMessage(`Rota '${name}' enviada com sucesso!`);
      setTimeout(() => navigate(`/routes/edit/${routeId}`), 1800);
    } catch (error) {
      const msg = (error as any).response?.data?.message || 'Falha no servidor ao processar o arquivo.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
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
          <h1 className="text-lg font-bold">Enviar Rota</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Upload de arquivo GPX</h2>
          <p className="text-slate-400 text-sm mb-8">Arraste ou selecione o arquivo para processar e salvar sua rota.</p>

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2">
              <span>✓</span> {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`rounded-2xl border-2 border-dashed p-12 text-center transition-colors duration-200 cursor-pointer ${
              isDragActive
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-slate-100'
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-4xl mb-3">📁</div>
            {isDragActive ? (
              <p className="text-emerald-600 font-semibold">Solte o arquivo aqui...</p>
            ) : (
              <>
                <p className="text-slate-600 font-medium">Arraste um arquivo GPX aqui</p>
                <p className="text-slate-400 text-sm mt-1">ou clique para selecionar</p>
              </>
            )}
          </div>

          {/* Selected file */}
          {file && (
            <div className="mt-4 flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-emerald-600 text-lg">📄</span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button onClick={() => setFile(null)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!file || isLoading}
            className={`w-full mt-6 py-3 rounded-xl font-semibold text-sm transition-colors duration-200 ${
              !file || isLoading
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isLoading ? 'Processando...' : 'Processar e Salvar Rota'}
          </button>
        </div>
      </div>
    </div>
  );
};
