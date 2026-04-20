-- Link our User to Stripe Customer so webhooks (cancel/update) can locate us.
-- Nullable: most users are FREE and never checkout.
ALTER TABLE "users" ADD COLUMN "stripeCustomerId" TEXT;

-- Unique constraint: one Stripe customer per user (and vice versa).
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");
