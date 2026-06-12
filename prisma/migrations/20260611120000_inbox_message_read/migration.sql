-- CreateTable
CREATE TABLE "InboxMessageRead" (
    "userId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboxMessageRead_pkey" PRIMARY KEY ("userId","notificationId")
);

-- CreateIndex
CREATE INDEX "InboxMessageRead_notificationId_idx" ON "InboxMessageRead"("notificationId");

-- AddForeignKey
ALTER TABLE "InboxMessageRead" ADD CONSTRAINT "InboxMessageRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxMessageRead" ADD CONSTRAINT "InboxMessageRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropColumn
ALTER TABLE "User" DROP COLUMN "lastGlobalNotificationReadAt";
