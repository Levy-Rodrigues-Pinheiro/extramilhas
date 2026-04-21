/**
 * OpenTelemetry tracing setup — desabilitado por default. Ativa via
 * OTEL_ENABLED=true e OTEL_EXPORTER_OTLP_ENDPOINT=<url>.
 *
 * Pronto pra ligar quando adicionar Grafana Tempo / Honeycomb / Jaeger.
 * Hoje (out 2024) Fly.io não tem observability stack default — quando
 * ativar, precisa config pra shipping.
 *
 * Uso no main.ts:
 *   import { initOtel } from './common/otel';
 *   initOtel();
 *   // ...rest of bootstrap
 *
 * IMPORTANTE: require dinâmico. Se packages não instalados, erro silencioso.
 * Isso permite manter otel-ready sem inflar bundle quando desligado.
 */

export function initOtel() {
  if (process.env.OTEL_ENABLED !== 'true') {
    return;
  }

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) {
    console.warn('[otel] OTEL_ENABLED=true mas OTEL_EXPORTER_OTLP_ENDPOINT não setado — skip');
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Resource } = require('@opentelemetry/resources');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

    const sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'milhasextras-api',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION ?? 'dev',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? 'dev',
      }),
      traceExporter: new OTLPTraceExporter({ url: endpoint }),
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable fs instrumentation — muito ruidoso, pouco útil
          '@opentelemetry/instrumentation-fs': { enabled: false },
          // Keep HTTP, Express, Nest, Prisma (via adapter), Redis
          '@opentelemetry/instrumentation-http': { enabled: true },
          '@opentelemetry/instrumentation-express': { enabled: true },
          '@opentelemetry/instrumentation-nestjs-core': { enabled: true },
        }),
      ],
    });

    sdk.start();
    console.log(`[otel] Tracing started → ${endpoint}`);

    process.on('SIGTERM', () => {
      sdk
        .shutdown()
        .catch((e: unknown) => console.error('[otel] shutdown failed', e))
        .finally(() => process.exit(0));
    });
  } catch (err) {
    console.warn(
      '[otel] Failed to init (packages não instalados?). Rode: npm i @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http',
      (err as Error).message,
    );
  }
}
