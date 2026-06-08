-- AlterTable
ALTER TABLE "User" ADD COLUMN "operationsArchivalNotifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OperationMonthlyRollup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "yearMonth" TIMESTAMP(3) NOT NULL,
    "type" "OperationType" NOT NULL,
    "categoryId" TEXT,
    "accountId" TEXT,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "operationCount" INTEGER NOT NULL,
    "categoryName" VARCHAR(100),
    "categoryIcon" VARCHAR(50),
    "accountName" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationMonthlyRollup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationMonthlyRollup_userId_yearMonth_idx" ON "OperationMonthlyRollup"("userId", "yearMonth");

-- AddForeignKey
ALTER TABLE "OperationMonthlyRollup" ADD CONSTRAINT "OperationMonthlyRollup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Expression unique index for nullable categoryId/accountId buckets
CREATE UNIQUE INDEX "OperationMonthlyRollup_unique_bucket"
ON "OperationMonthlyRollup" (
  "userId",
  "yearMonth",
  "type",
  COALESCE("categoryId", ''),
  COALESCE("accountId", '')
);
