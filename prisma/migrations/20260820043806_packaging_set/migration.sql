-- CreateTable
CREATE TABLE "PackagingSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productTypeId" TEXT,
    "formName" TEXT,
    "capacity" REAL,
    "capacityUnit" TEXT,
    "vendorId" TEXT,
    "vendorName" TEXT,
    "effectiveDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "sourceFile" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PackagingSet_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PackagingSet_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackagingSetItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "setId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 1,
    "supplyId" TEXT,
    "name" TEXT NOT NULL,
    "spec" TEXT,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "qtyPerUnit" REAL NOT NULL DEFAULT 1,
    "isFreeIssue" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    CONSTRAINT "PackagingSetItem_setId_fkey" FOREIGN KEY ("setId") REFERENCES "PackagingSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PackagingSetItem_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PackagingSet_code_key" ON "PackagingSet"("code");
