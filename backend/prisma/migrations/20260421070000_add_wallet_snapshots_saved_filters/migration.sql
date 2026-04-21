CREATE TABLE "wallet_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalMiles" INTEGER NOT NULL DEFAULT 0,
    "totalValueBrl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "programsCount" INTEGER NOT NULL DEFAULT 0,
    "breakdown" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "wallet_snapshots_userId_date_key" ON "wallet_snapshots"("userId", "date");
CREATE INDEX "wallet_snapshots_userId_date_idx" ON "wallet_snapshots"("userId", "date");

CREATE TABLE "saved_filters" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT 'ARBITRAGE',
    "filterJson" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "saved_filters_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "saved_filters_userId_context_idx" ON "saved_filters"("userId", "context");
