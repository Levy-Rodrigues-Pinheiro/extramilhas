-- Referral system + lastActiveAt proxy
-- referralCode: unique short code user pode compartilhar (ex: "LEVY2M9")
-- referredById: quem indicou este user (FK self-referential, nullable)
-- lastActiveAt: atualizado em register device, hit em endpoint hot, etc.
--   usado por cron de reativação pra achar usuários inativos.

ALTER TABLE "users" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "users" ADD COLUMN "referredById" TEXT;
ALTER TABLE "users" ADD COLUMN "lastActiveAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- FK self-referential: user.referredBy → user
ALTER TABLE "users"
  ADD CONSTRAINT "users_referredById_fkey"
  FOREIGN KEY ("referredById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index pra lookup rápido por inatividade (usado no cron diário)
CREATE INDEX "users_lastActiveAt_idx" ON "users"("lastActiveAt");
