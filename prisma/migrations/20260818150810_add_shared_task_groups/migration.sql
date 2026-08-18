-- AlterTable
ALTER TABLE "DailyTask" ADD COLUMN     "sharedGroupId" TEXT;

-- CreateTable
CREATE TABLE "SharedTaskGroup" (
    "id" TEXT NOT NULL,
    "completionMode" TEXT NOT NULL DEFAULT 'INDEPENDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedTaskGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyTask_sharedGroupId_idx" ON "DailyTask"("sharedGroupId");

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_sharedGroupId_fkey" FOREIGN KEY ("sharedGroupId") REFERENCES "SharedTaskGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
