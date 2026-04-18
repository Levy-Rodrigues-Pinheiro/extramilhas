-- CreateTable
CREATE TABLE "live_flight_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programSlug" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departDate" TEXT NOT NULL,
    "cabinClass" TEXT NOT NULL,
    "milesRequired" INTEGER NOT NULL,
    "taxBrl" REAL NOT NULL DEFAULT 0,
    "airline" TEXT,
    "flightNumber" TEXT,
    "departureTime" TEXT,
    "arrivalTime" TEXT,
    "duration" TEXT,
    "stops" INTEGER NOT NULL DEFAULT 0,
    "rawPayload" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "live_flight_cache_origin_destination_departDate_cabinClass_expiresAt_idx" ON "live_flight_cache"("origin", "destination", "departDate", "cabinClass", "expiresAt");

-- CreateIndex
CREATE INDEX "live_flight_cache_expiresAt_idx" ON "live_flight_cache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "live_flight_cache_programSlug_origin_destination_departDate_cabinClass_flightNumber_key" ON "live_flight_cache"("programSlug", "origin", "destination", "departDate", "cabinClass", "flightNumber");

-- CreateIndex
CREATE INDEX "alert_histories_alertId_idx" ON "alert_histories"("alertId");

-- CreateIndex
CREATE INDEX "alert_histories_sentAt_idx" ON "alert_histories"("sentAt");

-- CreateIndex
CREATE INDEX "alerts_userId_idx" ON "alerts"("userId");

-- CreateIndex
CREATE INDEX "alerts_isActive_idx" ON "alerts"("isActive");

-- CreateIndex
CREATE INDEX "audit_logs_adminId_idx" ON "audit_logs"("adminId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "award_charts_programId_origin_cabinClass_isActive_idx" ON "award_charts"("programId", "origin", "cabinClass", "isActive");

-- CreateIndex
CREATE INDEX "award_charts_origin_destination_cabinClass_isActive_idx" ON "award_charts"("origin", "destination", "cabinClass", "isActive");

-- CreateIndex
CREATE INDEX "family_members_userId_idx" ON "family_members"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "offers_programId_idx" ON "offers"("programId");

-- CreateIndex
CREATE INDEX "offers_isActive_isDeleted_idx" ON "offers"("isActive", "isDeleted");

-- CreateIndex
CREATE INDEX "offers_type_idx" ON "offers"("type");

-- CreateIndex
CREATE INDEX "offers_classification_idx" ON "offers"("classification");

-- CreateIndex
CREATE INDEX "offers_cpm_idx" ON "offers"("cpm");

-- CreateIndex
CREATE INDEX "offers_createdAt_idx" ON "offers"("createdAt");

-- CreateIndex
CREATE INDEX "offers_expiresAt_idx" ON "offers"("expiresAt");

-- CreateIndex
CREATE INDEX "price_histories_programId_date_idx" ON "price_histories"("programId", "date");

-- CreateIndex
CREATE INDEX "price_histories_programId_idx" ON "price_histories"("programId");

-- CreateIndex
CREATE INDEX "price_histories_date_idx" ON "price_histories"("date");

-- CreateIndex
CREATE INDEX "transfer_partnerships_fromProgramId_toProgramId_isActive_idx" ON "transfer_partnerships"("fromProgramId", "toProgramId", "isActive");
