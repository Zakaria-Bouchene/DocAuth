-- CreateTable
CREATE TABLE "VerificationLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "checkType" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "details" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "anomalyFlags" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("fileUrl", "id", "type", "userId") SELECT "fileUrl", "id", "type", "userId" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" TEXT,
    "nationalId" TEXT,
    "profileStatus" TEXT NOT NULL DEFAULT 'incomplete',
    "trustScore" INTEGER NOT NULL DEFAULT 0,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "specialty" TEXT,
    "licenseNumber" TEXT,
    "institution" TEXT,
    "graduationYear" TEXT,
    "country" TEXT,
    "degreeType" TEXT,
    "practiceType" TEXT,
    "wilaya" TEXT
);
INSERT INTO "new_User" ("country", "email", "graduationYear", "id", "institution", "licenseNumber", "name", "password", "phone", "role", "specialty") SELECT "country", "email", "graduationYear", "id", "institution", "licenseNumber", "name", "password", "phone", "role", "specialty" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
