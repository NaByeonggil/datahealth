-- CreateTable
CREATE TABLE "SimpleQuotationProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "productTypeId" TEXT NOT NULL,
    "subMaterialCostPerUnit" REAL NOT NULL DEFAULT 20,
    "productSpec" TEXT,
    "dosage" TEXT,
    CONSTRAINT "SimpleQuotationProduct_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "SimpleQuotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SimpleQuotationProduct_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SimpleQuotationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "productId" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '주원료',
    "materialName" TEXT NOT NULL,
    "theoryAmount" REAL NOT NULL DEFAULT 0,
    "actualAmount" REAL NOT NULL DEFAULT 0,
    "kgUnitPrice" REAL NOT NULL DEFAULT 0,
    "materialCost" REAL NOT NULL DEFAULT 0,
    "origin" TEXT,
    CONSTRAINT "SimpleQuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "SimpleQuotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SimpleQuotationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SimpleQuotationProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SimpleQuotationItem" ("actualAmount", "category", "id", "kgUnitPrice", "materialCost", "materialName", "origin", "quotationId", "role", "sortOrder", "theoryAmount") SELECT "actualAmount", "category", "id", "kgUnitPrice", "materialCost", "materialName", "origin", "quotationId", "role", "sortOrder", "theoryAmount" FROM "SimpleQuotationItem";
DROP TABLE "SimpleQuotationItem";
ALTER TABLE "new_SimpleQuotationItem" RENAME TO "SimpleQuotationItem";
CREATE TABLE "new_SimpleQuotationLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "productId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 1,
    "label" TEXT,
    "packageUnit" INTEGER NOT NULL,
    "bottleBoxCost" REAL NOT NULL DEFAULT 0,
    "setCount" INTEGER NOT NULL DEFAULT 1,
    "packagingMethod" TEXT,
    "unit" TEXT NOT NULL DEFAULT '박스',
    CONSTRAINT "SimpleQuotationLine_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "SimpleQuotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SimpleQuotationLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SimpleQuotationProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SimpleQuotationLine" ("bottleBoxCost", "id", "label", "packageUnit", "packagingMethod", "quotationId", "setCount", "sortOrder") SELECT "bottleBoxCost", "id", "label", "packageUnit", "packagingMethod", "quotationId", "setCount", "sortOrder" FROM "SimpleQuotationLine";
DROP TABLE "SimpleQuotationLine";
ALTER TABLE "new_SimpleQuotationLine" RENAME TO "SimpleQuotationLine";
CREATE INDEX "SimpleQuotationLine_quotationId_idx" ON "SimpleQuotationLine"("quotationId");
CREATE INDEX "SimpleQuotationLine_productId_idx" ON "SimpleQuotationLine"("productId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SimpleQuotationProduct_quotationId_idx" ON "SimpleQuotationProduct"("quotationId");

