-- Intel Agent: fontes e log de runs
-- Permite admin configurar URLs via UI + visualizar histórico de extrações

CREATE TABLE "intel_sources" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL DEFAULT 'html',
  "scopeSelector" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "minIntervalMin" INTEGER NOT NULL DEFAULT 120,
  "lastRunAt" TIMESTAMP(3),
  "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "intel_sources_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "intel_sources_isActive_lastRunAt_idx" ON "intel_sources"("isActive", "lastRunAt");

CREATE TABLE "intel_agent_runs" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL,
  "htmlBytes" INTEGER,
  "extractedCount" INTEGER NOT NULL DEFAULT 0,
  "newReportsCount" INTEGER NOT NULL DEFAULT 0,
  "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "inputPreview" TEXT,
  CONSTRAINT "intel_agent_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "intel_agent_runs_sourceId_startedAt_idx" ON "intel_agent_runs"("sourceId", "startedAt");
CREATE INDEX "intel_agent_runs_status_startedAt_idx" ON "intel_agent_runs"("status", "startedAt");

ALTER TABLE "intel_agent_runs"
  ADD CONSTRAINT "intel_agent_runs_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "intel_sources"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed 5 fontes curadas (blogs brasileiros de milhas + pág de promos oficial)
INSERT INTO "intel_sources" ("id", "name", "url", "sourceType", "scopeSelector", "updatedAt") VALUES
  ('intel-md', 'Melhores Destinos — bônus transferência', 'https://www.melhoresdestinos.com.br/?s=bonus+transferencia', 'html', 'main', CURRENT_TIMESTAMP),
  ('intel-pp', 'Passageiro de Primeira', 'https://passageirodeprimeira.com/?s=bonus', 'html', 'main', CURRENT_TIMESTAMP),
  ('intel-pm', 'Pontos Multiplicados', 'https://pontosmultiplicados.com.br/', 'html', 'main', CURRENT_TIMESTAMP),
  ('intel-livelo', 'Livelo — página de promoções', 'https://www.livelo.com.br/promocoes', 'html', 'main', CURRENT_TIMESTAMP),
  ('intel-esfera', 'Esfera — transferências bonificadas', 'https://www.esferasantanderbanespa.com.br/', 'html', 'main', CURRENT_TIMESTAMP);
