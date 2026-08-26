-- CreateTable
CREATE TABLE "CompanyInfo" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT '',
    "ceo" TEXT NOT NULL DEFAULT '',
    "bizNo" TEXT NOT NULL DEFAULT '',
    "manager" TEXT NOT NULL DEFAULT '',
    "tel" TEXT NOT NULL DEFAULT '',
    "fax" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "bizType" TEXT NOT NULL DEFAULT '',
    "bizItem" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
