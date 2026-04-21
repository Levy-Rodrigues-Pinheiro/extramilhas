-- User badges + shareActivity
ALTER TABLE "users" ADD COLUMN "badges" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "user_preferences" ADD COLUMN "shareActivity" BOOLEAN NOT NULL DEFAULT false;

-- Activity feed
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "activities_userId_createdAt_idx" ON "activities"("userId", "createdAt");
CREATE INDEX "activities_visibility_createdAt_idx" ON "activities"("visibility", "createdAt");
CREATE INDEX "activities_kind_createdAt_idx" ON "activities"("kind", "createdAt");
