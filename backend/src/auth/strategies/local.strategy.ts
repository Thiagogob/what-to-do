import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      // Configure o campo que você espera no body (ex: 'username')
      usernameField: 'username', 
      passwordField: 'password',
    });
  }

  
  async validate(username: string, password: string): Promise<any> {
    // Chama o serviço para buscar no DB e validar a senha
    const user = await this.authService.validateUser(username, password); 

    // O AuthService já deve lançar a exceção ou retornar null/undefined se falhar
    if (!user) {
      // Se a validação falhar (usuário não existe ou senha errada)
      throw new UnauthorizedException('Credenciais inválidas.'); 
    }
    
    // Retorna o objeto do usuário (sem a senha, que será injetado no req.user)
    return user; 
  }
}