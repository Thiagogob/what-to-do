import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Or } from 'typeorm';
import { Route } from './entities/route.entity';
import * as fs from 'fs/promises';
import { GcsService } from '../gcs/gcs.service'; // <-- Novo Import

import {  
    parseGPXWithCustomParser,
    calculateDistance, 
    calculateElevation,
} from '@we-gold/gpxjs'; // 
import { DOMParser } from 'xmldom-qsa';
import { RoutePhoto } from './entities/route-photo.entity';
//import path from 'path';
import * as path from 'path';

interface UpdateRouteDto {
    name?: string;
    // ... outros campos que você possa querer editar
}


@Injectable()
export class RoutesService {

  constructor(
    @InjectRepository(Route)
    private routesRepository: Repository<Route>,

    @InjectRepository(RoutePhoto) 
    private photosRepository: Repository<RoutePhoto>,
  ) {}

  async processGpxFile(file: Express.Multer.File, userId: number, gcsService: GcsService): Promise<Route> {

    const filePath = file.path; // Não é mais o caminho local, mas vamos reusar a variável para o caminho do GCS

    // 1. FAZER UPLOAD DO ARQUIVO GPX PARA O GCS
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const destinationPath = `gpx/${userId}/${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;
    
    // O Multer em memória fornece o buffer (file.buffer)
    const publicUrl = await gcsService.uploadFile(
        file.buffer, 
        destinationPath,
        file.mimetype,
    );
    
    // filePath agora será o caminho do GCS (destinationPath)
    const gpxFilePathGCS = destinationPath;

    try {
      // 1. LER O ARQUIVO SALVO PELO MULTER
      console.log('LOG 2: Service - Iniciando Parsing do Buffer GPX.');

      const gpxData = file.buffer.toString('utf8');

      console.log('LOG 3: Service - Leitura Concluída. Iniciando Parsing.');

      //const gpxData = fileBuffer.toString('utf8')

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

        originalFilePath: gpxFilePathGCS, 

        userId: userId,

        photos: []

      });

      // 6. SALVAR NO DB E LIMPAR O ARQUIVO TEMPORÁRIO
      console.log('LOG 4: Service - Parsing e Cálculos Concluídos. Iniciando DB Save.');
      const savedRoute = await this.routesRepository.save(newRoute);
      console.log('LOG 4.5: Service - DB Save Concluído.')
      
      //await fs.unlink(filePath); 
      return savedRoute;

} catch (error) {
        console.log(error);
        // Não é mais necessário o fs.unlink(filePath) aqui! O GCS não usa caminhos locais.
        // Se houver um erro de parsing, você pode deletar o arquivo do GCS:
        await gcsService.deleteFile(gpxFilePathGCS).catch(() => {});
        
        if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
            throw error;
        }
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
    const route = await this.routesRepository.findOne({ 
      where: {id}, 
      relations: ['photos']
    });

    if (!route) {
      // Se não encontrou, lança erro 404
      throw new NotFoundException(`Route with ID ${id} not found.`);
    }
    return route;
  }

  async remove(id: number, userId: number, gcsService: GcsService) {
    const route = await this.routesRepository.findOneBy({ id });
    
    if (!route) {
        throw new NotFoundException(`Route with ID ${id} not found.`);
    }

    if (route.userId !== null && route.userId !== userId) {
         throw new NotFoundException(`Rota com ID ${id} não encontrada.`); // 404 por segurança
    }

    // 1. Tentar remover o arquivo GPX do disco
    if (route.originalFilePath) {
        try {
            await gcsService.deleteFile(route.originalFilePath);
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


async update(id: number, userId: number, updateDto: UpdateRouteDto): Promise<Route> {
    

   const routeToUpdate = await this.routesRepository.findOne({
        where: { id },
        relations: ['photos'], // 
    });

 
    if (!routeToUpdate) {
        throw new NotFoundException(`Rota com ID ${id} não encontrada.`);
    }

   
    if (routeToUpdate.userId !== null && routeToUpdate.userId !== userId) {
         throw new NotFoundException(`Rota com ID ${id} não encontrada.`); // Lançar 404 por segurança
    }

    // Se passou na checagem OU se routeToUpdate.userId é NULL, continue.
    if (!routeToUpdate.photos) {
        routeToUpdate.photos = [];
    }
    // 2. Aplica as atualizações do DTO
    if (updateDto.name !== undefined) {
        routeToUpdate.name = updateDto.name;
    }

    // 3. Salva no banco de dados
    return this.routesRepository.save(routeToUpdate);
}


async saveRoutePhotos(
  routeId: number, 
  
  userId: number,

  files: Express.Multer.File[],

  gcsService: GcsService
): Promise<RoutePhoto[]> {
  console.log("LOG: saveRoutePhotos chamado, mas sem arquivos.");
    if (!files || files.length === 0) {
        return [];
    }
    const savedPhotos: RoutePhoto[] = [];
    
    // 1. Iterar sobre todos os arquivos
    for (const file of files) {
        // Gera um nome único e um caminho de destino dentro do bucket
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        // Exemplo de caminho no GCS: 'photos/123/photo-17000000.jpg'
        const destinationPath = `photos/${userId}/${file.fieldname}-${uniqueSuffix}${ext}`; 

        try {
            // 2. FAZ O UPLOAD PARA O GCS usando o buffer (file.buffer)
            const publicUrl = await gcsService.uploadFile(
                file.buffer, // O Multer em memória fornece o buffer
                destinationPath,
                file.mimetype,
            );

            // 3. CRIA E SALVA A ENTIDADE DE FOTO NO DB
            const photoEntity = this.photosRepository.create({
                route: { id: routeId } as Route,
                filePath: destinationPath, // Salva o caminho do GCS (não é mais o local disk path)
                url: publicUrl, // Salva o URL público completo para fácil acesso
                order: 0,
            });

            const savedPhoto = await this.photosRepository.save(photoEntity);
            savedPhotos.push(savedPhoto);

        } catch (error) {
            console.error(`Falha ao fazer upload da foto ${file.originalname} para o GCS:`, error);
            // Continua para o próximo arquivo se um falhar, ou lança um erro, dependendo da sua regra de negócio
        }
    }

    return savedPhotos;
}

async removePhoto(photoId: number, userId: number, gcsService: GcsService): Promise<void> {
        
        // 1. Encontrar a foto e carregar a rota e o proprietário da rota associada
        const photo = await this.photosRepository.findOne({
            where: { id: photoId },
            // Carrega a relação 'route' e a relação 'user' dentro da rota
            relations: ['route', 'route.user'], 
        });

        if (!photo) {
            throw new NotFoundException(`Foto com ID ${photoId} não encontrada.`);
        }
        
        // 2. VERIFICAÇÃO DE PROPRIEDADE
        const routeOwnerId = photo.route.user.id;
        
        if (routeOwnerId !== userId) {
            // Se o ID do proprietário da rota for diferente do usuário logado
            throw new ForbiddenException('Você não tem permissão para deletar esta foto.');
        }

        // 3. DELEÇÃO FÍSICA DO ARQUIVO
        const filePathToDelete = photo.filePath; // O caminho absoluto que o Multer salvou
        
try {
        // Chamada para o GCS Service para deletar o arquivo do Bucket
        await gcsService.deleteFile(filePathToDelete); // <-- NOVO MÉTODO
        console.log(`LOG: Arquivo deletado do GCS: ${filePathToDelete}`);
    } catch (error) {
        // Tratamento de erro do GCS (ex: arquivo não encontrado)
        if (error.code !== 404) { // 404 é File not found no GCS API
            console.error(`Falha ao deletar o arquivo GCS ${filePathToDelete}:`, error);
        }
    }

        // 4. DELEÇÃO DO REGISTRO NO BANCO DE DADOS
        await this.photosRepository.delete(photoId);

        console.log(`LOG: Registro de foto ID ${photoId} deletado do banco de dados.`);
    }

}