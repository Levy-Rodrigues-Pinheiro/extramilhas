-- Index em UserMilesBalance(userId) pra evitar full-table scan.
-- arbitrage.service.ts carrega todos os balances do user em cada request
-- de oportunidades. A unique composta [userId, programId] não serve pra
-- prefixar lookup por userId só.
CREATE INDEX "user_miles_balances_userId_idx" ON "user_miles_balances"("userId");
