// backend/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  
  app.enableCors({
    origin: ['http://localhost:5174', //
    'https://what-to-do-frontend-485595135682.southamerica-east1.run.app',
  ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Se  precisar enviar cookies/JWT
  });
  
  // 1. Configuração do Swagger
  const config = new DocumentBuilder()
  
    .setTitle('API de Rotas GPX')

    .setDescription('Documentação da API para upload, visualização e download de rotas em formato GPX.')

    .setVersion('1.0')
    //pode adicionar tags para agrupar endpoints (ex: .addTag('rotas'))

    .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Insira o Token JWT',
        in: 'header',
    }, 'jwt')

    .build();

  // 2. Criação do Documento
  const document = SwaggerModule.createDocument(app, config);

  // 3. Montagem da Interface (Swagger UI)
  // O endpoint de acesso será /api-docs (ou o nome que você escolher)
  SwaggerModule.setup('api-docs', app, document); 

  // Ajuste a porta conforme a variável de ambiente ou use 3005
  const port = process.env.PORT || 3005; 
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation is available at: ${await app.getUrl()}/api-docs`);
}
bootstrap();