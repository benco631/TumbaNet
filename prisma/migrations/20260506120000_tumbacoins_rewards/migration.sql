-- TumbaCoins Rewards System Migration
-- Adds: RewardLog, groupId on CoinTransaction, groupId on MonthlyAchievement

-- 1. CoinTransaction: add groupId + foreign key + index
ALTER TABLE "CoinTransaction" ADD COLUMN "groupId" TEXT;
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "CoinTransaction_groupId_idx" ON "CoinTransaction"("groupId");

-- 2. MonthlyAchievement: add groupId, update unique constraint, add foreign key + index
ALTER TABLE "MonthlyAchievement" ADD COLUMN "groupId" TEXT;
DROP INDEX IF EXISTS "MonthlyAchievement_achievementKey_month_year_userId_key";
CREATE UNIQUE INDEX "MonthlyAchievement_achievementKey_month_year_userId_groupId_key"
  ON "MonthlyAchievement"("achievementKey", "month", "year", "userId", "groupId");
ALTER TABLE "MonthlyAchievement" ADD CONSTRAINT "MonthlyAchievement_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "MonthlyAchievement_groupId_idx" ON "MonthlyAchievement"("groupId");

-- 3. RewardLog: new table for idempotency of join bonus + weekly allowance
CREATE TABLE "RewardLog" (
    "id"              TEXT         NOT NULL,
    "userId"          TEXT         NOT NULL,
    "groupId"         TEXT         NOT NULL,
    "rewardType"      TEXT         NOT NULL,
    "periodStartDate" TIMESTAMP(3) NOT NULL,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RewardLog_userId_groupId_rewardType_periodStartDate_key"
  ON "RewardLog"("userId", "groupId", "rewardType", "periodStartDate");
CREATE INDEX "RewardLog_groupId_idx" ON "RewardLog"("groupId");
CREATE INDEX "RewardLog_userId_idx"  ON "RewardLog"("userId");
ALTER TABLE "RewardLog" ADD CONSTRAINT "RewardLog_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RewardLog" ADD CONSTRAINT "RewardLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
