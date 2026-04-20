-- Salva output bruto do LLM em cada IntelAgentRun pra debug.
-- Quando bônus extraído vira REJECTED, admin pode inspecionar o que
-- o LLM retornou pra ajustar prompt no futuro.
ALTER TABLE "intel_agent_runs" ADD COLUMN "llmOutputRaw" TEXT;
