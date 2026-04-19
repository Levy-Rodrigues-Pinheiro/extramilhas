-- CreateIndex
CREATE INDEX "offers_isActive_isDeleted_cpm_idx" ON "offers"("isActive", "isDeleted", "cpm");

-- CreateIndex
CREATE INDEX "offers_isActive_isDeleted_createdAt_idx" ON "offers"("isActive", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "offers_programId_isActive_isDeleted_idx" ON "offers"("programId", "isActive", "isDeleted");
