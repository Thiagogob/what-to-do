// auth/strategies/jwt.strategy.ts (Versão Corrigida)

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
// 💡 Importar o ConfigService
import { ConfigService } from '@nestjs/config'; 

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // 💡 Injetar ConfigService no construtor
  constructor(private configService: ConfigService) { 
    const secret = configService.get<string>('JWT_SECRET');

    console.log(`[JWT Strategy] Chave Secreta Carregada: ${secret}`);
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // 💡 CARREGA A CHAVE SECRETA DO ENV
      secretOrKey: configService.get<string>('JWT_SECRET')!, 
    });
  }

  validate(payload: any) {
    console.log('Inside JWT Strategy Validate');
    console.log(payload);
    
    // 💡 IMPORTANTE: Você pode adicionar lógica aqui para buscar o usuário no DB 
    // com base no payload, mas para um teste básico, retornar o payload funciona.
    return payload; 
  }
}