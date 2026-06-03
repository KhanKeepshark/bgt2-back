-- CreateEnum
CREATE TYPE "UserActivityEventType" AS ENUM ('EXPORT');

-- CreateEnum
CREATE TYPE "UserActivityEventStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "UserActivityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "UserActivityEventType" NOT NULL,
    "status" "UserActivityEventStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserActivityEvent_userId_idx" ON "UserActivityEvent"("userId");

-- CreateIndex
CREATE INDEX "UserActivityEvent_userId_type_idx" ON "UserActivityEvent"("userId", "type");

-- CreateIndex
CREATE INDEX "UserActivityEvent_userId_createdAt_idx" ON "UserActivityEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserActivityEvent" ADD CONSTRAINT "UserActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
