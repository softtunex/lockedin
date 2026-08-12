-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "earnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "penaltyPreference" TEXT NOT NULL DEFAULT 'STREAK_RESET',
    "accountabilityEmail" TEXT,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "penaltyStakeAmount" REAL,
    "penaltyOwedTotal" REAL NOT NULL DEFAULT 0,
    "walletBalance" REAL NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "reminderTimes" TEXT NOT NULL DEFAULT '["09:00","14:00","20:00"]',
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "lastSweepDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("accountabilityEmail", "createdAt", "currentStreak", "email", "id", "lastSweepDate", "name", "onboardingComplete", "passwordHash", "penaltyOwedTotal", "penaltyPreference", "penaltyStakeAmount", "reminderTimes", "updatedAt") SELECT "accountabilityEmail", "createdAt", "currentStreak", "email", "id", "lastSweepDate", "name", "onboardingComplete", "passwordHash", "penaltyOwedTotal", "penaltyPreference", "penaltyStakeAmount", "reminderTimes", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "WalletTransaction_userId_idx" ON "WalletTransaction"("userId");

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeKey_key" ON "UserBadge"("userId", "badgeKey");
