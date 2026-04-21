CREATE TABLE "podcast_episodes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "episodeNumber" INTEGER,
    "coverImage" TEXT,
    "publishedAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "podcast_episodes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "podcast_episodes_slug_key" ON "podcast_episodes"("slug");
CREATE INDEX "podcast_episodes_isPublished_publishedAt_idx" ON "podcast_episodes"("isPublished", "publishedAt");
