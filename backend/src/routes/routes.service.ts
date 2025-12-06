import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from './entities/route.entity';
import * as fs from 'fs/promises';
import {  
    parseGPXWithCustomParser,
    calculateDistance, 
    calculateElevation,
} from '@we-gold/gpxjs'; // 
import { DOMParser } from 'xmldom-qsa';

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route)
    private routesRepository: Repository<Route>,
  ) {}

  async processGpxFile(filePath: string): Promise<Route> {
    try {
      // 1. LER O ARQUIVO SALVO PELO MULTER
      const fileBuffer = await fs.readFile(filePath);
      
      const gpxData = fileBuffer.toString('utf8')

      const domParserFunction = (txt: string): Document | null =>
        new DOMParser().parseFromString(txt, "text/xml");

      const [parsedGpx, error] = parseGPXWithCustomParser(
        gpxData, 
        domParserFunction
      );
      // 2. PARSEAR E TRATAR ERROS
      // [parsedGpx, error] será inferido. Usamos 'any' para evitar problemas de tipagem
      // já que a classe Gpx não está explicitamente exportada.
      if (error) {
        throw new BadRequestException(`Erro de Parsing GPX: ${error.message}`);
      }
      

      // 3. APLICAR CÁLCULOS
      // Assumimos que parsedGpx é o objeto GPX analisado, que possui o método applyToTrack.
      // TypeScript pode reclamar, mas em runtime funcionará
      
      const dist = parsedGpx.applyToTrack(0, calculateDistance);
      
      
      
      
      // 3. CÁLCULO DE ELEVAÇÃO
      const elev = parsedGpx.applyToTrack(0, calculateElevation);
      
      
      
      // 4. EXTRAIR DADOS E GEOJSON
      const geoJsonGeometry = parsedGpx.toGeoJSON();
      const track = parsedGpx.tracks[0]; // Acessa a primeira track

      

      if (!track) {
         throw new BadRequestException('O arquivo GPX não contém dados de trilha (track).');
      }
      
      // 5. CRIAR A NOVA ENTIDADE COM DADOS CALCULADOS
      const newRoute = this.routesRepository.create({

        name: track.name || 'Nova Rota',
        description: track.comment || null,

        // Usar o resultado do cálculo de distância em Km
        distanceKm: dist.total / 1000,

        // Usar o resultado do cálculo de ganho de elevação
        elevationGainMeters: elev.positive,

        geoJsonGeometry: geoJsonGeometry,

        originalFilePath: filePath, 

      });

      // 6. SALVAR NO DB E LIMPAR O ARQUIVO TEMPORÁRIO
      const savedRoute = await this.routesRepository.save(newRoute);
      //await fs.unlink(filePath); 
      return savedRoute;

    } catch (error) {
      console.log(error)
      // Garantir a exclusão do arquivo em caso de erro
      await fs.unlink(filePath).catch(() => {}
      
    );
      
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      // Captura de erro genérico
      console.error(error);
      throw new InternalServerErrorException('Falha interna no processamento da rota.');
    }
  }

  async findAll(): Promise<Route[]> {
    //  O TypeORM faz a busca sem critérios.
    return this.routesRepository.find({
        // O GeoJSON pode ser grande. Se for para listagem, podemos
        // selecionar apenas colunas leves (como um futuro optimization)
        // Por agora, buscamos tudo.
        order: {
            uploadedAt: "DESC" // Exibe as mais recentes primeiro
        }
    });
  }

  async findOne(id: number): Promise<Route> {
    const route = await this.routesRepository.findOneBy({ id });

    if (!route) {
      // Se não encontrou, lança erro 404
      throw new NotFoundException(`Route with ID ${id} not found.`);
    }
    return route;
  }

  async remove(id: number) {
    const route = await this.routesRepository.findOneBy({ id });
    
    if (!route) {
        throw new NotFoundException(`Route with ID ${id} not found.`);
    }

    // 1. Tentar remover o arquivo GPX do disco
    if (route.originalFilePath) {
        try {
            await fs.unlink(route.originalFilePath);
            console.log(`Arquivo GPX removido do disco: ${route.originalFilePath}`);
        } catch (fileError) {
            console.warn(`Aviso: Não foi possível remover o arquivo GPX do disco em ${route.originalFilePath}.`, fileError);
            // Continua para remover do DB mesmo se o arquivo não for encontrado no disco
        }
    }
    
    // 2. Remover a entrada do DB
    const result = await this.routesRepository.delete(id);

    // ... (restante da verificação do result.affected)
    if (result.affected === 0) {
      throw new NotFoundException(`Route with ID ${id} not found.`);
    }
    return result;
  }
}