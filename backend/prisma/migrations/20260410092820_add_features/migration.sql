-- AlterTable
ALTER TABLE "user_miles_balances" ADD COLUMN "expiresAt" DATETIME;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "whatsappPhone" TEXT;

-- CreateTable
CREATE TABLE "transfer_partnerships" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromProgramId" TEXT NOT NULL,
    "toProgramId" TEXT NOT NULL,
    "baseRate" REAL NOT NULL DEFAULT 1.0,
    "currentBonus" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "transfer_partnerships_fromProgramId_fkey" FOREIGN KEY ("fromProgramId") REFERENCES "loyalty_programs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transfer_partnerships_toProgramId_fkey" FOREIGN KEY ("toProgramId") REFERENCES "loyalty_programs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "family_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "family_member_balances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyMemberId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "family_member_balances_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "family_member_balances_programId_fkey" FOREIGN KEY ("programId") REFERENCES "loyalty_programs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "family_member_balances_familyMemberId_programId_key" ON "family_member_balances"("familyMemberId", "programId");
