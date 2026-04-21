CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "security_events_eventType_createdAt_idx" ON "security_events"("eventType", "createdAt");
CREATE INDEX "security_events_ipAddress_createdAt_idx" ON "security_events"("ipAddress", "createdAt");
CREATE INDEX "security_events_userId_createdAt_idx" ON "security_events"("userId", "createdAt");
CREATE INDEX "security_events_riskScore_createdAt_idx" ON "security_events"("riskScore", "createdAt");
