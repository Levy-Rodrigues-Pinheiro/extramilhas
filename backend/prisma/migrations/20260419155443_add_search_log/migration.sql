-- CreateTable
CREATE TABLE "search_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departDate" TEXT NOT NULL,
    "cabinClass" TEXT NOT NULL,
    "passengers" INTEGER NOT NULL DEFAULT 1,
    "userId" TEXT,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "topSource" TEXT,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "search_logs_origin_destination_departDate_cabinClass_idx" ON "search_logs"("origin", "destination", "departDate", "cabinClass");

-- CreateIndex
CREATE INDEX "search_logs_createdAt_idx" ON "search_logs"("createdAt");

-- CreateIndex
CREATE INDEX "search_logs_userId_createdAt_idx" ON "search_logs"("userId", "createdAt");
