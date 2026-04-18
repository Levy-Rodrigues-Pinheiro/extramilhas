import IORedis from 'ioredis';
import { config } from './config';
import logger from './logger';

let redisInstance: IORedis | null = null;

export function getRedis(): IORedis {
  if (redisInstance) return redisInstance;

  redisInstance = new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    lazyConnect: false,
  });

  redisInstance.on('connect', () => {
    logger.info('Redis connected', { url: config.redisUrl });
  });

  redisInstance.on('error', (err) => {
    logger.error('Redis error', { error: err.message });
  });

  redisInstance.on('close', () => {
    logger.warn('Redis connection closed');
  });

  return redisInstance;
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
    logger.info('Redis connection closed gracefully');
  }
}

export default getRedis;
