-- Link BonusReport → IntelSource pra calcular accuracy do agente
-- (quantos reports do agente X foram aprovados vs rejeitados).
-- Nullable: reports manuais continuam sem FK.

ALTER TABLE "bonus_reports" ADD COLUMN "intelSourceId" TEXT;
CREATE INDEX "bonus_reports_intelSourceId_status_idx" ON "bonus_reports"("intelSourceId", "status");
