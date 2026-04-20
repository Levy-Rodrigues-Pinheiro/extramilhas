import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

// Sentry init — rodado ANTES de criar app pra capturar qualquer erro cedo
// Sem SENTRY_DSN → no-op, zero overhead.
function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1, // 10% de transactions — barato
      beforeSend(event: any) {
        // Não manda errors de 401/404 comuns pro Sentry (ruído)
        const status = event?.tags?.statusCode;
        if (status === 401 || status === 404) return null;
        return event;
      },
    });
    console.log('[sentry] initialized');
  } catch (err) {
    console.warn('[sentry] init failed:', (err as Error).message);
  }
}

async function bootstrap() {
  initSentry();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  // Faz o NestJS usar o Pino logger — todos os `Logger` internos pegam junto
  app.useLogger(app.get(Logger));
  // Graceful shutdown: SIGTERM (Fly redeploy) executa onModuleDestroy dos services
  app.enableShutdownHooks();
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  // CORS seguro:
  //  - dev (NODE_ENV !== production): default true (allow all) → iteração rápida
  //  - prod: default = allowlist restrita (admin + landing + api do próprio).
  //          Override via env CORS_ORIGINS="https://a.com,https://b.com"
  //  Rotas /public/* já têm CORS * via @Header decorator (bypassa este guard).
  const corsEnv = configService.get<string>('CORS_ORIGINS');
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins: string[] | boolean = corsEnv
    ? corsEnv.split(',').map((s) => s.trim())
    : isProd
      ? [
          'https://milhasextras.com.br',
          'https://www.milhasextras.com.br',
          'https://admin.milhasextras.com.br',
        ]
      : true;

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

  // Gzip response bodies — JSON comprime ~5-10x, economia grande de banda
  // especialmente em respostas grandes (lista de offers, partnerships).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const compression = require('compression');
  app.use(compression());

  // Body size limit: 1MB default. Ajustável se precisar upload maior.
  // Previne DoS accidental com payload enorme.
  const express = require('express');
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Ordem importa: Prisma filter primeiro pra pegar P2xxx antes do generic
  app.useGlobalFilters(new PrismaExceptionFilter(), new HttpExceptionFilter());

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
