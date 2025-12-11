// test/routes.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ForbiddenException } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService, ConfigModule } from '@nestjs/config'; 
import * as path from 'path';

// Importe seus módulos
import { UserService } from './../src/user/user.service';
import { RoutesService } from './../src/routes/routes.service'; 
import { AuthModule } from './../src/auth/auth.module';
import { UserModule } from './../src/user/user.module';
import { RoutesModule } from './../src/routes/routes.module';
import * as fs from 'fs/promises';


jest.mock('fs/promises', () => {
    // Obter o fs/promises real para que funções como mkdir e writeFile continuem funcionando
    const actual = jest.requireActual('fs/promises'); 

    return {
        ...actual, // Inclui todas as funções reais (como mkdir, writeFile, etc.)
        // Sobrescreve apenas a função que queremos controlar no teste
        readFile: jest.fn().mockResolvedValue(Buffer.from('<gpx>Mock Data</gpx>')), 
    };
});
// --- CONSTANTES ---

const TEST_USER = {
    username: 'routes_tester', // Nome de usuário único para este arquivo
    password: 'Password@123',
};

// Use a mesma chave secreta de teste
const TEST_JWT_SECRET = 'TEST_SECRET_E2E'; 

// --- VARIÁVEIS DE TESTE ---

let app: INestApplication;
let access_token: string;
let testUserId: number; // ID do usuário criado

// Dados de Mock para a Rota
const MOCKED_ROUTES_LIST = [
    { id: 1, name: 'Rota da Montanha', distanceKm: 15.5, originalFilePath: '/tmp/mock1.gpx' },
    { id: 2, name: 'Rota do Rio', distanceKm: 8.2, originalFilePath: '/tmp/mock2.gpx' },
];


