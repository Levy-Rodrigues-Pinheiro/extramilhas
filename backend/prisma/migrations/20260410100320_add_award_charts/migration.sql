-- CreateTable
CREATE TABLE "award_charts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "destinationName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "cabinClass" TEXT NOT NULL,
    "milesRequired" INTEGER NOT NULL,
    "isDirectFlight" BOOLEAN NOT NULL DEFAULT false,
    "lat" REAL,
    "lng" REAL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "award_charts_programId_fkey" FOREIGN KEY ("programId") REFERENCES "loyalty_programs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "award_charts_programId_origin_destination_cabinClass_key" ON "award_charts"("programId", "origin", "destination", "cabinClass");
