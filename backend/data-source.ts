// backend/src/data-source.ts

import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Route } from './src/routes/entities/route.entity';
import { User } from './src/user/entities/user.entity';
import { RoutePhoto } from './src/routes/entities/route-photo.entity';

// Carregar variáveis de ambiente (necessário para o CLI)
dotenv.config({ path: path.resolve(process.cwd(), '.env') }); 

// 🚨 IMPORTANTE: Você precisa listar todas as suas entidades aqui.
// Use um array com todas as suas classes de entidade (ex: Route, User, RoutePhoto).
// Para simplificar, vou usar um placeholder para todas as entidades.
// Se você tem um arquivo ALL_ENTITIES, importe-o aqui.
const ALL_ENTITIES = [
    
     Route,
     User,
     RoutePhoto
];


const isProduction = process.env.NODE_ENV === 'production';

// Lógica de Conexão para TypeORM CLI
const getDataSourceOptions = (): DataSourceOptions => {

  const CLOUDSQL_CONNECTION_NAME = process.env.CLOUDSQL_CONNECTION_NAME;
  const dbPortLocal = process.env.DB_PORT || 5433; // Usa 5433 como fallback

  // Configurações Comuns
  const commonConfig: Partial<DataSourceOptions> = {
    type: 'postgres',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_DATABASE || 'what-to-do-db',
    
    // Entidades: Onde o TypeORM deve procurar as classes @Entity()
    entities: ALL_ENTITIES,
    
    // Migrações: Onde os arquivos de migração serão criados e lidos
    migrations: [isProduction ? 'dist/migrations/*.js' : 'src/migrations/*.ts'],

    // Em produção, queremos desabilitar o synchronize!
    synchronize: false,
    logging: isProduction ? ['error'] : ['query', 'error'],
  };

  if (CLOUDSQL_CONNECTION_NAME) {
    // Conexão CLOUD SQL VIA UNIX SOCKET (Produção)
    return {
      ...commonConfig,
      socketPath: `/cloudsql/${CLOUDSQL_CONNECTION_NAME}`,
      ssl: true, // Geralmente exigido pelo Cloud SQL
      // Sem host/port
      entities: ['dist/**/*.entity.js'],
      migrations: ['dist/migrations/*.js']
    } as DataSourceOptions;
  } else {
    // Conexão LOCAL (Docker Compose / Desenvolvimento)
    return {
      ...commonConfig,
      host: process.env.DB_HOST || 'localhost',
      port: 5432,
    } as DataSourceOptions;
  }
};

const dataSourceOptions = getDataSourceOptions();

// Exporta o DataSource para o TypeORM CLI
export default new DataSource(dataSourceOptions);