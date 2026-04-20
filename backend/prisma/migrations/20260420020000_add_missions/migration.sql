-- Gamification missions + user_missions
-- Mission: desafio criado pelo admin (ex: "reporte 3 bônus essa semana")
-- UserMission: progresso de um user por mission (upsert por trigger)

CREATE TABLE "missions" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetCount" INTEGER NOT NULL,
  "rewardDays" INTEGER NOT NULL DEFAULT 7,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "missions_slug_key" ON "missions"("slug");
CREATE INDEX "missions_isActive_validFrom_idx" ON "missions"("isActive", "validFrom");

CREATE TABLE "user_missions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "rewardClaimedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_missions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_missions_userId_missionId_key" ON "user_missions"("userId", "missionId");
CREATE INDEX "user_missions_userId_completedAt_idx" ON "user_missions"("userId", "completedAt");

ALTER TABLE "user_missions"
  ADD CONSTRAINT "user_missions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_missions"
  ADD CONSTRAINT "user_missions_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "missions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed 3 missões iniciais sensatas
INSERT INTO "missions" ("id", "slug", "title", "description", "targetType", "targetCount", "rewardDays", "updatedAt")
VALUES
  ('mission-report-3', 'report-3-bonuses-week', 'Caçador de Bônus', 'Reporte 3 bônus aprovados essa semana e ganhe 7 dias Premium.', 'bonus_reports_approved', 3, 7, CURRENT_TIMESTAMP),
  ('mission-balance-3', 'add-balance-3-programs', 'Carteira completa', 'Cadastre saldo em 3 programas diferentes. Sua carteira vale mais quando a gente sabe onde ela está.', 'balance_programs_added', 3, 14, CURRENT_TIMESTAMP),
  ('mission-refer-1', 'refer-1-friend', 'Amigo da casa', 'Traga 1 amigo com seu código de referral. Ambos ganham 30d Premium + você ganha mais 15d por aqui.', 'referrals_applied', 1, 15, CURRENT_TIMESTAMP);
