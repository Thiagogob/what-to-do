import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Or } from 'typeorm';
import { Route } from './entities/route.entity';
import * as fs from 'fs/promises';

import {  
    parseGPXWithCustomParser,
    calculateDistance, 
    calculateElevation,
} from '@we-gold/gpxjs'; // 
import { DOMParser } from 'xmldom-qsa';
import { RoutePhoto } from './entities/route-photo.entity';
import path from 'path';


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

  async processGpxFile(filePath: string, userId: number): Promise<Route> {
    try {
      // 1. LER O ARQUIVO SALVO PELO MULTER
      console.log('LOG 2: Service - Iniciando Leitura do Arquivo:', filePath);

      const fileBuffer = await fs.readFile(filePath);

      console.log('LOG 3: Service - Leitura Concluída. Iniciando Parsing.');

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

  async remove(id: number, userId: number) {
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


async update(id: number, userId: number, updateDto: UpdateRouteDto): Promise<Route> {
    
    // Opção 1: Usando Array OR para buscar
    //const route = await this.routesRepository.findOne({
    //    where: [
    //        // Critério 1: Rota pertence ao usuário logado
    //        { id, userId }, 
    //        // Critério 2 (temporário): Rota sem dono (NULL) *OU* se o usuário é admin.
    //        // Para simplificar, vamos usar uma consulta mais explícita:
    //    ],
    //});

    // ⬅️ SOLUÇÃO MAIS SEGURA E EXPLÍCITA: FindOne e depois checagem
   const routeToUpdate = await this.routesRepository.findOne({
        where: { id },
        relations: ['photos'], // ⬅️ CORREÇÃO CRÍTICA: Força o TypeORM a carregar 'photos'
    });

 
    if (!routeToUpdate) {
        throw new NotFoundException(`Rota com ID ${id} não encontrada.`);
    }

    // ⬅️ NOVA CHECAGEM: Verifica se o usuário logado é o proprietário (ou se a rota é pública/antiga)
    // Se a rota tem um dono E o dono não é o usuário logado, LANÇA ERRO.
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


async saveRoutePhotos(routeId: number, files: Express.Multer.File[]): Promise<RoutePhoto[]> {
  console.log("LOG: saveRoutePhotos chamado, mas sem arquivos.");
    if (!files || files.length === 0) {
        return [];
    }
    console.log(`LOG: Salvando ${files.length} arquivos. Primeiro caminho: ${files[0].path}`); // ⬅️ IMPORTANTE
    // 1. Mapear os arquivos para entidades de foto
    const photoEntities = files.map(file => {
        return this.photosRepository.create({
            // ⬅️ Remova routeId daqui e use a propriedade de relação (passo 2)
            // routeId: routeId, 
            
            // ⬅️ ADICIONE A RELAÇÃO COMPLETA:
            route: { id: routeId } as Route, 

            filePath: file.path,
            url: `/api/routes/photos/${path.basename(file.filename || file.path)}`,
            order: 0,
        });
    });
    console.log("LOG: Persistência concluída.");
    // 2. Salva as novas entidades de foto
    return this.photosRepository.save(photoEntities);
}

async removePhoto(photoId: number, userId: number): Promise<void> {
        
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
            await fs.unlink(filePathToDelete);
            console.log(`LOG: Arquivo deletado fisicamente: ${filePathToDelete}`);
        } catch (error) {
            // É comum o arquivo já ter sido deletado (ex: teste ou erro manual).
            // Se o erro indicar que o arquivo não existe, ignoramos para prosseguir com o DB.
            if (error.code !== 'ENOENT') { // ENOENT = File not found
                console.error(`Falha ao deletar o arquivo físico ${filePathToDelete}:`, error);
                // Opcional: Lançar um erro se a falha for grave
                // throw new InternalServerErrorException('Falha ao deletar arquivo no disco.');
            }
        }

        // 4. DELEÇÃO DO REGISTRO NO BANCO DE DADOS
        await this.photosRepository.delete(photoId);

        console.log(`LOG: Registro de foto ID ${photoId} deletado do banco de dados.`);
    }

}