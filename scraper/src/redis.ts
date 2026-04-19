import IORedis from 'ioredis';
import { config } from './config';
import logger from './logger';

/**
 * Redis wrapper com modo "degrada silenciosamente".
 *
 * Se REDIS_DISABLED=true ou se Redis ficar indisponível por >3 retries seguidos,
 * a gente desliga reconexão automática e para de logar os erros — o scraper
 * continua funcionando sem queues BullMQ.
 */

let redisInstance: IORedis | null = null;
let redisGivenUp = false;
let errorsSinceLastLog = 0;
let totalErrors = 0;
const MAX_ERRORS_BEFORE_GIVEUP = 3;

const disabled = (process.env.REDIS_DISABLED || '').toLowerCase() === 'true';

export function getRedis(): IORedis {
  if (redisInstance) return redisInstance;
  if (redisGivenUp || disabled) {
    // Retorna um mock que jamais tentará conectar
    return createNoopRedis() as any;
  }

  redisInstance = new IORedis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: false,
    // Backoff exponencial até desistir
    retryStrategy(times) {
      if (times > MAX_ERRORS_BEFORE_GIVEUP) {
        if (!redisGivenUp) {
          redisGivenUp = true;
          logger.warn(
            `Redis unreachable after ${times} retries — disabling Redis for this session. ` +
              `Queue features (BullMQ) will not work. Set REDIS_DISABLED=true to silence this.`,
          );
          redisInstance?.disconnect();
          redisInstance = null;
        }
        return null; // para a reconexão
      }
      return Math.min(times * 1000, 5000);
    },
  });

  redisInstance.on('connect', () => {
    logger.info('Redis connected', { url: config.redisUrl });
    redisGivenUp = false;
    totalErrors = 0;
  });

  redisInstance.on('error', (err) => {
    totalErrors++;
    errorsSinceLastLog++;
    // Só loga o 1º erro e a cada 100 seguintes (pra não inundar)
    if (totalErrors === 1 || errorsSinceLastLog >= 100) {
      logger.warn(`Redis error (${totalErrors} total): ${err.message}`);
      errorsSinceLastLog = 0;
    }
  });

  redisInstance.on('close', () => {
    if (!redisGivenUp) {
      logger.warn('Redis connection closed');
    }
  });

  return redisInstance;
}

function createNoopRedis() {
  // Objeto mock que absorve chamadas do BullMQ sem derrubar.
  // BullMQ só funcionará de verdade se Redis estiver disponível.
  const noop = () => Promise.resolve(null);
  const noopHandler: ProxyHandler<object> = {
    get(target, prop) {
      if (prop === 'status') return 'end';
      if (prop === 'on' || prop === 'off' || prop === 'once') return () => noopHandler;
      if (prop === 'disconnect' || prop === 'quit') return () => Promise.resolve('OK');
      return typeof prop === 'string' ? noop : undefined;
    },
  };
  return new Proxy({}, noopHandler);
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    try {
      await redisInstance.quit();
    } catch {
      redisInstance.disconnect();
    }
    redisInstance = null;
    logger.info('Redis connection closed gracefully');
  }
}

export default getRedis;
