-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "penaltyPreference" TEXT NOT NULL DEFAULT 'MANDATORY_TASK',
    "accountabilityEmail" TEXT,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "penaltyStakeAmount" DOUBLE PRECISION,
    "penaltyOwedTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "reminderTimes" TEXT NOT NULL DEFAULT '["09:00","14:00","20:00"]',
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "lastSweepDate" TIMESTAMP(3),
    "username" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "timeframe" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "targetCompletionDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dailyStepTemplates" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentGoalId" TEXT,
    "stepTemplateId" TEXT,
    "recurringTemplateId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isPenaltyTask" BOOLEAN NOT NULL DEFAULT false,
    "testDeadline" TIMESTAMP(3),
    "lastSnoozedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofOfWork" (
    "id" TEXT NOT NULL,
    "dailyTaskId" TEXT NOT NULL,
    "proofType" TEXT NOT NULL,
    "proofData" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofOfWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenaltyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyTaskId" TEXT NOT NULL,
    "penaltyType" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PenaltyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuddyInvite" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT,
    "toEmail" TEXT,
    "inviteCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "BuddyInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuddyPair" (
    "id" TEXT NOT NULL,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "pairedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unpairedAt" TIMESTAMP(3),

    CONSTRAINT "BuddyPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofVerification" (
    "id" TEXT NOT NULL,
    "proofOfWorkId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "isMandatoryResolution" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ProofVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyPassUse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "buddyUserId" TEXT NOT NULL,
    "dailyTaskId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "EmergencyPassUse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuddyMessage" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuddyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringTaskTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "frequency" TEXT NOT NULL,
    "intervalDays" INTEGER,
    "daysOfWeek" TEXT,
    "anchorDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "DailyTask_userId_scheduledDate_idx" ON "DailyTask"("userId", "scheduledDate");

-- CreateIndex
CREATE INDEX "DailyTask_parentGoalId_idx" ON "DailyTask"("parentGoalId");

-- CreateIndex
CREATE INDEX "DailyTask_recurringTemplateId_idx" ON "DailyTask"("recurringTemplateId");

-- CreateIndex
CREATE INDEX "ProofOfWork_dailyTaskId_idx" ON "ProofOfWork"("dailyTaskId");

-- CreateIndex
CREATE INDEX "PenaltyLog_userId_idx" ON "PenaltyLog"("userId");

-- CreateIndex
CREATE INDEX "PenaltyLog_dailyTaskId_idx" ON "PenaltyLog"("dailyTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "WalletTransaction_userId_idx" ON "WalletTransaction"("userId");

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeKey_key" ON "UserBadge"("userId", "badgeKey");

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
CREATE INDEX "ProofVerification_reviewerId_idx" ON "ProofVerification"("reviewerId");

-- CreateIndex
CREATE INDEX "ProofVerification_proofOfWorkId_idx" ON "ProofVerification"("proofOfWorkId");

-- CreateIndex
CREATE UNIQUE INDEX "ProofVerification_proofOfWorkId_reviewerId_key" ON "ProofVerification"("proofOfWorkId", "reviewerId");

-- CreateIndex
CREATE INDEX "EmergencyPassUse_userId_requestedAt_idx" ON "EmergencyPassUse"("userId", "requestedAt");

-- CreateIndex
CREATE INDEX "EmergencyPassUse_buddyUserId_idx" ON "EmergencyPassUse"("buddyUserId");

-- CreateIndex
CREATE INDEX "BuddyMessage_fromUserId_idx" ON "BuddyMessage"("fromUserId");

-- CreateIndex
CREATE INDEX "BuddyMessage_toUserId_idx" ON "BuddyMessage"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "RecurringTaskTemplate_userId_idx" ON "RecurringTaskTemplate"("userId");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_recurringTemplateId_fkey" FOREIGN KEY ("recurringTemplateId") REFERENCES "RecurringTaskTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfWork" ADD CONSTRAINT "ProofOfWork_dailyTaskId_fkey" FOREIGN KEY ("dailyTaskId") REFERENCES "DailyTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyLog" ADD CONSTRAINT "PenaltyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyLog" ADD CONSTRAINT "PenaltyLog_dailyTaskId_fkey" FOREIGN KEY ("dailyTaskId") REFERENCES "DailyTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuddyInvite" ADD CONSTRAINT "BuddyInvite_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuddyInvite" ADD CONSTRAINT "BuddyInvite_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuddyPair" ADD CONSTRAINT "BuddyPair_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuddyPair" ADD CONSTRAINT "BuddyPair_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofVerification" ADD CONSTRAINT "ProofVerification_proofOfWorkId_fkey" FOREIGN KEY ("proofOfWorkId") REFERENCES "ProofOfWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofVerification" ADD CONSTRAINT "ProofVerification_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyPassUse" ADD CONSTRAINT "EmergencyPassUse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyPassUse" ADD CONSTRAINT "EmergencyPassUse_buddyUserId_fkey" FOREIGN KEY ("buddyUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuddyMessage" ADD CONSTRAINT "BuddyMessage_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuddyMessage" ADD CONSTRAINT "BuddyMessage_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTaskTemplate" ADD CONSTRAINT "RecurringTaskTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

