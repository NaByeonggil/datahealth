-- AlterTable
ALTER TABLE "ProductType" ADD COLUMN "category" TEXT;
ALTER TABLE "ProductType" ADD COLUMN "defaultMoq" INTEGER;
ALTER TABLE "ProductType" ADD COLUMN "formCode" TEXT;

-- CreateTable
CREATE TABLE "TollingRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT,
    "vendorName" TEXT NOT NULL,
    "productTypeId" TEXT,
    "formName" TEXT NOT NULL,
    "formCode" TEXT,
    "specLabel" TEXT,
    "specMin" REAL,
    "specMax" REAL,
    "specUnit" TEXT,
    "qtyMin" INTEGER NOT NULL DEFAULT 0,
    "qtyMax" INTEGER,
    "unitCost" REAL NOT NULL DEFAULT 0,
    "costBasis" TEXT NOT NULL DEFAULT 'per_unit',
    "supplyMode" TEXT NOT NULL DEFAULT 'bulk',
    "vendorPrice" REAL,
    "ownMargin" REAL,
    "includesProfit" BOOLEAN NOT NULL DEFAULT false,
    "includesVat" BOOLEAN NOT NULL DEFAULT false,
    "isNegotiable" BOOLEAN NOT NULL DEFAULT false,
    "isConfidential" BOOLEAN NOT NULL DEFAULT false,
    "effectiveDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "sourceFile" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TollingRate_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TollingRate_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TollingExtra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "vendorId" TEXT,
    "vendorName" TEXT,
    "productTypeId" TEXT,
    "formName" TEXT,
    "calcType" TEXT NOT NULL DEFAULT 'per_unit',
    "amount" REAL NOT NULL DEFAULT 0,
    "percentBase" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT true,
    "condition" TEXT,
    "effectiveDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "sourceFile" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TollingExtra_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TollingExtra_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'material',
    "contact" TEXT,
    "manager" TEXT,
    "address" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Supplier" ("address", "code", "contact", "createdAt", "email", "id", "isActive", "manager", "name", "updatedAt") SELECT "address", "code", "contact", "createdAt", "email", "id", "isActive", "manager", "name", "updatedAt" FROM "Supplier";
DROP TABLE "Supplier";
ALTER TABLE "new_Supplier" RENAME TO "Supplier";
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");
CREATE TABLE "new_Supply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '개',
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "specification" TEXT,
    "supplierId" TEXT,
    "capacity" REAL,
    "capacityUnit" TEXT,
    "color" TEXT,
    "printed" TEXT,
    "origin" TEXT,
    "vialType" TEXT,
    "boxQty" INTEGER,
    "moq" INTEGER,
    "effectiveDate" DATETIME,
    "sourceFile" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Supply_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Supply" ("code", "createdAt", "id", "isActive", "name", "note", "specification", "unit", "unitPrice", "updatedAt") SELECT "code", "createdAt", "id", "isActive", "name", "note", "specification", "unit", "unitPrice", "updatedAt" FROM "Supply";
DROP TABLE "Supply";
ALTER TABLE "new_Supply" RENAME TO "Supply";
CREATE UNIQUE INDEX "Supply_code_key" ON "Supply"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TollingRate_formName_qtyMin_idx" ON "TollingRate"("formName", "qtyMin");

-- CreateIndex
CREATE INDEX "TollingRate_vendorName_idx" ON "TollingRate"("vendorName");
