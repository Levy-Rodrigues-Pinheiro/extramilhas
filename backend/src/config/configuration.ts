/**
 * Em produção, secrets obrigatórios → fail-fast no boot se faltarem.
 * Evita rodar com "default-secret-change-in-production" e virar um
 * JWT sharing scam entre deploys que esqueceram de setar.
 */
function requireInProd(name: string, value: string | undefined, fallback: string): string {
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(
      `Config error: ${name} é obrigatório em produção. Configure via: flyctl secrets set ${name}=...`,
    );
  }
  return value || fallback;
}

/**
 * SR-JWT-LEN-01: Fail-fast em QUALQUER env (não só prod) se JWT secret for
 * fraco demais. Protege contra config acidental em staging/preview que vire
 * prod e contra tokens vulneráveis a brute-force offline.
 *
 * Aceita qualquer secret >= 32 chars em prod, >= 16 em dev (permite valor
 * default-* pra bootstrap local, mas emite warning forte).
 */
function validateJwtSecret(name: string, secret: string): string {
  const isProd = process.env.NODE_ENV === 'production';
  const min = isProd ? 32 : 16;
  if (secret.length < min) {
    throw new Error(
      `Config error: ${name} deve ter no mínimo ${min} chars (atual: ${secret.length}). ` +
        `Gere com: openssl rand -base64 48`,
    );
  }
  // Em prod, rejeita valores default óbvios mesmo com length OK
  if (isProd && /^(default-|change[_-]?me|your[_-]|example|secret|password|test)/i.test(secret)) {
    throw new Error(
      `Config error: ${name} tem valor default/placeholder em produção. Rotate!`,
    );
  }
  if (!isProd && secret.startsWith('default-')) {
    // eslint-disable-next-line no-console
    console.warn(
      `⚠️  ${name} está com valor default em dev. Gere um real em .env pra teste realista.`,
    );
  }
  return secret;
}

export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,
  apiPrefix: process.env.API_PREFIX || 'api/v1',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret: validateJwtSecret(
      'JWT_SECRET',
      requireInProd(
        'JWT_SECRET',
        process.env.JWT_SECRET,
        'default-secret-change-in-production-use-min-32-chars',
      ),
    ),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: validateJwtSecret(
      'JWT_REFRESH_SECRET',
      requireInProd(
        'JWT_REFRESH_SECRET',
        process.env.JWT_REFRESH_SECRET,
        'default-refresh-secret-change-in-production-use-min-32',
      ),
    ),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    premiumPriceId: process.env.STRIPE_PREMIUM_PRICE_ID || '',
    proPriceId: process.env.STRIPE_PRO_PRICE_ID || '',
    premiumAnnualPriceId: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID || '',
    proAnnualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/v1/auth/google/callback',
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@milhasextras.com.br',
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
});
