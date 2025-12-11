// backend/src/app.module.ts

import { Module } from '@nestjs/common';
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
          
          // 1. O Cloud Run injeta esta variável quando configuramos a conexão Cloud SQL
          const CLOUDSQL_CONNECTION_NAME = config.get<string>('CLOUDSQL_CONNECTION_NAME');

          const commonConfig = {
            type: 'postgres' as const, // As const é para garantir tipagem correta
            username: config.get<string>('DB_USER') || 'postgres',
            password: config.get<string>('DB_PASSWORD') || 'root',
            database: config.get<string>('DB_DATABASE') || 'what-to-do-db',
            entities: ALL_ENTITIES,
            // A sincronização automática é PERIGOSA em produção. 
            // Já que vamos rodar migrações manualmente (passo 2.2), MUDAMOS AQUI:
            synchronize: CLOUDSQL_CONNECTION_NAME ? false : true, 
          };
          
          if (CLOUDSQL_CONNECTION_NAME) {
            // Conexão Cloud SQL via Unix Socket
            return {
              ...commonConfig,
              // O socketPath é um caminho fixo no ambiente Cloud Run
              socketPath: `/cloudsql/${CLOUDSQL_CONNECTION_NAME}`,
              // Não precisa de host/port
            };
          } else {
            // Conexão Local (Docker Compose)
            return {
              ...commonConfig,
              host: config.get<string>('DB_HOST'),      
              port: config.get<number>('DB_PORT'),
            };
          }
        },
      });


@Module({
  imports: [
    // 1. ConfigModule: global para ler variáveis de ambiente em qualquer lugar
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', 
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