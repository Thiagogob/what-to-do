// backend/src/gcs/gcs.module.ts
import { Module } from '@nestjs/common';
import { GcsService } from './gcs.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule], // Para acessar as variáveis de ambiente
  providers: [GcsService],
  exports: [GcsService], // Exporta o serviço para que outros módulos possam usá-lo
})
export class GcsModule {}