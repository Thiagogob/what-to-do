// backend/src/routes/dto/route.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// 1. DTO para o CORPO da Requisição (o arquivo)
// Descreve o corpo da requisição POST /routes/upload
export class RouteUploadDto {
    // 💡 Usa 'type: string' e 'format: binary' para indicar ao Swagger que é um arquivo.
    @ApiProperty({ 
        type: 'string', 
        format: 'binary', 
        description: 'O arquivo GPX a ser enviado. O nome do campo (field name) deve ser: routeFile'
    })
    routeFile: any; 
}


// 2. DTO para a RESPOSTA de Sucesso do Upload
// Descreve a estrutura de dados que o controller retorna após o sucesso.
export class UploadResponseDto {
    @ApiProperty({ example: 'Rota processada e salva com sucesso.' })
    message: string;

    @ApiProperty({ example: 1, description: 'ID da rota salva no banco de dados.' })
    routeId: number;

    @ApiProperty({ example: 'Pedalada Matinal', description: 'O nome atribuído à rota (geralmente do arquivo GPX).' })
    name: string;

    @ApiProperty({ example: 42.195, description: 'Distância total da rota em quilômetros.' })
    distanceKm: number;

    @ApiProperty({ example: 500, description: 'Ganho total de elevação em metros.' })
    elevationGainMeters: number;


}

export class RouteDto {
    @ApiProperty({ example: 1, description: 'ID único da rota.' })
    id: number;

    @ApiProperty({ example: 2, description: 'ID do usuário proprietário da rota.' })
    userId: number;
    
    @ApiProperty({ example: 'Trilha do Parque Central', description: 'Nome da rota extraído do arquivo GPX.' })
    name: string;
    
    @ApiProperty({ example: 'Um passeio leve para começar o dia.', nullable: true, required: false })
    description: string | null;

    @ApiProperty({ example: 5.5, description: 'Distância em quilômetros.' })
    distanceKm: number;

    @ApiProperty({ example: 120, description: 'Ganho de elevação acumulado em metros.' })
    elevationGainMeters: number;

    @ApiProperty({ type: 'object', description: 'Estrutura GeoJSON (GeometryCollection) da rota. Não é uma string, mas o Swagger usa "object".',  additionalProperties: true,}) 
    geoJsonGeometry: object; 

    @ApiProperty({ example: '2023-11-20T10:00:00.000Z', description: 'Data e hora do upload.' })
    uploadedAt: Date;


    
    // O originalFilePath é um dado interno. Omitir na documentação, 
    
}

export class UpdateRouteDto {
  // O nome é o campo que queremos editar
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Pedalada de Domingo', required: false })
  name?: string;

  // Se você quiser permitir a atualização de outros metadados, adicione aqui
}