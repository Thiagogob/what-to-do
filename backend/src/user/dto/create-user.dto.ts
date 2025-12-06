import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Instale as dependências: npm i class-validator class-transformer
export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'usuario_teste', description: 'Nome de usuário único para registro.', required: true })
  username: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  @ApiProperty({ example: 'senha123', description: 'Senha forte do usuário.', required: true })
  password: string;

}

export class UserResponseDto {
    @ApiProperty({ example: 1, description: 'ID único do usuário.' })
    id: number;

    @ApiProperty({ example: 'novo_usuario', description: 'Nome de usuário criado.' })
    username: string;
    
    // Assumimos que a entidade User tem um campo de data de criação
    @ApiProperty({ example: '2025-12-04T11:00:00.000Z', description: 'Data de criação do usuário.' })
    createdAt: Date; 
    
    // Nota: O campo 'password' é omitido, pois é limpo pelo ClassSerializerInterceptor
}