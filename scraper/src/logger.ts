import winston from 'winston';
import { config } from './config';

const { combine, timestamp, colorize, printf, json } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, ...metadata }) => {
  const meta = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
  return `${ts} [${level}]: ${message}${meta}`;
});

const logger = winston.createLogger({
  level: config.logLevel,
  transports: [
    new winston.transports.Console({
      format:
        config.nodeEnv === 'production'
          ? combine(timestamp(), json())
          : combine(
              colorize({ all: true }),
              timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              devFormat
            ),
    }),
  ],
});

export default logger;
