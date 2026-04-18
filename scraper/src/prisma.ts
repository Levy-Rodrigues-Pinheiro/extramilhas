import { PrismaClient } from '@prisma/client';
import logger from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: [
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });

  client.$on('error', (e) => {
    logger.error('Prisma error', { message: e.message, target: e.target });
  });

  client.$on('warn', (e) => {
    logger.warn('Prisma warning', { message: e.message, target: e.target });
  });

  return client;
}

// Singleton: reuse existing instance in dev (hot-reload) and prod
const prisma: PrismaClient = global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export default prisma;
