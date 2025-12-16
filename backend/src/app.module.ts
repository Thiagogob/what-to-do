// backend/src/app.module.ts

import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { RoutesModule } from './routes/routes.module';
import { join } from 'path';
import { ALL_ENTITIES } from './typeorm.entities';
import { GcsModule } from './gcs/gcs.module';


const PHOTO_STORAGE_PATH = '/usr/src/app/photo-storage';
const logger = new Logger('AppModule');

// --- CONFIGURAÇÃO CONDICIONAL DE BANCO DE DADOS ---
// Esta lógica verifica se a aplicação está rodando em ambiente de teste (NODE_ENV=test).
// Se for teste, ele usa o TypeOrmModule.forRoot() com SQLite em memória.
// Caso contrário, ele usa o TypeOrmModule.forRootAsync() para PostgreSQL.

const DatabaseModule =
  process.env.NODE_ENV === 'test'
    ? TypeOrmModule.forRoot({
        type: 'sqlite',
        database: ':memory:', 
        // O caminho relativo deve funcionar para carregar as entidades em ambos os ambientes
        entities: [__dirname + '/**/*.entity{.ts,.js}'], 
        synchronize: true, 
        logging: false,
      })
    : TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => {
            
          // --- CONFIGURAÇÃO ÚNICA: HOST/PORTA ---
          // Usamos a coalescência nula (??) para fornecer um valor padrão se a V.E. for undefined.
          const host = config.get<string>('DATABASE_HOST') ?? '127.0.0.1';
          // Corrigindo o erro de tipagem: garantimos que parseInt receba uma string.
          const port = parseInt(config.get<string>('DATABASE_PORT') ?? '5432', 10);
          
          return {
            type: 'postgres' as const,
            host: host, // Lê 127.0.0.1 ou o IP Público
            port: port, // Lê 5432
            username: config.get<string>('DATABASE_USER') || 'postgres',
            password: config.get<string>('DATABASE_PASSWORD') || 'root',
            database: config.get<string>('DATABASE_NAME') || 'what-to-do-db',
            entities: ALL_ENTITIES,
            // Sincronização desativada em ambiente de produção (Cloud Run)
            synchronize: false,
          };
        },
      });


@Module({
  imports: [
    // 1. ConfigModule: global para ler variáveis de ambiente em qualquer lugar
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', 
      ignoreEnvFile: process.env.NODE_ENV === 'production' || !!process.env.CLOUDSQL_CONNECTION_NAME,
    }),
    
    // 2. Módulo de Banco de Dados Condicional
    DatabaseModule,

    GcsModule,

    //ServeStaticModule.forRoot({
    //  // 'rootPath' aponta para a pasta física no servidor (Docker) onde o Multer salva.
    //  rootPath: PHOTO_STORAGE_PATH, 
    //  
    //  // 'serveRoot' é o URL prefix que o frontend usa para buscar as imagens.
    //  // O URL falho era: http://localhost:3005/api/routes/photos/...
    //  serveRoot: '/api/routes/photos', 
    //}),
    
    // Módulos da aplicação
    AuthModule,
    UserModule,
    RoutesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}