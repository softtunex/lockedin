-- AlterTable
ALTER TABLE "User" ADD COLUMN "buddyId" TEXT;
ALTER TABLE "User" ADD COLUMN "buddyRole" TEXT;
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- CreateTable
CREATE TABLE "BuddyInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT,
    "toEmail" TEXT,
    "inviteCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME,
    CONSTRAINT "BuddyInvite_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BuddyInvite_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BuddyPair" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "pairedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unpairedAt" DATETIME,
    CONSTRAINT "BuddyPair_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BuddyPair_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProofVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proofOfWorkId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "ProofVerification_proofOfWorkId_fkey" FOREIGN KEY ("proofOfWorkId") REFERENCES "ProofOfWork" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProofVerification_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmergencyPassUse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dailyTaskId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME,
    CONSTRAINT "EmergencyPassUse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BuddyInvite_inviteCode_key" ON "BuddyInvite"("inviteCode");

-- CreateIndex
CREATE INDEX "BuddyInvite_fromUserId_idx" ON "BuddyInvite"("fromUserId");

-- CreateIndex
CREATE INDEX "BuddyInvite_toUserId_idx" ON "BuddyInvite"("toUserId");

-- CreateIndex
CREATE INDEX "BuddyPair_user1Id_idx" ON "BuddyPair"("user1Id");

-- CreateIndex
CREATE INDEX "BuddyPair_user2Id_idx" ON "BuddyPair"("user2Id");

-- CreateIndex
CREATE UNIQUE INDEX "ProofVerification_proofOfWorkId_key" ON "ProofVerification"("proofOfWorkId");

-- CreateIndex
CREATE INDEX "ProofVerification_reviewerId_idx" ON "ProofVerification"("reviewerId");

-- CreateIndex
CREATE INDEX "EmergencyPassUse_userId_requestedAt_idx" ON "EmergencyPassUse"("userId", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

