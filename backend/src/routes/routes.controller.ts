import { Controller, Post, UseInterceptors, UploadedFile, HttpException, HttpStatus, UseGuards, Get, Delete, HttpCode, Param, InternalServerErrorException, Res, NotFoundException, Patch, Body, Req, UploadedFiles } from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { RoutesService } from './routes.service';
import type { Response } from 'express';
import { stringifyGPX } from '@we-gold/gpxjs';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { GcsService } from '../gcs/gcs.service';
import { 
    ApiTags, ApiOperation, ApiResponse, 
    ApiConsumes, ApiBody, ApiParam, ApiOkResponse,
    ApiNoContentResponse, ApiNotFoundResponse, ApiBearerAuth, 
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt.guard'; // Use seu JwtGuard

import { 
    RouteUploadDto, 
    UploadResponseDto, 
    RouteDto,
    UpdateRouteDto 
} from './dto/route.dto';

//const getUploadPath = (): string => {
//    // Se NODE_ENV for 'test', usa um diretório temporário do sistema operacional (SO)
//    if (process.env.NODE_ENV === 'test') {
//        // Ex: /tmp/gpx-storage-test (no Linux)
//        return path.join(os.tmpdir(), 'gpx-storage-test'); 
//    }
//    // Para Produção/Desenvolvimento (Docker)
//    return '/usr/src/app/gpx-storage'; 
//};

const getPhotoUploadPath = (): string => {
    // Se NODE_ENV for 'test', usa um diretório temporário do sistema operacional (SO)
    if (process.env.NODE_ENV === 'test') {
        // Ex: /tmp/gpx-storage-test (no Linux)
        return path.join(os.tmpdir(), 'photo-storage-test'); 
    }
    // Para Produção/Desenvolvimento (Docker)
    return '/usr/src/app/photo-storage'; 
};

//const ABSOLUTE_UPLOAD_DIR = getUploadPath(); 

const PHOTO_UPLOAD_DIR = getPhotoUploadPath();

//const storageOptions = diskStorage({
//    destination: ABSOLUTE_UPLOAD_DIR, 
//    filename: (req, file, cb) => {
//        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//        const fileName = `${file.fieldname}-${uniqueSuffix}.gpx`;
//        cb(null, fileName);
//    },
//});

//const photoStorageOptions = diskStorage({
//    destination: PHOTO_UPLOAD_DIR, 
//    filename: (req, file, cb) => {
//        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//        // Garante que a extensão original seja mantida (ex: .jpg, .png)
//        const ext = path.extname(file.originalname);
//        const fileName = `${file.fieldname}-${uniqueSuffix}${ext}`;
//        cb(null, fileName);
//    },
//});

//const photoStorageOptions = { storage: memoryStorage() };

const gpxStorageOptions = { storage: memoryStorage() };

@ApiTags('Routes') 
@Controller('routes')
export class RoutesController {
    constructor(
        private readonly routesService: RoutesService,
        private readonly gcsService: GcsService,
    ) {}

    // Rota: POST /routes/upload
    // @UseGuards(JwtAuthGuard) // 
@UseGuards(JwtAuthGuard)
@Post('upload')
    @ApiBearerAuth('jwt')
    @ApiOperation({ summary: 'Faz o upload, processamento e salvamento de um arquivo GPX.' })

    @ApiConsumes('multipart/form-data') // Indica que o corpo é um formulário de arquivo

    @ApiBody({
        description: 'Upload de arquivo GPX (Field name: routeFile)',
        type: RouteUploadDto, // DTO para descrever o campo de arquivo
    })

    @ApiResponse({ 
        status: 201, 
        description: 'Rota processada e salva com sucesso.', 
        type: UploadResponseDto // DTO para a resposta de sucesso
    })

    @ApiResponse({ status: 400, description: 'Requisição inválida (Erro de parsing GPX ou dados insuficientes).' })

    @ApiResponse({ status: 500, description: 'Falha interna no processamento da rota.' })

    @UseInterceptors(FileInterceptor('routeFile', gpxStorageOptions))

    async uploadRoute(@UploadedFile() file: Express.Multer.File,
                      @Req() req: any,): Promise<UploadResponseDto> {
        // file.path contém o caminho PERMANENTE.
        //const absolutePath = path.resolve(file.path);
        console.log('LOG 1: Controller - Requisição de Upload Recebida. Arquivo:', file.filename);

        const userId = req.user.sub;


        const route = await this.routesService.processGpxFile(file, userId, this.gcsService); 
        
        console.log('LOG 5: Controller - Processamento Completo. Retornando resposta.');

        return {
            message: 'Rota processada e salva com sucesso.',
            routeId: route.id,
            name: route.name,
            distanceKm: route.distanceKm,
            elevationGainMeters: route.elevationGainMeters

        };
    }

    @Get()
    @ApiOperation({ summary: 'Retorna a lista de todas as rotas salvas.' })
    @ApiOkResponse({ 
        description: 'Lista de rotas recuperadas com sucesso.', 
        type: [RouteDto] // Usa o RouteDto dentro de um array
    })
    
    async findAll() {
        // 💡 Chama o serviço para buscar todas as rotas
        return this.routesService.findAll();
    }







    // Rota: GET /routes/:id
    @UseGuards(JwtAuthGuard) 
    @Get(':id')
    @ApiBearerAuth('jwt')
    @ApiOperation({ summary: 'Busca e retorna os detalhes de uma rota específica pelo ID.' })
    @ApiParam({ name: 'id', description: 'ID da rota a ser consultada.', example: 1 })
    @ApiOkResponse({ 
        description: 'Rota recuperada com sucesso.', 
        type: RouteDto 
    })
    @ApiNotFoundResponse({ description: 'Rota com o ID especificado não foi encontrada.' })
    async findOne(@Param('id') id: string) {
        return this.routesService.findOne(parseInt(id, 10));
    }






    @UseGuards(JwtAuthGuard) // 💡 Proteja esta rota com seu JwtGuard
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT) // Retorna 204 No Content em caso de sucesso
    @ApiBearerAuth('jwt')

    @ApiOperation({ summary: 'Remove uma rota e seu arquivo GPX original pelo ID.' })

    @ApiParam({ name: 'id', description: 'ID da rota a ser removida.', example: 1 })

    @ApiNoContentResponse({ description: 'Rota removida com sucesso. (Retorna 204 No Content)' })

    @ApiNotFoundResponse({ description: 'Rota com o ID especificado não foi encontrada.' })
async remove(
        @Param('id') id: string,
        @Req() req: any, // ⬅️ Para obter o ID do usuário
    ) {
        const userId = req.user.sub;
        
        // 1. Chama o Service, que verifica a propriedade
        await this.routesService.remove(+id, userId, this.gcsService); 
        // Retorna 204 (implícito pelo @HttpCode)
    }








   @UseGuards(JwtAuthGuard)
   @Get('download/:id')
   @ApiBearerAuth('jwt')
   @ApiOperation({ summary: 'Faz o download do arquivo GPX original da rota pelo ID.' })
   @ApiParam({ name: 'id', description: 'ID da rota para download.', example: 1 })
   @ApiOkResponse({ 
        description: 'Download do arquivo GPX realizado com sucesso.', 
        content: { 'application/gpx+xml': {} } // Indica o tipo de conteúdo (arquivo)
   })
   @ApiNotFoundResponse({ description: 'Rota não encontrada ou arquivo original não cadastrado/encontrado.' })
   @ApiResponse({ status: 500, description: 'Falha ao ler o arquivo GPX no disco.' })
    async downloadGpx(@Param('id') id: string, @Res() res: Response) {
        const routeId = parseInt(id, 10);
        
        // 1. Busca a rota (obtemos o originalFilePath)
        const route = await this.routesService.findOne(routeId);


        if (!route.originalFilePath) {
            throw new NotFoundException('O caminho do arquivo GPX original não foi encontrado no DB.');
        }

        try {
            // 2. LÊ O ARQUIVO GPX ORIGINAL DO DISCO
        const gpxBuffer = await this.gcsService.downloadFileAsBuffer(route.originalFilePath); 

        // ⬇️ GCS: Configura os headers de resposta
        const fileName = `${route.name.replace(/\s+/g, '_')}_${route.id}.gpx`;
        
        res.setHeader('Content-Type', 'application/gpx+xml');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        
        res.send(gpxBuffer);
            
        } catch (error) {
            // Se o arquivo não puder ser lido (ex: foi movido ou deletado manualmente)
            console.error(`Falha ao ler o arquivo: ${route.originalFilePath}`, error);
            throw new InternalServerErrorException('Falha ao ler o arquivo GPX no disco.');
        }
    }

   @UseGuards(JwtAuthGuard)
    @Patch(':id')
    @ApiBearerAuth('jwt')
    @ApiOperation({ summary: 'Atualiza o nome da rota e/ou adiciona novas fotos à rota.' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: UpdateRouteDto }) // O DTO agora representa os campos de dados
    //@UseInterceptors(
    //    FileFieldsInterceptor([
    //        // A chave 'photos' deve ser usada no frontend para o FormData
    //        { name: 'photos', maxCount: 5 }, 
    //    ], {
    //        // Usar as opções de armazenamento de fotos que definimos
    //        storage: photoStorageOptions 
    //    })
    //)
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'photos', maxCount: 5 }, 
        ], {
            storage: memoryStorage()
        }) // 
    )
    async updateRoute(
        @Param('id') id: string,
        // O @Body() extrai os campos de texto (como 'name') do multipart/form-data
        @Body() updateRouteDto: UpdateRouteDto, 
        // O @UploadedFiles() extrai os arquivos da requisição
        @UploadedFiles() files: { photos?: Express.Multer.File[] },
        @Req() req: any,
    ) {
        const routeId = +id;
        const userId = req.user.sub;
        
        // ⬅️ CORREÇÃO DE SEGURANÇA: Usa encadeamento opcional para evitar 'TypeError'
        const photos = files?.photos || []; 

        // ----------------------------------------------------
        // 1. ATUALIZAR DADOS E GARANTIR PROPRIEDADE (Service)
        // O Service verifica se a rota existe e se pertence ao usuário antes de atualizar o 'name'.
        // ----------------------------------------------------
        const updatedRoute = await this.routesService.update(
            routeId,
            userId,
            updateRouteDto, // Contém apenas o campo { name: '...' }
        );

        // ----------------------------------------------------
        // 2. SALVAR AS FOTOS (Service)
        // ----------------------------------------------------
        console.log("LOG: Iniciando PATCH. Files recebidos:", files); // ⬅️ IMPORTANTE
        console.log("LOG: Quantidade de fotos:", photos.length);
        if (photos.length > 0) {
            // O service salvará os metadados de cada foto no DB
            await this.routesService.saveRoutePhotos(routeId, userId, photos, this.gcsService);
        }

        // Retorna a rota atualizada (o Service pode retornar a rota com as fotos carregadas)
        return updatedRoute;
    }

    @UseGuards(JwtAuthGuard)
    @Delete('photos/:photoId') // ⬅️ Nova rota DELETE
    @HttpCode(HttpStatus.NO_CONTENT) // Retorna 204 No Content em caso de sucesso
    @ApiBearerAuth('jwt')
    @ApiOperation({ summary: 'Remove uma foto da rota pelo ID. Somente o proprietário da rota pode fazer isso.' })
    @ApiParam({ name: 'photoId', description: 'ID da foto a ser removida.', example: 5 })
    @ApiNoContentResponse({ description: 'Foto removida com sucesso. (Retorna 204 No Content)' })
    @ApiNotFoundResponse({ description: 'Foto com o ID especificado não foi encontrada.' })
    @ApiResponse({ status: 403, description: 'Proibido. O usuário não é o proprietário da foto/rota.' })
    async removePhoto(
    @Param('photoId') photoId: string,
    @Req() req: any,
    ) {
        const userId = req.user.sub;
    
        // 1. Chama o Service para executar a deleção e verificação de propriedade
        await this.routesService.removePhoto(+photoId, userId, this.gcsService); 
    
        // Retorna 204 No Content
    }


}








