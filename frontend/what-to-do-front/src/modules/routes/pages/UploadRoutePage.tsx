// src/modules/routes/pages/UploadRoutePage.tsx

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { httpClient } from '../../../api/httpClient'; // Seu cliente Axios
import { useDropzone } from 'react-dropzone'; // ⬅️ Vamos instalar esta biblioteca

// ⚠️ Instale react-dropzone: npm install react-dropzone

export const UploadRoutePage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const navigate = useNavigate();

    // -----------------------------------------------------
    // 1. Lógica Drag & Drop (useDropzone)
    // -----------------------------------------------------
    const onDrop = useCallback((acceptedFiles: File[]) => {
        setErrorMessage(null);
        setSuccessMessage(null);
        if (acceptedFiles.length > 0) {
            const uploadedFile = acceptedFiles[0];
            // Verifique se é um arquivo GPX (ou XML) simples
            if (uploadedFile.type === 'application/gpx+xml' || uploadedFile.name.toLowerCase().endsWith('.gpx')) {
                setFile(uploadedFile);
            } else {
                setErrorMessage("Por favor, selecione um arquivo válido com extensão .gpx.");
            }
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        accept: {
            'application/gpx+xml': ['.gpx', '.xml'],
        },
    });

    // -----------------------------------------------------
    // 2. Lógica de Envio de Arquivo
    // -----------------------------------------------------
    const handleSubmit = async () => {
        if (!file) {
            setErrorMessage("Selecione um arquivo GPX antes de enviar.");
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        const formData = new FormData();
        // 
        formData.append('routeFile', file);

        try {
            // O axios/httpClient enviará o cabeçalho 'Authorization' via interceptor
            const response = await httpClient.post('/api/routes/upload', formData, {
                // Necessário para upload de arquivos
                headers: { 'Content-Type': 'multipart/form-data' }, 
            });

            const { routeId, name } = response.data;

            setSuccessMessage(`Rota '${name}' enviada com sucesso! Redirecionando para edição...`);
            
            // Redireciona para a lista de rotas ou para os detalhes da nova rota
            setTimeout(() => {
                navigate(`/routes/edit/${routeId}`);
            }, 2000);

        } catch (error) {
            console.error("Erro no upload:", error);
            const msg = (error as any).response?.data?.message || "Falha no servidor ao processar o arquivo.";
            setErrorMessage(`Erro ao enviar: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    // -----------------------------------------------------
    // 3. Renderização
    // -----------------------------------------------------
    return (
        <div className="container mx-auto p-6 max-w-lg bg-white shadow-xl rounded-xl">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 text-center">
                Upload de Arquivo GPX
            </h2>

            {/* Mensagens de Feedback */}
            {successMessage && (
                <div className="p-4 mb-4 text-green-700 bg-green-100 border border-green-400 rounded">
                    {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="p-4 mb-4 text-red-700 bg-red-100 border border-red-400 rounded">
                    {errorMessage}
                </div>
            )}

            {/* Área de Drag and Drop */}
            <div 
                {...getRootProps()} 
                className={`p-10 border-2 border-dashed rounded-lg text-center transition duration-300 ${
                    isDragActive ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-300'
                } cursor-pointer mb-6`}
            >
                <input {...getInputProps()} />
                {isDragActive ? (
                    <p className="text-blue-700 font-semibold">Solte o arquivo GPX aqui...</p>
                ) : (
                    <p className="text-gray-600">Arraste e solte um arquivo GPX aqui, ou clique para selecionar.</p>
                )}
            </div>

            {/* Informações do Arquivo Selecionado */}
            {file && (
                <div className="flex justify-between items-center p-4 bg-gray-100 rounded-md mb-6">
                    <p className="text-sm font-medium text-gray-800">
                        Arquivo Selecionado: <span className="font-bold">{file.name}</span>
                    </p>
                    <button
                        onClick={() => setFile(null)}
                        className="text-red-500 hover:text-red-700 text-sm"
                    >
                        Remover
                    </button>
                </div>
            )}

            {/* Botão de Envio */}
            <button
                onClick={handleSubmit}
                disabled={!file || isLoading}
                className={`w-full py-3 font-semibold rounded-lg shadow-md transition duration-300 ${
                    !file || isLoading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                }`}
            >
                {isLoading ? 'Enviando...' : 'Processar e Salvar Rota'}
            </button>
        </div>
    );
};