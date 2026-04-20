import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Expõe X-RateLimit-* headers nas responses pra cliente saber quanto
 * ainda pode chamar antes de ser throttled. NestJS Throttler não expõe
 * por padrão; isto é aproximação — pega dos headers que ele já seta
 * internamente via seu guard, quando disponíveis.
 *
 * Não interfere na lógica; só copia pros headers finais.
 */
@Injectable()
export class RateLimitHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.on('finish', () => {
      // Throttler injeta esses quando ativo. Copia pra standard names.
      const limit = res.getHeader('x-ratelimit-limit');
      const remaining = res.getHeader('x-ratelimit-remaining');
      if (limit && remaining != null) {
        res.setHeader('RateLimit-Limit', String(limit));
        res.setHeader('RateLimit-Remaining', String(remaining));
      }
    });
    next();
  }
}
