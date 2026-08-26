-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QuotationNoteTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "appliesTo" TEXT NOT NULL DEFAULT 'ALL',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_QuotationNoteTemplate" ("content", "createdAt", "id", "isActive", "sortOrder", "updatedAt") SELECT "content", "createdAt", "id", "isActive", "sortOrder", "updatedAt" FROM "QuotationNoteTemplate";
DROP TABLE "QuotationNoteTemplate";
ALTER TABLE "new_QuotationNoteTemplate" RENAME TO "QuotationNoteTemplate";
CREATE INDEX "QuotationNoteTemplate_sortOrder_idx" ON "QuotationNoteTemplate"("sortOrder");
CREATE TABLE "new_SimpleQuotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationNo" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "customerName" TEXT,
    "productTypeId" TEXT NOT NULL,
    "subMaterialCostPerUnit" REAL NOT NULL DEFAULT 20,
    "customerContact" TEXT,
    "customerPhone" TEXT,
    "customerFax" TEXT,
    "validDays" INTEGER NOT NULL DEFAULT 30,
    "deliveryTerms" TEXT,
    "paymentTerms" TEXT,
    "foodType" TEXT NOT NULL DEFAULT '건강기능식품',
    "productSpec" TEXT,
    "dosage" TEXT,
    "sumOptions" BOOLEAN NOT NULL DEFAULT false,
    "totalMaterialCost" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SimpleQuotation_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SimpleQuotation" ("createdAt", "customerContact", "customerFax", "customerName", "customerPhone", "deliveryTerms", "dosage", "id", "note", "paymentTerms", "productName", "productSpec", "productTypeId", "quotationNo", "subMaterialCostPerUnit", "sumOptions", "totalAmount", "totalMaterialCost", "updatedAt", "validDays") SELECT "createdAt", "customerContact", "customerFax", "customerName", "customerPhone", "deliveryTerms", "dosage", "id", "note", "paymentTerms", "productName", "productSpec", "productTypeId", "quotationNo", "subMaterialCostPerUnit", "sumOptions", "totalAmount", "totalMaterialCost", "updatedAt", "validDays" FROM "SimpleQuotation";
DROP TABLE "SimpleQuotation";
ALTER TABLE "new_SimpleQuotation" RENAME TO "SimpleQuotation";
CREATE UNIQUE INDEX "SimpleQuotation_quotationNo_key" ON "SimpleQuotation"("quotationNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

