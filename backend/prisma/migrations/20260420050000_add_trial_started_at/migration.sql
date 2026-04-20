-- Trial Premium 7 dias: 1 por conta.
-- trialStartedAt registra quando user iniciou — previne abuso.
ALTER TABLE "users" ADD COLUMN "trialStartedAt" TIMESTAMP(3);

-- Index pra admin queries sobre uso de trial
CREATE INDEX "users_trialStartedAt_idx" ON "users"("trialStartedAt");
