-- Specialist review fix: adicionar FKs missing identificadas por audit
-- Antes, user deletado deixava órfãos em forum, guides, polls, support
--
-- IMPORTANTE: se seu DB já tem dados órfãos, migration vai falhar.
-- Antes de rodar, executar limpeza:
--
--   DELETE FROM forum_threads WHERE "authorId" NOT IN (SELECT id FROM users);
--   DELETE FROM forum_posts WHERE "authorId" NOT IN (SELECT id FROM users);
--   DELETE FROM user_guides WHERE "authorId" NOT IN (SELECT id FROM users);
--   DELETE FROM guide_upvotes WHERE "userId" NOT IN (SELECT id FROM users);
--   DELETE FROM support_tickets WHERE "userId" NOT IN (SELECT id FROM users);
--   DELETE FROM support_messages WHERE "authorId" NOT IN (SELECT id FROM users);
--   DELETE FROM poll_votes WHERE "userId" NOT IN (SELECT id FROM users);

ALTER TABLE "forum_threads"
  ADD CONSTRAINT "forum_threads_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "forum_posts"
  ADD CONSTRAINT "forum_posts_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_guides"
  ADD CONSTRAINT "user_guides_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "guide_upvotes"
  ADD CONSTRAINT "guide_upvotes_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_messages"
  ADD CONSTRAINT "support_messages_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "poll_votes"
  ADD CONSTRAINT "poll_votes_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Index novos pra authorId/userId (pra JOIN + delete cascade performance)
CREATE INDEX IF NOT EXISTS "support_messages_authorId_idx" ON "support_messages"("authorId");
CREATE INDEX IF NOT EXISTS "poll_votes_userId_idx" ON "poll_votes"("userId");
