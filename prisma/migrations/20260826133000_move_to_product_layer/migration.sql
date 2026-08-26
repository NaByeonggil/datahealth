-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SimpleQuotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationNo" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "customerName" TEXT,
    "customerContact" TEXT,
    "customerPhone" TEXT,
    "customerFax" TEXT,
    "validDays" INTEGER NOT NULL DEFAULT 30,
    "deliveryTerms" TEXT,
    "paymentTerms" TEXT,
    "foodType" TEXT NOT NULL DEFAULT '건강기능식품',
    "sumOptions" BOOLEAN NOT NULL DEFAULT false,
    "totalMaterialCost" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SimpleQuotation" ("createdAt", "customerContact", "customerFax", "customerName", "customerPhone", "deliveryTerms", "foodType", "id", "note", "paymentTerms", "productName", "quotationNo", "sumOptions", "totalAmount", "totalMaterialCost", "updatedAt", "validDays") SELECT "createdAt", "customerContact", "customerFax", "customerName", "customerPhone", "deliveryTerms", "foodType", "id", "note", "paymentTerms", "productName", "quotationNo", "sumOptions", "totalAmount", "totalMaterialCost", "updatedAt", "validDays" FROM "SimpleQuotation";
DROP TABLE "SimpleQuotation";
ALTER TABLE "new_SimpleQuotation" RENAME TO "SimpleQuotation";
CREATE UNIQUE INDEX "SimpleQuotation_quotationNo_key" ON "SimpleQuotation"("quotationNo");
CREATE TABLE "new_SimpleQuotationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '주원료',
    "materialName" TEXT NOT NULL,
    "theoryAmount" REAL NOT NULL DEFAULT 0,
    "actualAmount" REAL NOT NULL DEFAULT 0,
    "kgUnitPrice" REAL NOT NULL DEFAULT 0,
    "materialCost" REAL NOT NULL DEFAULT 0,
    "origin" TEXT,
    CONSTRAINT "SimpleQuotationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SimpleQuotationProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SimpleQuotationItem" ("actualAmount", "category", "id", "kgUnitPrice", "materialCost", "materialName", "origin", "productId", "role", "sortOrder", "theoryAmount") SELECT "actualAmount", "category", "id", "kgUnitPrice", "materialCost", "materialName", "origin", "productId", "role", "sortOrder", "theoryAmount" FROM "SimpleQuotationItem";
DROP TABLE "SimpleQuotationItem";
ALTER TABLE "new_SimpleQuotationItem" RENAME TO "SimpleQuotationItem";
CREATE TABLE "new_SimpleQuotationLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 1,
    "label" TEXT,
    "packageUnit" INTEGER NOT NULL,
    "bottleBoxCost" REAL NOT NULL DEFAULT 0,
    "setCount" INTEGER NOT NULL DEFAULT 1,
    "packagingMethod" TEXT,
    "unit" TEXT NOT NULL DEFAULT '박스',
    CONSTRAINT "SimpleQuotationLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SimpleQuotationProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SimpleQuotationLine" ("bottleBoxCost", "id", "label", "packageUnit", "packagingMethod", "productId", "setCount", "sortOrder", "unit") SELECT "bottleBoxCost", "id", "label", "packageUnit", "packagingMethod", "productId", "setCount", "sortOrder", "unit" FROM "SimpleQuotationLine";
DROP TABLE "SimpleQuotationLine";
ALTER TABLE "new_SimpleQuotationLine" RENAME TO "SimpleQuotationLine";
CREATE INDEX "SimpleQuotationLine_productId_idx" ON "SimpleQuotationLine"("productId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

