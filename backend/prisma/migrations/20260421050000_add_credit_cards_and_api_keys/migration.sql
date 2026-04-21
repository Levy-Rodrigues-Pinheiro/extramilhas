-- CreditCard catalog
CREATE TABLE "credit_cards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'STANDARD',
    "annualFeeBrl" INTEGER NOT NULL DEFAULT 0,
    "mainProgramSlug" TEXT NOT NULL,
    "pointsPerBrl" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "categoryBonuses" TEXT NOT NULL DEFAULT '{}',
    "welcomePoints" INTEGER NOT NULL DEFAULT 0,
    "welcomeSpendBrl" INTEGER NOT NULL DEFAULT 0,
    "minIncomeBrl" INTEGER NOT NULL DEFAULT 0,
    "logoUrl" TEXT,
    "officialUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "credit_cards_isActive_tier_idx" ON "credit_cards"("isActive", "tier");
CREATE INDEX "credit_cards_mainProgramSlug_idx" ON "credit_cards"("mainProgramSlug");

-- API keys for public API tier
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "requestsThisMonth" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");
CREATE INDEX "api_keys_ownerId_idx" ON "api_keys"("ownerId");
CREATE INDEX "api_keys_keyHash_isActive_idx" ON "api_keys"("keyHash", "isActive");

-- Seed inicial de cartões populares BR
INSERT INTO "credit_cards" ("id", "name", "brand", "issuer", "tier", "annualFeeBrl", "mainProgramSlug", "pointsPerBrl", "categoryBonuses", "welcomePoints", "welcomeSpendBrl", "minIncomeBrl", "updatedAt") VALUES
  ('card-itau-personnalite', 'Itaú Personnalité Black', 'Visa', 'Itaú', 'BLACK', 140000, 'livelo', 2.0, '{"viagem":3.0}', 80000, 1200000, 2000000, CURRENT_TIMESTAMP),
  ('card-santander-unique', 'Santander Unique Visa Infinite', 'Visa', 'Santander', 'BLACK', 138000, 'esfera', 4.0, '{"supermercado":2.0}', 100000, 800000, 1500000, CURRENT_TIMESTAMP),
  ('card-nubank-ultravioleta', 'Nubank Ultravioleta', 'Mastercard', 'Nubank', 'PLATINUM', 97200, 'livelo', 1.0, '{}', 0, 0, 1500000, CURRENT_TIMESTAMP),
  ('card-inter-black', 'Inter Black', 'Mastercard', 'Inter', 'BLACK', 0, 'livelo', 1.0, '{}', 0, 0, 2000000, CURRENT_TIMESTAMP),
  ('card-amex-greencard', 'Amex Green Card', 'Amex', 'Amex', 'STANDARD', 39000, 'membership', 1.0, '{"viagem":2.0,"restaurante":2.0}', 0, 0, 300000, CURRENT_TIMESTAMP);
