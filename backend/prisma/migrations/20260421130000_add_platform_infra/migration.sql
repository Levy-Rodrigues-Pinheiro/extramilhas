-- Multi-tenancy
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'STARTER',
    "userQuota" INTEGER NOT NULL DEFAULT 10,
    "customDomain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE UNIQUE INDEX "tenants_customDomain_key" ON "tenants"("customDomain");
CREATE INDEX "tenants_isActive_plan_idx" ON "tenants"("isActive", "plan");

-- Seed default tenant
INSERT INTO "tenants" ("id", "slug", "name", "plan", "userQuota", "updatedAt") VALUES
  ('tenant-default', 'default', 'Milhas Extras', 'ENTERPRISE', 10000000, CURRENT_TIMESTAMP);

-- User.tenantSlug
ALTER TABLE "users" ADD COLUMN "tenantSlug" TEXT DEFAULT 'default';
CREATE INDEX "users_tenantSlug_idx" ON "users"("tenantSlug");

-- Outbound webhooks
CREATE TABLE "outbound_webhooks" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT NOT NULL DEFAULT '[]',
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalSuccess" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "lastDeliveredAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "outbound_webhooks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "outbound_webhooks_ownerId_isActive_idx" ON "outbound_webhooks"("ownerId", "isActive");
CREATE INDEX "outbound_webhooks_isActive_idx" ON "outbound_webhooks"("isActive");

-- Email templates
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "bodyText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "email_templates_slug_key" ON "email_templates"("slug");

-- Seed 4 templates básicos
INSERT INTO "email_templates" ("id", "slug", "subject", "body", "bodyText", "isActive", "updatedAt") VALUES
  ('tpl-welcome', 'welcome', 'Bem-vindo ao Milhas Extras 🎉',
    '<h1>Oi {{user.name}}!</h1><p>Seu acesso está pronto. Comece adicionando seu primeiro saldo de milhas e descubra quanto vale sua carteira.</p><a href="https://milhasextras.com.br/wallet">Ir pra carteira</a>',
    'Oi {{user.name}}! Seu acesso está pronto. Comece em: https://milhasextras.com.br/wallet',
    false, CURRENT_TIMESTAMP),
  ('tpl-trial-ending', 'trial-ending', 'Seu trial acaba em {{days}} dias',
    '<p>Oi {{user.name}}, seu trial Premium termina em {{days}} dias. Continue aproveitando bônus destravados assinando.</p><a href="https://milhasextras.com.br/subscription">Assinar agora</a>',
    'Seu trial acaba em {{days}}d. Assine: https://milhasextras.com.br/subscription',
    false, CURRENT_TIMESTAMP),
  ('tpl-weekly-digest', 'weekly-digest', '📊 Sua semana no Milhas Extras',
    '<h1>{{user.name}}, confere sua semana</h1><p>{{bonusCount}} bônus novos · Carteira: R$ {{walletValue}} · Streak: {{streak}}d</p>',
    'Sua semana: {{bonusCount}} bônus · R$ {{walletValue}} · {{streak}}d streak',
    false, CURRENT_TIMESTAMP),
  ('tpl-password-reset', 'password-reset', 'Redefinição de senha',
    '<p>Clique aqui pra redefinir sua senha: <a href="{{resetUrl}}">Redefinir</a>. Link expira em 1h.</p>',
    'Redefinir senha: {{resetUrl}} (expira em 1h)',
    false, CURRENT_TIMESTAMP);
