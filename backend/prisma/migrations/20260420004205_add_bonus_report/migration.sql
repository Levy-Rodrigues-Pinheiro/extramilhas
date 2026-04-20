-- CreateTable
CREATE TABLE "bonus_reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT,
    "reporterEmail" TEXT,
    "fromProgramSlug" TEXT NOT NULL,
    "toProgramSlug" TEXT NOT NULL,
    "bonusPercent" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "screenshotUrl" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "partnershipId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bonus_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bonus_reports_status_createdAt_idx" ON "bonus_reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "bonus_reports_reporterId_idx" ON "bonus_reports"("reporterId");

-- CreateIndex
CREATE INDEX "bonus_reports_fromProgramSlug_toProgramSlug_idx" ON "bonus_reports"("fromProgramSlug", "toProgramSlug");

-- AddForeignKey
ALTER TABLE "bonus_reports" ADD CONSTRAINT "bonus_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonus_reports" ADD CONSTRAINT "bonus_reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
