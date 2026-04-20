-- Performance sweep: indexes em colunas hot não-indexadas
-- CONCURRENTLY não disponível em migrate deploy, mas são create index simples
-- e tabelas pequenas (<100k rows em prod atual)

-- BonusReport: queries por data + status
CREATE INDEX IF NOT EXISTS "bonus_reports_reviewedAt_idx" ON "bonus_reports"("reviewedAt");

-- Notification: filtro por type
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications"("type");

-- AuditLog: queries por action+data
CREATE INDEX IF NOT EXISTS "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt" DESC);

-- AlertHistory: queries por alert + time
CREATE INDEX IF NOT EXISTS "alert_histories_alertId_sentAt_idx" ON "alert_histories"("alertId", "sentAt" DESC);

-- TransferPartnership: hot query arbitragem (isActive + currentBonus ordenado)
CREATE INDEX IF NOT EXISTS "transfer_partnerships_isActive_currentBonus_idx" ON "transfer_partnerships"("isActive", "currentBonus" DESC);

-- DeviceToken: compound pra broadcast + dedup
CREATE INDEX IF NOT EXISTS "device_tokens_userId_lastUsedAt_idx" ON "device_tokens"("userId", "lastUsedAt" DESC);

-- IntelAgentRun: dashboard ordena por startedAt recent
CREATE INDEX IF NOT EXISTS "intel_agent_runs_startedAt_idx" ON "intel_agent_runs"("startedAt" DESC);

-- Offer: filter feed por programa+ativo
CREATE INDEX IF NOT EXISTS "offers_programId_isActive_idx" ON "offers"("programId", "isActive");

-- UserPreference: unique userId já existe

-- SavedOffer: lookup por user
CREATE INDEX IF NOT EXISTS "saved_offers_userId_idx" ON "saved_offers"("userId");
