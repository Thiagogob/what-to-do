import { Body, Controller, Get, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuthPayloadDto, AuthResponseDto, UserStatusDto } from './dto/auth.dto';
import { AuthService } from './auth.service';
import { LocalGuard } from './guards/local.guard';
import type { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt.guard';

import { 
    ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth 
} from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalGuard)
  @ApiOperation({ summary: 'Autentica um usuário com credenciais e retorna um Token JWT.' })
  @ApiBody({ type: AuthPayloadDto, description: 'Credenciais de login (username e password).' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, // Geralmente 201 ou 200
    description: 'Login bem-sucedido. Retorna o Token JWT.',
    type: AuthResponseDto // DTO para a resposta de sucesso
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Não autorizado (Credenciais inválidas: username ou password).' 
  })
  login(@Req() req: Request) {
    return this.authService.login(req.user);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  // 💡 Documentação do Swagger para Status
  @ApiBearerAuth('jwt') // Indica que esta rota requer o token Bearer
  @ApiOperation({ summary: 'Verifica a validade do Token JWT e retorna o payload do usuário logado.' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Token válido. Retorna os dados do usuário (payload do token).',
    type: UserStatusDto // DTO para a resposta de status do usuário
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Não autorizado (Token JWT ausente ou inválido).' 
  })
  status(@Req() req: Request) {
    console.log('Inside AuthController status method');
    console.log(req.user);
    return req.user; // Retorna o payload do usuário contido no token
  }
}