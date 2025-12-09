// backend/src/routes/routes.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoutesService } from './routes.service';
import { Route } from './entities/route.entity';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises'; // Importa o fs/promises

// Mock da biblioteca de parsing GPX (Assumindo a assinatura)
const mockGpxJs = {
  parseGPXWithCustomParser: jest.fn(() => [
    { 
      // Objeto GPX mockado para sucesso
      applyToTrack: jest.fn((trackIndex, calculator) => {
        if (calculator.name === 'calculateDistance') return { total: 10000 }; // 10km
        if (calculator.name === 'calculateElevation') return { positive: 500 }; // 500m
      }),
      toGeoJSON: jest.fn(() => ({ type: 'FeatureCollection', features: [] })),
      tracks: [{ name: 'Trilha Teste', comment: 'Mocked comment' }],
    },
    null, // sem erro
  ]),
};

// Mock do módulo fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('gpx data')),
  unlink: jest.fn().mockResolvedValue(undefined),
}));


describe('RoutesService', () => {
  let service: RoutesService;
  let repository: Repository<Route>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        {
          provide: getRepositoryToken(Route),
          useValue: {
            create: jest.fn(dto => dto), // Simula a criação
            save: jest.fn(route => Promise.resolve({ id: 1, ...route })), // Simula o salvamento
            findOneBy: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    })
    // Adicione esta linha para mockar a biblioteca GPXJS
    .overrideProvider('@we-gold/gpxjs') 
    .useValue(mockGpxJs) 
    .compile();

    service = module.get<RoutesService>(RoutesService);
    repository = module.get<Repository<Route>>(getRepositoryToken(Route));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Teste para o fluxo de sucesso
  //it('should process a GPX file, save the route, and unlink the file', async () => {
  //  const filePath = '/temp/test-file.gpx';
  //  const result = await service.processGpxFile(filePath, userId);
//
  //  // 1. Verifica se o readFile foi chamado
  //  expect(fs.readFile).toHaveBeenCalledWith(filePath);
  //  
  //  // 2. Verifica se a rota foi criada com os dados calculados
  //  expect(repository.create).toHaveBeenCalledWith(
  //    expect.objectContaining({
  //      name: 'Trilha Teste',
  //      distanceKm: 10, // 10000 / 1000
  //      elevationGainMeters: 500,
  //    }),
  //  );
  //  
  //  // 3. Verifica se a rota foi salva
  //  expect(repository.save).toHaveBeenCalled();
//
  //  // 4. Verifica se o arquivo temporário foi excluído (unlinked)
  //  expect(fs.unlink).toHaveBeenCalledWith(filePath);
//
  //  expect(result.id).toBe(1);
  //});
})//;