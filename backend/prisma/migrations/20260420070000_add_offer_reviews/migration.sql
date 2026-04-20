-- Reviews de ofertas (bônus de transferência). 1 review por (user, partnership).
-- Boolean pra começar; se demanda aparecer, migra pra 1-5 estrelas.
CREATE TABLE "offer_reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "worked" BOOLEAN NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "offer_reviews_userId_partnershipId_key" ON "offer_reviews"("userId", "partnershipId");
CREATE INDEX "offer_reviews_partnershipId_idx" ON "offer_reviews"("partnershipId");
