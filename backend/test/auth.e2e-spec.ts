// test/auth.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService, ConfigModule } from '@nestjs/config'; 

// Importe seus módulos para que o Módulo de Teste possa carregá-los
import { UserService } from './../src/user/user.service';
import { RoutesService } from './../src/routes/routes.service'; 
import { AuthModule } from './../src/auth/auth.module';
import { UserModule } from './../src/user/user.module';
import { RoutesModule } from './../src/routes/routes.module';

// --- CONSTANTES ---

const TEST_USER = {
    username: 'testuser',
    password: 'Password@123',
};

// Use uma chave secreta de teste
const TEST_JWT_SECRET = 'TEST_SECRET_E2E'; 

// --- VARIÁVEIS DE TESTE ---

let app: INestApplication;
let access_token: string;


describe('AuthController (e2e)', () => {
    
    // Aumentamos o timeout do Jest para 30 segundos como segurança
    beforeAll(async () => {
        
        // --- 1. CONFIGURAÇÃO DO DB DE TESTE (SQLite em memória) ---
        
        const sqliteConfig = {
            type: 'sqlite',
            database: ':memory:', 
            // O caminho precisa carregar todas as entidades do projeto
            entities: [__dirname + '/../**/*.entity{.ts,.js}'],
            synchronize: true, 
            logging: false,
        };

        // 2. MOCK DO CONFIG SERVICE
        const mockConfigService = {
            get: jest.fn((key: string) => {
                if (key === 'JWT_SECRET') { 
                    return TEST_JWT_SECRET;
                }
                // Mocka chaves DB para garantir que não haja tentativa de conexão
                if (key.startsWith('DB_')) {
                    return undefined; 
                }
                return null;
            }),
        };

        // 3. MOCK DO ROUTES SERVICE
        const mockRoutesService = {
            processGpxFile: jest.fn().mockResolvedValue({ id: 99, distanceKm: 10 }),
            findAll: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue({ id: 1, originalFilePath: '/tmp/mock.gpx' }), 
            remove: jest.fn().mockResolvedValue(true),
        };
        
        // 4. Criação da Módulo de Teste (Importando submódulos e DB de teste)
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                // A. Conexão principal do DB de teste (SQLite)
                TypeOrmModule.forRoot(sqliteConfig as any),
                
                // B. Importar todos os módulos da aplicação
                AuthModule,
                UserModule,
                RoutesModule,
                // O ConfigModule é global no seu AppModule, então o importamos para garantir
                ConfigModule.forRoot({ isGlobal: true }),
            ],
        })
        
        // C. Aplicar o override do ConfigService
        .overrideProvider(ConfigService) 
        .useValue(mockConfigService)
        
        // D. Aplicar o override do RoutesService
        .overrideProvider(RoutesService) 
        .useValue(mockRoutesService) 
        .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        
        // --- SETUP DE DADOS NO DB EM MEMÓRIA ---
        
        // Cria o usuário de teste (a senha deve ser hasheada aqui)
        const userService = moduleFixture.get<UserService>(UserService);
        await userService.create(TEST_USER.username, TEST_USER.password);
        
        // --- LOGIN PARA OBTENÇÃO DO TOKEN (DIAGNÓSTICO) ---

        const loginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send(TEST_USER);
            // REMOVIDO: .expect(HttpStatus.CREATED); para evitar que a falha de status trave o beforeAll

        // LOG DE DIAGNÓSTICO: Mostra o status e o corpo do erro
        console.log('--- DIAGNÓSTICO LOGIN ---');
        console.log('Status de Login:', loginResponse.status);
        console.log('Corpo de Erro de Login:', loginResponse.body);
        console.log('--- FIM DIAGNÓSTICO ---');
        
        // VERIFICAÇÃO CONDICIONAL: Lança uma exceção clara se o login falhar
        if (loginResponse.status !== HttpStatus.CREATED) {
             throw new Error(`O Login falhou no beforeAll. Status: ${loginResponse.status}. Corpo: ${JSON.stringify(loginResponse.body)}`);
        }
        
        // Se o login foi 201 Created, definimos o token
        access_token = loginResponse.body.access_token; 
        expect(access_token).toBeDefined();

    }, 30000); // Aumenta o timeout
    

    afterAll(async () => {
        // Correção para evitar o erro "Cannot read properties of undefined (reading 'close')"
        if (app) {
            await app.close();
        }
    });

    // =================================================================
    // TESTES DE AUTENTICAÇÃO
    // =================================================================

    // Este teste deve ser o primeiro a falhar se o beforeAll falhou,
    // mas a falha real virá do diagnóstico no beforeAll.
    it('/auth/login (POST) - Deve retornar um token de acesso para credenciais válidas', async () => {
        // Se o beforeAll funcionou, o accessToken está definido.
        // Usaremos uma nova requisição para validar a rota
        const response = await request(app.getHttpServer())
            .post('/auth/login')
            .send(TEST_USER)
            .expect(HttpStatus.CREATED);

        expect(response.body).toHaveProperty('access_token');
    });

    it('/auth/login (POST) - Deve falhar com credenciais inválidas', () => {
        return request(app.getHttpServer())
            .post('/auth/login')
            .send({ username: TEST_USER.username, password: 'wrongpassword' })
            .expect(HttpStatus.UNAUTHORIZED);
    });

    it('/auth/status (GET) - Deve retornar o payload do usuário com um token válido', () => {
        return request(app.getHttpServer())
            .get('/auth/status')
            .set('Authorization', `Bearer ${access_token}`)
            .expect(HttpStatus.OK)
            .expect((res) => {
                expect(res.body).toHaveProperty('username', TEST_USER.username);
                expect(res.body).not.toHaveProperty('password');
            });
    });

    it('/auth/status (GET) - Deve falhar sem um token de acesso', () => {
        return request(app.getHttpServer())
            .get('/auth/status')
            .expect(HttpStatus.UNAUTHORIZED);
    });

    // =================================================================
    // TESTES DE REGISTRO
    // =================================================================

    it('/users/register (POST) - Deve registrar um novo usuário', () => {
        return request(app.getHttpServer())
            .post('/users/register')
            .send({ username: 'newuser', password: 'NewPassword@1' })
            .expect(HttpStatus.CREATED)
            .expect((res) => {
                expect(res.body).toHaveProperty('username', 'newuser');
                expect(res.body).not.toHaveProperty('password');
            });
    });

    

});