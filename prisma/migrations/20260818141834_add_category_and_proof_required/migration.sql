-- AlterTable
ALTER TABLE "DailyTask" ADD COLUMN     "category" TEXT,
ADD COLUMN     "proofRequired" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "RecurringTaskTemplate" ADD COLUMN     "category" TEXT,
ADD COLUMN     "proofRequired" BOOLEAN NOT NULL DEFAULT true;
