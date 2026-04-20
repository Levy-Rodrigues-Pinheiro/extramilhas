-- Dedup do cron diário de expiração de milhas (pointsExpirationAlert).
-- Sem este campo, users com saldo expirando receberiam push idêntico
-- todo dia até o vencimento. Com dedup: 1x por saldo a cada 7 dias.
ALTER TABLE "user_miles_balances" ADD COLUMN "lastExpirationAlertAt" TIMESTAMP(3);
CREATE INDEX "user_miles_balances_lastExpirationAlertAt_idx" ON "user_miles_balances"("lastExpirationAlertAt");
