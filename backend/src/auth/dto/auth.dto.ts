import { ApiProperty } from '@nestjs/swagger';


export class AuthPayloadDto {

  @ApiProperty({ example: 'usuario_teste', description: 'Nome de usuário para login.', required: true })
  username: string;

  @ApiProperty({ example: 'senha123', description: 'Senha do usuário.', required: true })
  password: string;

}

// DTO para a resposta de sucesso do LOGIN (retorna o Token JWT)
export class AuthResponseDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'Token JWT para acesso autenticado à API. Deve ser incluído no header Authorization como Bearer Token.' })
    accessToken: string;
}

// DTO para a resposta de STATUS (retorna o payload do usuário)
// Usado na rota GET /auth/status
export class UserStatusDto {
    @ApiProperty({ example: 1, description: 'ID único do usuário.' })
    id: number;

    @ApiProperty({ example: 'usuario_teste', description: 'Nome de usuário.' })
    username: string;
    
    // Você pode adicionar outras propriedades do seu payload JWT aqui, se houverem.
}