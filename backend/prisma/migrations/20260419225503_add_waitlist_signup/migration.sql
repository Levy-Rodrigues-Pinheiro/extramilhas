-- CreateTable
CREATE TABLE "waitlist_signups" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsappPhone" TEXT,
    "source" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "willingToPay" DOUBLE PRECISION,
    "message" TEXT,
    "convertedAt" TIMESTAMP(3),
    "emailsSent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_signups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waitlist_signups_source_idx" ON "waitlist_signups"("source");

-- CreateIndex
CREATE INDEX "waitlist_signups_createdAt_idx" ON "waitlist_signups"("createdAt");

-- CreateIndex
CREATE INDEX "waitlist_signups_convertedAt_idx" ON "waitlist_signups"("convertedAt");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_signups_email_key" ON "waitlist_signups"("email");
