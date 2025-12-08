import { Controller, Post, UseInterceptors, UploadedFile, HttpException, HttpStatus, UseGuards, Get, Delete, HttpCode, Param, InternalServerErrorException, Res, NotFoundException, Patch, Body, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { RoutesService } from './routes.service';
import type { Response } from 'express';
import { stringifyGPX } from '@we-gold/gpxjs';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

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

const getUploadPath = (): string => {
    // Se NODE_ENV for 'test', usa um diretório temporário do sistema operacional (SO)
    if (process.env.NODE_ENV === 'test') {
        // Ex: /tmp/gpx-storage-test (no Linux)
        return path.join(os.tmpdir(), 'gpx-storage-test'); 
    }
    // Para Produção/Desenvolvimento (Docker)
    return '/usr/src/app/gpx-storage'; 
};

const ABSOLUTE_UPLOAD_DIR = getUploadPath(); 

const storageOptions = diskStorage({
    destination: ABSOLUTE_UPLOAD_DIR, 
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = `${file.fieldname}-${uniqueSuffix}.gpx`;
        cb(null, fileName);
    },
});


@ApiTags('Routes') 
@Controller('routes')
export class RoutesController {
    constructor(private readonly routesService: RoutesService) {}

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

    @UseInterceptors(FileInterceptor('routeFile', { storage: storageOptions }))

    async uploadRoute(@UploadedFile() file: Express.Multer.File,
                      @Req() req: any,): Promise<UploadResponseDto> {
        // file.path contém o caminho PERMANENTE.
        //const absolutePath = path.resolve(file.path);
        console.log('LOG 1: Controller - Requisição de Upload Recebida. Arquivo:', file.filename);

        const userId = req.user.sub;


        const route = await this.routesService.processGpxFile(file.path, userId); 
        
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
    async remove(@Param('id') id: string) {
        // O ID é recebido como string do URL. Converte para number para o TypeORM.
        
        // Chamamos o serviço que fará a exclusão e a verificação do 404
        await this.routesService.remove(parseInt(id, 10));
        
        // Se a exclusão for bem-sucedida, o código 204 será retornado automaticamente
        // (graças ao @HttpCode(HttpStatus.NO_CONTENT) e ao fato de não retornarmos nada aqui).
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
            const gpxData = await fs.readFile(route.originalFilePath); 

            // 3. Configura os headers de resposta
            const fileName = `${route.name.replace(/\s+/g, '_')}_${route.id}.gpx`;
            
            res.setHeader('Content-Type', 'application/gpx+xml');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            
            // 4. Envia o buffer do arquivo (mais eficiente)
            res.send(gpxData);
            
        } catch (error) {
            // Se o arquivo não puder ser lido (ex: foi movido ou deletado manualmente)
            console.error(`Falha ao ler o arquivo: ${route.originalFilePath}`, error);
            throw new InternalServerErrorException('Falha ao ler o arquivo GPX no disco.');
        }
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    async updateRoute(
    @Param('id') id: string,
    @Body() updateRouteDto: UpdateRouteDto,
    @Req() req: any,
    ) {
        const userId = req.user.sub;
    
        // O service deve garantir que a rota pertence ao usuário
        const updatedRoute = await this.routesService.update(
        +id, // Converte a string do ID para número
        userId,
        updateRouteDto,
        );
    
        return updatedRoute;
    }








}