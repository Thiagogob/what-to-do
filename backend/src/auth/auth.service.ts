import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthPayloadDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt'; 

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService, // Injetado do UserModule
    private jwtService: JwtService,
  ) {}

  // Método para buscar no DB e validar a senha
  async validateUser(username: string, pass: string): Promise<any> {
    //Busca o usuário no PostgreSQL
    const user = await this.userService.findOneByUsername(username);

    //Compara a senha com o hash armazenado
    if (user && user.password) {
      const isMatch = await bcrypt.compare(pass, user.password);

      if (isMatch) {
        // Senha válida! Remove a senha hasheada do objeto antes de injetar no req.user
        const { password, ...result } = user;
        return result; 
      }
    }
    
    // Se o usuário não existe ou a senha é inválida
    return null; 
  }

  // Método para gerar o JWT (usado no Controller APÓS a validação)
  async login(user: any) {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}