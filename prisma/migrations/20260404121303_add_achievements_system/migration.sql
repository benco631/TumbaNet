-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "attendeeCount" INTEGER,
ADD COLUMN     "distanceKm" DOUBLE PRECISION,
ADD COLUMN     "passengerCount" INTEGER,
ADD COLUMN     "shortNotice" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MonthlyAchievement" (
    "id" TEXT NOT NULL,
    "achievementKey" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardCoins" INTEGER NOT NULL,
    "metricValue" DOUBLE PRECISION,
    "metricLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoinTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyAchievement_month_year_idx" ON "MonthlyAchievement"("month", "year");

-- CreateIndex
CREATE INDEX "MonthlyAchievement_userId_idx" ON "MonthlyAchievement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyAchievement_achievementKey_month_year_userId_key" ON "MonthlyAchievement"("achievementKey", "month", "year", "userId");

-- CreateIndex
CREATE INDEX "CoinTransaction_userId_createdAt_idx" ON "CoinTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "MonthlyAchievement" ADD CONSTRAINT "MonthlyAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
