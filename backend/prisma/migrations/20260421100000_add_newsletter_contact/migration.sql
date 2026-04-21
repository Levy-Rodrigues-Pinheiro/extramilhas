-- Newsletter
CREATE TABLE "newsletter_subscriptions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'OTHER',
    "frequency" TEXT NOT NULL DEFAULT 'WEEKLY_DIGEST',
    "confirmToken" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "unsubToken" TEXT NOT NULL,
    "unsubbedAt" TIMESTAMP(3),
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "newsletter_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "newsletter_subscriptions_email_key" ON "newsletter_subscriptions"("email");
CREATE UNIQUE INDEX "newsletter_subscriptions_confirmToken_key" ON "newsletter_subscriptions"("confirmToken");
CREATE UNIQUE INDEX "newsletter_subscriptions_unsubToken_key" ON "newsletter_subscriptions"("unsubToken");
CREATE INDEX "newsletter_subscriptions_confirmedAt_unsubbedAt_idx" ON "newsletter_subscriptions"("confirmedAt", "unsubbedAt");
CREATE INDEX "newsletter_subscriptions_source_idx" ON "newsletter_subscriptions"("source");

-- ContactMessage
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "handledBy" TEXT,
    "handledAt" TIMESTAMP(3),
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "contact_messages_status_createdAt_idx" ON "contact_messages"("status", "createdAt");
CREATE INDEX "contact_messages_email_idx" ON "contact_messages"("email");
