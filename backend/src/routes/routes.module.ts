import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Route } from './entities/route.entity';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { RoutePhoto } from './entities/route-photo.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Route, RoutePhoto]),
  ],
  controllers: [RoutesController],
  providers: [RoutesService],
  exports: [TypeOrmModule, RoutesService],
})
export class RoutesModule {}