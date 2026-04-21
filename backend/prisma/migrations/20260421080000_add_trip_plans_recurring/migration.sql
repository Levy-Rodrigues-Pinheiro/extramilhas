-- Recurrence nas notes
ALTER TABLE "user_notes" ADD COLUMN "recurrence" TEXT NOT NULL DEFAULT 'NONE';

-- TripPlan + membros + items
CREATE TABLE "trip_plans" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mainDestination" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "targetMiles" INTEGER NOT NULL DEFAULT 0,
    "targetBrl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "inviteToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "trip_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "trip_plans_inviteToken_key" ON "trip_plans"("inviteToken");
CREATE INDEX "trip_plans_ownerId_status_idx" ON "trip_plans"("ownerId", "status");

CREATE TABLE "trip_plan_members" (
    "id" TEXT NOT NULL,
    "tripPlanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EDITOR',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trip_plan_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trip_plan_members_tripPlanId_fkey" FOREIGN KEY ("tripPlanId") REFERENCES "trip_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "trip_plan_members_tripPlanId_userId_key" ON "trip_plan_members"("tripPlanId", "userId");
CREATE INDEX "trip_plan_members_userId_idx" ON "trip_plan_members"("userId");

CREATE TABLE "trip_plan_items" (
    "id" TEXT NOT NULL,
    "tripPlanId" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" TEXT,
    "milesCost" INTEGER NOT NULL DEFAULT 0,
    "brlCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "trip_plan_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trip_plan_items_tripPlanId_fkey" FOREIGN KEY ("tripPlanId") REFERENCES "trip_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "trip_plan_items_tripPlanId_orderIndex_idx" ON "trip_plan_items"("tripPlanId", "orderIndex");
