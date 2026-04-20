-- Cache de hash de conteúdo por IntelSource
-- Se o hash novo == lastContentHash, skippamos LLM call (página sem mudança).
-- Economia ~60-80% dos tokens em blogs que atualizam 1x/semana.
ALTER TABLE "intel_sources" ADD COLUMN "lastContentHash" TEXT;
