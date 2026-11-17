-- CreateTable
CREATE TABLE "EndOfDayReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reportDate" DATETIME NOT NULL,
    "doorsKnocked" INTEGER NOT NULL DEFAULT 0,
    "conversations" INTEGER NOT NULL DEFAULT 0,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "callbacksOpen" INTEGER NOT NULL DEFAULT 0,
    "wins" TEXT,
    "challenges" TEXT,
    "tomorrowFocus" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "clientRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EndOfDayReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EndOfDayReport_userId_clientRef_key" ON "EndOfDayReport"("userId", "clientRef");
