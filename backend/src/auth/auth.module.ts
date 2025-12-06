import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalGuard } from './guards/local.guard';
import { UserModule } from 'src/user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule], // Importa o ConfigModule para usar o ConfigService
      useFactory: async (configService: ConfigService) => ({
        // Carrega o valor de JWT_SECRET do arquivo .env
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { 
          // Você pode definir o tempo de expiração no .env também, mas 1h é um bom padrão
          expiresIn: '12h' 
        },
      }),
      inject: [ConfigService], // Diz ao NestJS para injetar o ConfigService no useFactory
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalGuard, LocalStrategy, JwtStrategy],
  exports: [AuthService]
})
export class AuthModule {}