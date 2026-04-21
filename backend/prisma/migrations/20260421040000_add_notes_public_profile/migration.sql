-- Public profile fields no User
ALTER TABLE "users" ADD COLUMN "publicUsername" TEXT;
ALTER TABLE "users" ADD COLUMN "publicBio" TEXT;
ALTER TABLE "users" ADD COLUMN "publicAvatarUrl" TEXT;
ALTER TABLE "users" ADD COLUMN "publicShowLeaderboard" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "publicShowGuides" BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX "users_publicUsername_key" ON "users"("publicUsername");

-- Personal notes/reminders
CREATE TABLE "user_notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3),
    "remindSent" BOOLEAN NOT NULL DEFAULT false,
    "tag" TEXT NOT NULL DEFAULT 'GERAL',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "user_notes_userId_isArchived_isPinned_idx" ON "user_notes"("userId", "isArchived", "isPinned");
CREATE INDEX "user_notes_remindAt_remindSent_idx" ON "user_notes"("remindAt", "remindSent");
