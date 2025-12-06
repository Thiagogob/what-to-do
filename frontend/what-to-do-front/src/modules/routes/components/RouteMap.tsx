// src/modules/routes/components/RouteMap.tsx

import React, { useRef, useEffect, useMemo } from 'react';
import mapboxgl, { Map, LngLatBounds } from "mapbox-gl";
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Feature, FeatureCollection } from 'geojson';
import bbox from '@turf/bbox'; 

// O token deve ser definido uma vez.
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''; 

interface RouteMapProps {
  geoJson: Feature | FeatureCollection; 
}

export const RouteMap: React.FC<RouteMapProps> = ({ geoJson }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null); 
  const mapInstanceRef = useRef<Map | null>(null); // Ref para segurar a instância do mapa

  const MAPBOX_TOKEN = mapboxgl.accessToken;

  // 1. Lógica para Calcular Limites (Bounds)
  const bounds = useMemo(() => {
    if (geoJson && geoJson.type) {
        // Calcula o limite [minLng, minLat, maxLng, maxLat]
        return bbox(geoJson);
    }
    return null;
  }, [geoJson]);


  // 2. Efeito de Inicialização (Equivalente ao seu código na foto)
  useEffect(() => {
    // Se a instância já existe ou a ref não está anexada, pare.
    // Se a ref do container não estiver pronta, saia.
    if (!mapContainerRef.current) return;

    // Se o mapa JÁ existe, não o crie novamente, mas garanta que ele seja removido
    // quando o componente desmontar.
    if (mapInstanceRef.current) return;

    if (!MAPBOX_TOKEN) {
      console.error("ERRO: Mapbox Token não está configurado.");
      return;
    }

    // Cria a instância do mapa
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11', // Tente um estilo diferente se falhar (light-v10)
      center: [-73.98, 40.73], // Coordenadas padrão
      zoom: 10,
      accessToken: MAPBOX_TOKEN,
    });

    mapInstanceRef.current = map;

    // Limpeza: Remove a instância do mapa ao desmontar
    return () => {
      map.remove();
      mapInstanceRef.current = null; // Limpa a referência
    };
    
  }, [MAPBOX_TOKEN]); 


  // 3. Efeito de Carregamento de Dados (Correção de Timing)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !geoJson || !bounds) return;

    // Função para adicionar a Source, Layer e fazer o FitBounds
    const addRoute = () => {
      
      // Limpeza para evitar erros em Hot-Reload
      if (map.getSource('route-data')) {
          map.removeLayer('route-line');
          map.removeSource('route-data');
      }

      // 3.1. Adicionar a Fonte de Dados
      map.addSource('route-data', {
          type: 'geojson',
          data: geoJson,
      });

      // 3.2. Adicionar a Camada (Estilo da Linha)
      map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-data',
          paint: {
              'line-color': '#3b82f6', 
              'line-width': 4,
          }
      });

      // 3.3. Ajustar a visualização para caber a rota
      const [minLng, minLat, maxLng, maxLat] = bounds;
      
      const boundsObject = new LngLatBounds(
        [minLng, minLat] as mapboxgl.LngLatLike, 
        [maxLng, maxLat] as mapboxgl.LngLatLike
      );

      map.fitBounds(boundsObject, {
          padding: 50, 
          duration: 1500,
      });
    };
    
    // CRÍTICO: Garante que o estilo base esteja pronto antes de adicionar a rota
    if (map.isStyleLoaded()) {
        addRoute();
    } else {
        // Usa map.once para garantir que o listener seja executado apenas uma vez
        map.once('style.load', addRoute);
    }
    
    // Limpeza de listener
    return () => {
        map.off('style.load', addRoute);
    };

  }, [geoJson, bounds]); // Depende do GeoJSON e do Bounds

  // 4. Renderização (Seu código da foto)
  return (
    <div className="relative">
      <div 
        ref={mapContainerRef} 
        style={{ width: '100%', height: '500px' }} 
        className="map-container" 
      />
    </div>
  );
};