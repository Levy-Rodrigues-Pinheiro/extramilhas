-- Bookmarks
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "bookmarks_userId_kind_targetId_key" ON "bookmarks"("userId", "kind", "targetId");
CREATE INDEX "bookmarks_userId_kind_idx" ON "bookmarks"("userId", "kind");

-- Achievements
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🏅',
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "achievements_slug_key" ON "achievements"("slug");

CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progressSnapshot" TEXT,
    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON "user_achievements"("userId", "achievementId");
CREATE INDEX "user_achievements_userId_idx" ON "user_achievements"("userId");

-- Seed de 12 achievements (catalog inicial)
INSERT INTO "achievements" ("id", "slug", "name", "description", "icon", "rarity") VALUES
  ('ach-first-signup', 'first-signup', 'Primeira vez', 'Criou conta no Milhas Extras', '🎉', 'common'),
  ('ach-first-balance', 'first-balance', 'Contador iniciante', 'Cadastrou 1º saldo de milhas', '💰', 'common'),
  ('ach-first-alert', 'first-alert', 'Radar ligado', 'Configurou 1º alerta personalizado', '📡', 'common'),
  ('ach-first-transfer', 'first-transfer-suggested', 'Primeira oportunidade', 'Clicou em "Transferir" numa arbitragem', '🚀', 'common'),
  ('ach-streak-7', 'streak-7', 'Uma semana firme', '7 dias consecutivos abrindo o app', '🔥', 'uncommon'),
  ('ach-streak-30', 'streak-30', 'Hábito formado', '30 dias consecutivos', '💎', 'rare'),
  ('ach-streak-100', 'streak-100', 'Centurião', '100 dias consecutivos', '👑', 'legendary'),
  ('ach-5-programs', '5-programs', 'Diversificador', 'Tem saldo em 5+ programas', '🌐', 'uncommon'),
  ('ach-first-guide', 'first-guide', 'Contribuidor', '1º guia publicado', '✍️', 'uncommon'),
  ('ach-100-reports', '100-reports', 'Vigilante', '100 bônus reportados aprovados', '🕵️', 'legendary'),
  ('ach-family-3', 'family-3', 'Família toda', 'Cadastrou 3+ membros na família', '👨‍👩‍👧', 'uncommon'),
  ('ach-trial-premium', 'trial-premium', 'Primeiro teste', 'Ativou trial Premium', '⭐', 'common');
