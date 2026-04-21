-- GroupBuy
CREATE TABLE "group_buys" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetPoints" INTEGER NOT NULL,
    "minPoints" INTEGER NOT NULL DEFAULT 10000,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "contactMethod" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "contactValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "group_buys_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "group_buys_status_deadline_idx" ON "group_buys"("status", "deadline");
CREATE INDEX "group_buys_programId_status_idx" ON "group_buys"("programId", "status");

CREATE TABLE "group_buy_participants" (
    "id" TEXT NOT NULL,
    "groupBuyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "group_buy_participants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "group_buy_participants_groupBuyId_fkey" FOREIGN KEY ("groupBuyId") REFERENCES "group_buys"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "group_buy_participants_groupBuyId_userId_key" ON "group_buy_participants"("groupBuyId", "userId");
CREATE INDEX "group_buy_participants_userId_idx" ON "group_buy_participants"("userId");

-- TripSwap
CREATE TABLE "trip_swaps" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fromCity" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "desiredInTrade" TEXT NOT NULL,
    "estimatedValue" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "contactMethod" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "contactValue" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "trip_swaps_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "trip_swaps_status_fromDate_idx" ON "trip_swaps"("status", "fromDate");
CREATE INDEX "trip_swaps_ownerId_idx" ON "trip_swaps"("ownerId");

CREATE TABLE "trip_swap_interests" (
    "id" TEXT NOT NULL,
    "tripSwapId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trip_swap_interests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trip_swap_interests_tripSwapId_fkey" FOREIGN KEY ("tripSwapId") REFERENCES "trip_swaps"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "trip_swap_interests_tripSwapId_userId_key" ON "trip_swap_interests"("tripSwapId", "userId");
CREATE INDEX "trip_swap_interests_userId_idx" ON "trip_swap_interests"("userId");
