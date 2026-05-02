-- AlterTable
ALTER TABLE "User" ADD COLUMN "country" TEXT;
ALTER TABLE "User" ADD COLUMN "graduationYear" TEXT;
ALTER TABLE "User" ADD COLUMN "institution" TEXT;
ALTER TABLE "User" ADD COLUMN "licenseNumber" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "specialty" TEXT;

-- AlterTable
ALTER TABLE "VerificationResult" ADD COLUMN "annotations" TEXT;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "txHash" TEXT,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
