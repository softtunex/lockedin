-- CreateTable
CREATE TABLE "RecurringTaskTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "frequency" TEXT NOT NULL,
    "intervalDays" INTEGER,
    "daysOfWeek" TEXT,
    "anchorDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringTaskTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "parentGoalId" TEXT,
    "stepTemplateId" TEXT,
    "recurringTemplateId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isPenaltyTask" BOOLEAN NOT NULL DEFAULT false,
    "testDeadline" DATETIME,
    "lastSnoozedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DailyTask_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "Goal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DailyTask_recurringTemplateId_fkey" FOREIGN KEY ("recurringTemplateId") REFERENCES "RecurringTaskTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DailyTask" ("createdAt", "description", "id", "isMuted", "isPenaltyTask", "lastSnoozedAt", "parentGoalId", "scheduledDate", "status", "testDeadline", "title", "updatedAt", "userId") SELECT "createdAt", "description", "id", "isMuted", "isPenaltyTask", "lastSnoozedAt", "parentGoalId", "scheduledDate", "status", "testDeadline", "title", "updatedAt", "userId" FROM "DailyTask";
DROP TABLE "DailyTask";
ALTER TABLE "new_DailyTask" RENAME TO "DailyTask";
CREATE INDEX "DailyTask_userId_scheduledDate_idx" ON "DailyTask"("userId", "scheduledDate");
CREATE INDEX "DailyTask_parentGoalId_idx" ON "DailyTask"("parentGoalId");
CREATE INDEX "DailyTask_recurringTemplateId_idx" ON "DailyTask"("recurringTemplateId");
CREATE TABLE "new_EmergencyPassUse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "buddyUserId" TEXT NOT NULL,
    "dailyTaskId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME,
    CONSTRAINT "EmergencyPassUse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmergencyPassUse_buddyUserId_fkey" FOREIGN KEY ("buddyUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- buddyUserId backfilled from the old single-buddy User.buddyId cache (still
-- present on the not-yet-redefined "User" table at this point in the script)
-- since every existing EmergencyPassUse predates multi-buddy support.
INSERT INTO "new_EmergencyPassUse" ("id", "userId", "buddyUserId", "dailyTaskId", "status", "requestedAt", "respondedAt")
SELECT e."id", e."userId", u."buddyId", e."dailyTaskId", e."status", e."requestedAt", e."respondedAt"
FROM "EmergencyPassUse" e JOIN "User" u ON u."id" = e."userId";
DROP TABLE "EmergencyPassUse";
ALTER TABLE "new_EmergencyPassUse" RENAME TO "EmergencyPassUse";
CREATE INDEX "EmergencyPassUse_userId_requestedAt_idx" ON "EmergencyPassUse"("userId", "requestedAt");
CREATE INDEX "EmergencyPassUse_buddyUserId_idx" ON "EmergencyPassUse"("buddyUserId");
CREATE TABLE "new_ProofVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proofOfWorkId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "isMandatoryResolution" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "ProofVerification_proofOfWorkId_fkey" FOREIGN KEY ("proofOfWorkId") REFERENCES "ProofOfWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProofVerification_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProofVerification" ("createdAt", "id", "proofOfWorkId", "rejectionReason", "reviewedAt", "reviewerId", "status") SELECT "createdAt", "id", "proofOfWorkId", "rejectionReason", "reviewedAt", "reviewerId", "status" FROM "ProofVerification";
DROP TABLE "ProofVerification";
ALTER TABLE "new_ProofVerification" RENAME TO "ProofVerification";
CREATE INDEX "ProofVerification_reviewerId_idx" ON "ProofVerification"("reviewerId");
CREATE INDEX "ProofVerification_proofOfWorkId_idx" ON "ProofVerification"("proofOfWorkId");
CREATE UNIQUE INDEX "ProofVerification_proofOfWorkId_reviewerId_key" ON "ProofVerification"("proofOfWorkId", "reviewerId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "penaltyPreference" TEXT NOT NULL DEFAULT 'MANDATORY_TASK',
    "accountabilityEmail" TEXT,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "penaltyStakeAmount" REAL,
    "penaltyOwedTotal" REAL NOT NULL DEFAULT 0,
    "walletBalance" REAL NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "reminderTimes" TEXT NOT NULL DEFAULT '["09:00","14:00","20:00"]',
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "lastSweepDate" DATETIME,
    "username" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("accountabilityEmail", "createdAt", "currentStreak", "email", "id", "lastSweepDate", "longestStreak", "name", "onboardingComplete", "passwordHash", "penaltyOwedTotal", "penaltyPreference", "penaltyStakeAmount", "reminderTimes", "updatedAt", "username", "walletBalance") SELECT "accountabilityEmail", "createdAt", "currentStreak", "email", "id", "lastSweepDate", "longestStreak", "name", "onboardingComplete", "passwordHash", "penaltyOwedTotal", "penaltyPreference", "penaltyStakeAmount", "reminderTimes", "updatedAt", "username", "walletBalance" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "RecurringTaskTemplate_userId_idx" ON "RecurringTaskTemplate"("userId");

-- Data backfill: STREAK_RESET is no longer a selectable penaltyPreference
-- (streak death is now compulsory app-wide, not a per-user opt-in) — move
-- anyone still on it to the new default so no account is left holding an
-- unselectable value.
UPDATE "User" SET "penaltyPreference" = 'MANDATORY_TASK' WHERE "penaltyPreference" = 'STREAK_RESET';
