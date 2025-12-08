import { useMemo } from 'react';
import type { Feature, FeatureCollection, LineString } from 'geojson';

// Define o formato de dados esperado pelo Recharts
interface ElevationPoint {
    distanceKm: number; // Distância acumulada do início
    elevationM: number; // Elevação em metros
}

// Função utilitária para calcular a distância entre dois pontos (Haversine)
// ⚠️ Nota: Esta é uma função simplificada; dependendo da precisão, você pode usar uma biblioteca como 'turf/distance'
const getDistanceKm = (
  coord1: [number, number, number], 
  coord2: [number, number, number]
): number => {
    const R = 6371; // Raio da Terra em km
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;

    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};


export const useElevationProfile = (geoJson: Feature | FeatureCollection): ElevationPoint[] => {
    return useMemo(() => {
        if (!geoJson || geoJson.type !== 'FeatureCollection' || geoJson.features.length === 0) {
            return [];
        }

        const lineStringFeature = geoJson.features.find(f => f.geometry.type === 'LineString');

        if (!lineStringFeature || lineStringFeature.geometry.type !== 'LineString') {
            return [];
        }
        
        const coordinates = lineStringFeature.geometry.coordinates as [number, number, number][];
        
        let cumulativeDistance = 0;
        const profileData: ElevationPoint[] = [];
        
        coordinates.forEach((coord, index) => {
            const [lon, lat, ele] = coord;
            
            // Calcula a distância do ponto anterior
            if (index > 0) {
                const prevCoord = coordinates[index - 1];
                cumulativeDistance += getDistanceKm(prevCoord, coord);
            }
            
            profileData.push({
                // Arredonda a distância para evitar números longos
                distanceKm: parseFloat(cumulativeDistance.toFixed(2)), 
                elevationM: Math.round(ele),
            });
        });

        return profileData;

    }, [geoJson]);
};