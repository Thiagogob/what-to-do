import { Controller, Post, Body, HttpCode, HttpStatus, ClassSerializerInterceptor, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UserResponseDto } from './dto/create-user.dto';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger'; // Importe o DTO de resposta

@ApiTags('User') // 💡 Tag para agrupar as rotas
@Controller('users') // Rota base: /users
@UseInterceptors(ClassSerializerInterceptor) // Limpa o objeto User (esconde a senha)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register') // Rota final: POST /users/register
  @HttpCode(HttpStatus.CREATED) // Retorna 201 Created
  
  // 💡 Documentação do Swagger:
  @ApiOperation({ summary: 'Registra um novo usuário com username e password.' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ 
      status: HttpStatus.CREATED, 
      description: 'Usuário criado com sucesso.', 
      type: UserResponseDto // DTO de resposta sem a senha
  })
  @ApiResponse({ 
      status: HttpStatus.BAD_REQUEST, 
      description: 'Requisição inválida (campos faltando ou senha fraca).' 
  })
  @ApiResponse({ 
      status: HttpStatus.CONFLICT, 
      description: 'Nome de usuário já existe.' 
  })
  async register(@Body() createUserDto: CreateUserDto) {
    const user = await this.userService.create(
      createUserDto.username,
      createUserDto.password,
    );
    
    
    // O ClassSerializerInterceptor (acima) garantirá que a senha hasheada não seja retornada
    return user; 
  }
}