describe('RoutesController (e2e)', () => {
    
    // Aumentamos o timeout do Jest para 30 segundos
    beforeAll(async () => {
        
        // --- 1. CONFIGURAÇÃO DO DB DE TESTE (SQLite em memória) ---
        const sqliteConfig = {
            type: 'sqlite',
            database: ':memory:', 
            // O caminho precisa carregar todas as entidades do projeto
            entities: [path.join(__dirname, '/../**/*.entity{.ts,.js}')],
            synchronize: true, 
            logging: false,
        };

        // 2. MOCK DO CONFIG SERVICE
        const mockConfigService = {
            get: jest.fn((key: string) => {
                if (key === 'JWT_SECRET') { 
                    return TEST_JWT_SECRET;
                }
                if (key.startsWith('DB_')) {
                    return undefined; 
                }
                return null;
            }),
        };

        // 3. MOCK DO ROUTES SERVICE
        const mockRoutesService = {
            // Mocka findAll para retornar a lista de rotas de teste
            findAll: jest.fn().mockResolvedValue(MOCKED_ROUTES_LIST), 
            // Mocka findOne para ser usado no download/details
            findOne: jest.fn().mockResolvedValue(MOCKED_ROUTES_LIST[0]),
            // Mocka processGpxFile (para o teste de upload)
            processGpxFile: jest.fn().mockResolvedValue({ id: 99, name: 'Upload Mock', distanceKm: 10, elevationGainMeters: 500 }),
            // Mocka remove
            remove: jest.fn().mockResolvedValue(true),

            update: jest.fn().mockImplementation(
                (id, userId, dto) => Promise.resolve({ 
                    id, 
                    ownerId: userId, 
                    name: dto.name || 'Nome Antigo', // Retorna o nome atualizado
                    distanceKm: 10,
                    photos: [] // Assumindo que o serviço retorna a rota atualizada
                })
            ),
            saveRoutePhotos: jest.fn().mockResolvedValue(true),

            removePhoto: jest.fn().mockResolvedValue(true),
        };
        
        // 4. Criação da Módulo de Teste
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot(sqliteConfig as any),
                AuthModule,
                UserModule,
                RoutesModule,
                ConfigModule.forRoot({ isGlobal: true }),
            ],
        })
        .overrideProvider(ConfigService) 
        .useValue(mockConfigService)
        
        // ⬅️ Aplica o MOCK do RoutesService
        .overrideProvider(RoutesService) 
        .useValue(mockRoutesService) 
        .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        
        // --- SETUP DE DADOS NO DB EM MEMÓRIA ---
        
        const userService = moduleFixture.get<UserService>(UserService);
        // Cria o usuário de teste e armazena o ID
        const createdUser = await userService.create(TEST_USER.username, TEST_USER.password);
        testUserId = createdUser.id;
        
        // --- LOGIN PARA OBTENÇÃO DO TOKEN ---

        const loginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send(TEST_USER)
            .expect(HttpStatus.CREATED);
        
        access_token = loginResponse.body.access_token; 
        
    }, 30000); // Aumenta o timeout
    

    afterAll(async () => {
        if (app) {
            await app.close();
        }
    });

    // =================================================================
    // TESTES DE ROTAS PÚBLICAS/AUTENTICADAS
    // =================================================================

    it('GET /routes - Deve retornar uma lista de rotas (público)', async () => {
        // A rota GET /routes parece ser pública (RoutesController não tem @UseGuards(JwtAuthGuard) no findAll)

        const response = await request(app.getHttpServer())
            .get('/routes')
            .expect(HttpStatus.OK); // Espera um status 200 OK

        // 1. Deve ser um array
        expect(Array.isArray(response.body)).toBe(true);
        
        // 2. Deve ter o conteúdo que definimos no mock
        expect(response.body).toEqual(MOCKED_ROUTES_LIST);
        
        // 3. Verifica se o mock foi chamado corretamente
        const routesService = app.get<RoutesService>(RoutesService);
        expect(routesService.findAll).toHaveBeenCalled();
    });

    it('GET /routes/:id - Deve retornar os detalhes de uma rota específica (protegida) com token válido', async () => {
        const routeId = 1; // ID da rota que está mockada
        
        const response = await request(app.getHttpServer())
            .get(`/routes/${routeId}`)
            .set('Authorization', `Bearer ${access_token}`) // ⬅️ Envia o token de acesso
            .expect(HttpStatus.OK); // Espera 200 OK

        // 1. Verifica se o corpo da resposta é o objeto mockado
        expect(response.body).toEqual(MOCKED_ROUTES_LIST[0]);
        
        // 2. Verifica se o service foi chamado com o ID correto
        const routesService = app.get<RoutesService>(RoutesService);
        expect(routesService.findOne).toHaveBeenCalledWith(routeId);
    });


    it('GET /routes/:id - Deve falhar com 401 Unauthorized se não houver token', () => {
        const routeId = 1;

        return request(app.getHttpServer())
            .get(`/routes/${routeId}`)
            // ⬅️ Não enviamos o cabeçalho Authorization
            .expect(HttpStatus.UNAUTHORIZED) // Espera 401 Unauthorized
            .expect((res) => {
                // Verifica o formato da resposta de erro do NestJS para 401
                expect(res.body).toHaveProperty('statusCode', HttpStatus.UNAUTHORIZED);
                expect(res.body).toHaveProperty('message', 'Unauthorized');
            });
    });

    // =================================================================
    // TESTES DE DOWNLOAD
    // =================================================================

    // =================================================================
    // TESTES DE DOWNLOAD
    // =================================================================

    it('GET /routes/download/:id - Deve retornar o arquivo GPX com os headers corretos e token válido', async () => {
        const routeId = 1;
        const mockRoute = MOCKED_ROUTES_LIST[0]; // Rota mockada: id: 1, name: 'Rota da Montanha'
        
        // 1. Executa a requisição com o token
        const response = await request(app.getHttpServer())
            .get(`/routes/download/${routeId}`)
            .set('Authorization', `Bearer ${access_token}`) 
            .expect(HttpStatus.OK); // Espera 200 OK

        // 2. Verifica se o service foi chamado para obter o caminho do arquivo
        const routesService = app.get<RoutesService>(RoutesService);
        expect(routesService.findOne).toHaveBeenCalledWith(routeId);

        // 3. Verifica se o mock de readFile foi chamado com o caminho correto
        expect(fs.readFile).toHaveBeenCalledWith(mockRoute.originalFilePath);
        
        // 4. Verifica os Headers de Conteúdo e Download
        expect(response.headers['content-type']).toBe('application/gpx+xml');
        
        // O nome esperado no header é: Rota_da_Montanha_1.gpx (o controller substitui espaços por '_')
        const expectedFileName = `${mockRoute.name.replace(/\s+/g, '_')}_${routeId}.gpx`;
        expect(response.headers['content-disposition']).toBe(`attachment; filename="${expectedFileName}"`);

        // 5. Verifica o Corpo da Resposta (o conteúdo mockado)
        expect(response.text).toBe('<gpx>Mock Data</gpx>');
    });

    it('GET /routes/download/:id - Deve falhar com 401 Unauthorized se não houver token', () => {
        const routeId = 1;
        
        // A rota é protegida pelo JwtAuthGuard
        return request(app.getHttpServer())
            .get(`/routes/download/${routeId}`)
            .expect(HttpStatus.UNAUTHORIZED);
    });

    // =================================================================
    // TESTES DE DELEÇÃO
    // =================================================================
    
    it('DELETE /routes/:id - Deve retornar 204 No Content após remover uma rota com token válido', async () => {
        const routeIdToDelete = 2; // Usamos um ID para deleção

        // 1. Executa a requisição DELETE com o token
        await request(app.getHttpServer())
            .delete(`/routes/${routeIdToDelete}`)
            .set('Authorization', `Bearer ${access_token}`) // ⬅️ Envia o token de acesso
            .expect(HttpStatus.NO_CONTENT); // Espera 204 No Content

        // 2. Verifica se o service foi chamado com o ID da rota e o ID do usuário
        const routesService = app.get<RoutesService>(RoutesService);
        

        // O RoutesService no controller recebe (+id, userId)
        expect(routesService.remove).toHaveBeenCalledWith(
            routeIdToDelete, 
            expect.anything() // Checa se o userId foi passado (pode ser string ou number do payload)
        ); 
        
        // Se o seu `beforeAll` armazenou o ID do usuário como número:
        // expect(routesService.remove).toHaveBeenCalledWith(routeIdToDelete, testUserId); 
    }); 

    it('DELETE /routes/:id - Deve falhar com 401 Unauthorized se não houver token', () => {
        const routeId = 1;

        return request(app.getHttpServer())
            .delete(`/routes/${routeId}`)
            // Não enviamos o cabeçalho Authorization
            .expect(HttpStatus.UNAUTHORIZED); // Espera 401 Unauthorized
    });

    // =================================================================
    // TESTES DE UPLOAD (POST /routes/upload)
    // =================================================================

    it('POST /routes/upload - Deve fazer upload de um arquivo GPX com sucesso e retornar detalhes (protegida)', async () => {
        const dummyFilePath = path.join(__dirname, 'dummy.gpx'); 
        
        // Mocked response from RoutesService.processGpxFile:
        // { id: 99, name: 'Upload Mock', distanceKm: 10, elevationGainMeters: 500 }
        const expectedResponse = { 
            message: 'Rota processada e salva com sucesso.',
            routeId: 99,
            name: 'Upload Mock',
            distanceKm: 10,
            elevationGainMeters: 500
        };

        const response = await request(app.getHttpServer())
            .post('/routes/upload')
            .set('Authorization', `Bearer ${access_token}`) // ⬅️ Token necessário
            .attach('routeFile', dummyFilePath) // ⬅️ Anexa o arquivo com o nome do campo correto
            .expect(HttpStatus.CREATED); // Espera 201 Created

        // 1. Verifica a estrutura da resposta
        expect(response.body).toEqual(expectedResponse);

        // 2. Verifica se o service foi chamado corretamente
        const routesService = app.get<RoutesService>(RoutesService);
        
        // Verifica se processGpxFile foi chamado. O primeiro argumento é o caminho PERMANENTE criado pelo Multer.
        // O segundo argumento deve ser o ID do usuário.
        expect(routesService.processGpxFile).toHaveBeenCalledWith(
            expect.stringContaining('.gpx'), // O caminho do arquivo salvo pelo Multer
            expect.anything() // O ID do usuário (userId)
        );

        // Opcional: Se quiser verificar o caminho do arquivo criado, ele deve estar no diretório temporário
// Linha corrigida com type casting:
        const filePathArg = (routesService.processGpxFile as jest.Mock).mock.calls[0][0];        // Verifica se o arquivo foi escrito no diretório temporário do Multer para 'test'
        expect(filePathArg).toContain('gpx-storage-test'); 
    });

    it('POST /routes/upload - Deve falhar com 401 Unauthorized se não houver token', () => {
        const dummyFilePath = path.join(__dirname, 'dummy.gpx'); 

        return request(app.getHttpServer())
            .post('/routes/upload')
            .attach('routeFile', dummyFilePath) 
            // ⬅️ Não envia o token
            .expect(HttpStatus.UNAUTHORIZED);
    });

    it('POST /routes/upload - Deve falhar com 400 Bad Request se o campo do arquivo estiver incorreto', () => {
        const dummyFilePath = path.join(__dirname, 'dummy.gpx'); 

        // O campo esperado é 'routeFile', mas enviamos 'wrongField'
        return request(app.getHttpServer())
            .post('/routes/upload')
            .set('Authorization', `Bearer ${access_token}`)
            .attach('wrongField', dummyFilePath) 
            // O Multer/NestJS pode retornar 400 ou 500 dependendo da configuração.
            // Para upload obrigatório, 400 é comum se o arquivo esperado não foi encontrado.
            .expect(HttpStatus.BAD_REQUEST); 
    });

    // ... (continuação do seu arquivo routes.e2e-spec.ts)

    // =================================================================
    // TESTES DE ATUALIZAÇÃO (PATCH /routes/:id)
    // =================================================================
    
    // Teste 1: Apenas atualiza o nome (Sem fotos)
    it('PATCH /routes/:id - Deve atualizar o nome da rota (apenas dados de texto)', async () => {
        const routesService = app.get<RoutesService>(RoutesService); // ⬅️ Obtendo o serviço
        const routeId = 1;
        const newRouteName = 'Nova Rota Atualizada';

        // Garante que o mock de saveRoutePhotos não foi chamado anteriormente (opcional)
        (routesService.saveRoutePhotos as jest.Mock).mockClear();

        await request(app.getHttpServer())
            .patch(`/routes/${routeId}`)
            .set('Authorization', `Bearer ${access_token}`)
            .field('name', newRouteName) // Envia o campo de texto 'name'
            .expect(HttpStatus.OK) // Espera 200 OK
            .expect((res) => {
                expect(res.body.name).toBe(newRouteName);
            });
            
        // Verifica se o service.update foi chamado com o DTO correto
        expect(routesService.update).toHaveBeenCalledWith(
            routeId,
            expect.anything(), // userId
            { name: newRouteName }
        );
        // Garante que o service de salvar fotos NÃO foi chamado
        expect(routesService.saveRoutePhotos).not.toHaveBeenCalled();
    });
    
    // Teste 2: Atualiza o nome e envia uma foto
    it('PATCH /routes/:id - Deve atualizar o nome e processar o upload de fotos', async () => {
        const routesService = app.get<RoutesService>(RoutesService); // ⬅️ Obtendo o serviço
        const routeId = 1;
        const newRouteName = 'Rota com Fotos Novas';
        const dummyPhotoPath = path.join(__dirname, 'dummy.jpg');
        
        // Limpar o mock de fotos para que possamos verificar a chamada
        const saveRoutePhotosMock = routesService.saveRoutePhotos as jest.Mock;
        saveRoutePhotosMock.mockClear(); 

        await request(app.getHttpServer())
            .patch(`/routes/${routeId}`)
            .set('Authorization', `Bearer ${access_token}`)
            .field('name', newRouteName) // Campo de texto
            .attach('photos', dummyPhotoPath) // ⬅️ Campo de arquivo 'photos'
            .expect(HttpStatus.OK)
            .expect((res) => {
                expect(res.body.name).toBe(newRouteName);
            });
            
        // 1. Verifica se o service.update foi chamado (Atualização do nome)
        expect(routesService.update).toHaveBeenCalled();
        
        // 2. Verifica se o service.saveRoutePhotos foi chamado com a rota e a lista de arquivos
        expect(saveRoutePhotosMock).toHaveBeenCalledWith(
            routeId,
            expect.arrayContaining([
                expect.objectContaining({ 
                    fieldname: 'photos',
                    // Não é seguro depender do mimetype em todos os SOs, 
                    // apenas verificamos que o campo e o nome do arquivo foram processados
                    originalname: 'dummy.jpg' 
                })
            ])
        );
    });

    // Teste 3: Segurança (sem token)
    it('PATCH /routes/:id - Deve falhar com 401 Unauthorized se não houver token', () => {
        const routeId = 1;
        
        return request(app.getHttpServer())
            .patch(`/routes/${routeId}`)
            .field('name', 'Qualquer Nome')
            .expect(HttpStatus.UNAUTHORIZED);
    });
    
