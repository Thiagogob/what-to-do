import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from './typeorm.entities';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? '127.0.0.1',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'root',
  database: process.env.DATABASE_NAME ?? 'what-to-do-db',
  entities: ALL_ENTITIES,
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
