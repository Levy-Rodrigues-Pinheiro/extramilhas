-- Cleanup de registros órfãos pré FK migration.
-- ROLDA ANTES de aplicar migration 20260421150000_add_missing_fks
-- caso DB já tenha drift (registros sem user válido).
--
-- Uso:
--   psql $DATABASE_URL -f backend/scripts/cleanup-orphans.sql
--   OU
--   fly ssh console
--   $ apk add postgresql-client
--   $ psql $DATABASE_URL -f /tmp/cleanup-orphans.sql
--
-- Operação é idempotente — pode rodar múltiplas vezes sem problema.
-- Imprime contagem antes/depois pra audit trail.

\echo '═══════════════════════════════════════════'
\echo '🧹 Cleanup órfãos (pré FK migration)'
\echo '═══════════════════════════════════════════'
\echo ''

-- ForumThread
\echo '▸ ForumThread:'
SELECT count(*) AS orphans_before FROM forum_threads
WHERE "authorId" NOT IN (SELECT id FROM users);
DELETE FROM forum_threads WHERE "authorId" NOT IN (SELECT id FROM users);
\echo ''

-- ForumPost
\echo '▸ ForumPost:'
SELECT count(*) AS orphans_before FROM forum_posts
WHERE "authorId" NOT IN (SELECT id FROM users);
DELETE FROM forum_posts WHERE "authorId" NOT IN (SELECT id FROM users);
\echo ''

-- UserGuide
\echo '▸ UserGuide:'
SELECT count(*) AS orphans_before FROM user_guides
WHERE "authorId" NOT IN (SELECT id FROM users);
DELETE FROM user_guides WHERE "authorId" NOT IN (SELECT id FROM users);
\echo ''

-- GuideUpvote
\echo '▸ GuideUpvote:'
SELECT count(*) AS orphans_before FROM guide_upvotes
WHERE "userId" NOT IN (SELECT id FROM users);
DELETE FROM guide_upvotes WHERE "userId" NOT IN (SELECT id FROM users);
\echo ''

-- SupportTicket
\echo '▸ SupportTicket:'
SELECT count(*) AS orphans_before FROM support_tickets
WHERE "userId" NOT IN (SELECT id FROM users);
DELETE FROM support_tickets WHERE "userId" NOT IN (SELECT id FROM users);
\echo ''

-- SupportMessage
\echo '▸ SupportMessage:'
SELECT count(*) AS orphans_before FROM support_messages
WHERE "authorId" NOT IN (SELECT id FROM users);
DELETE FROM support_messages WHERE "authorId" NOT IN (SELECT id FROM users);
\echo ''

-- PollVote
\echo '▸ PollVote:'
SELECT count(*) AS orphans_before FROM poll_votes
WHERE "userId" NOT IN (SELECT id FROM users);
DELETE FROM poll_votes WHERE "userId" NOT IN (SELECT id FROM users);
\echo ''

\echo '═══════════════════════════════════════════'
\echo '✅ Cleanup completo. Pode rodar prisma migrate deploy.'
\echo '═══════════════════════════════════════════'