// ... (aqui entraria o próximo teste)

// =================================================================
    // TESTES DE DELEÇÃO DE FOTO (DELETE /routes/photos/:photoId)
    // =================================================================
    
    it('DELETE /routes/photos/:photoId - Deve remover uma foto com sucesso e retornar 204 No Content', async () => {
        const photoIdToDelete = 5; // ID fictício de uma foto
        const routesService = app.get<RoutesService>(RoutesService); // Obtendo o serviço

        // 1. Executa a requisição DELETE com o token
        await request(app.getHttpServer())
            .delete(`/routes/photos/${photoIdToDelete}`)
            .set('Authorization', `Bearer ${access_token}`) // ⬅️ Token necessário
            .expect(HttpStatus.NO_CONTENT); // Espera 204 No Content

        // 2. Verifica se o service foi chamado com o ID da foto e o ID do usuário
        // O `testUserId` é o proprietário mockado
        expect(routesService.removePhoto).toHaveBeenCalledWith(
            photoIdToDelete, 
            expect.anything() // O ID do usuário (do token)
        ); 
    });

    it('DELETE /routes/photos/:photoId - Deve falhar com 401 Unauthorized se não houver token', () => {
        const photoId = 5;

        // 1. Executa a requisição sem o token
        return request(app.getHttpServer())
            .delete(`/routes/photos/${photoId}`)
            .expect(HttpStatus.UNAUTHORIZED); // Espera 401 Unauthorized
    });

    // TESTE DE PROPRIEDADE (Opcional, mas importante)
   // TESTE DE PROPRIEDADE (Corrigido para usar ForbiddenException)
    it('DELETE /routes/photos/:photoId - Deve retornar 403 Forbidden se o service indicar que o usuário não é o proprietário', async () => {
        const photoId = 6;
        const routesService = app.get<RoutesService>(RoutesService);
        
        // ⬅️ CORREÇÃO: Mocka o service para lançar a exceção nativa do NestJS (ForbiddenException)
        (routesService.removePhoto as jest.Mock).mockRejectedValueOnce(
            new ForbiddenException('Proibido. O usuário não é o proprietário da foto/rota.')
        );

        // 1. Executa a requisição
        await request(app.getHttpServer())
            .delete(`/routes/photos/${photoId}`)
            .set('Authorization', `Bearer ${access_token}`)
            .expect(HttpStatus.FORBIDDEN); // Espera 403 Forbidden
            
        // 2. Restaura o mock para o valor padrão para não afetar outros testes
        (routesService.removePhoto as jest.Mock).mockResolvedValue(true); 
    });

});