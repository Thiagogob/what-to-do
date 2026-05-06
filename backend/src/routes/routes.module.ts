import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Route } from './entities/route.entity';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { RoutePhoto } from './entities/route-photo.entity';
import { StorageModule } from '../gcs/gcs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Route, RoutePhoto]),
    StorageModule,
  ],
  controllers: [RoutesController],
  providers: [RoutesService],
  exports: [TypeOrmModule, RoutesService],
})
export class RoutesModule {}