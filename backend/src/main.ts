import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  // SECURITY: In production, replace origin with specific allowed domains
  // e.g., origin: ['https://milhasextras.com.br', 'https://admin.milhasextras.com.br']
  const allowedOrigins = configService.get<string>('CORS_ORIGINS')
    ? configService.get<string>('CORS_ORIGINS')!.split(',')
    : true; // allow all in development only

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // Only expose Swagger docs in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Milhas Extras API')
      .setDescription('API do agregador de ofertas de milhas aéreas')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Autenticação')
      .addTag('offers', 'Ofertas de milhas')
      .addTag('alerts', 'Alertas personalizados')
      .addTag('programs', 'Programas de fidelidade')
      .addTag('users', 'Perfil e preferências')
      .addTag('calculator', 'Calculadora de CPM')
      .addTag('simulator', 'Simulador de viagem')
      .addTag('subscription', 'Assinaturas')
      .addTag('content', 'Artigos e conteúdo')
      .addTag('admin', 'Painel administrativo')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  console.log(`🚀 Milhas Extras API rodando em: http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
