// src/modules/routes/components/ElevationChart.tsx

import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface ChartProps {
    data: { distanceKm: number; elevationM: number }[];
}

export const ElevationChart: React.FC<ChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="p-4 text-center text-gray-500">Dados de elevação insuficientes.</div>;
    }

    // Encontra o máximo e mínimo para configurar o eixo Y (para um gráfico mais expressivo)
    const elevations = data.map(p => p.elevationM);
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);

    // Adiciona margem de 5% no eixo Y
    const yDomainMin = Math.floor(minElevation * 0.95);
    const yDomainMax = Math.ceil(maxElevation * 1.05);

    return (
        <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    
                    {/* Eixo X: Distância (Km) */}
                    <XAxis 
                        dataKey="distanceKm" 
                        label={{ value: 'Distância (Km)', position: 'bottom', dy: 10 }}
                        tickFormatter={(value) => `${value} km`}
                    />
                    
                    {/* Eixo Y: Elevação (Metros) */}
                    <YAxis 
                        label={{ value: 'Elevação (m)', angle: -90, position: 'left' }}
                        domain={[yDomainMin, yDomainMax]} // Domínio customizado
                    />
                    
                    <Tooltip 
                        labelFormatter={(value) => `Distância: ${value} km`}
                        formatter={(value) => [`${value} m`, 'Elevação']}
                    />
                    
                    <Area 
                        type="monotone" 
                        dataKey="elevationM" 
                        stroke="#0ea5e9" // Tailwind blue-500
                        fill="#0ea5e9" 
                        fillOpacity={0.6}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};