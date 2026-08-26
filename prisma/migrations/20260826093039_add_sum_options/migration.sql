-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
INSERT INTO "new_SimpleQuotation" ("createdAt", "customerContact", "customerFax", "customerName", "customerPhone", "deliveryTerms", "dosage", "id", "note", "paymentTerms", "productName", "productSpec", "productTypeId", "quotationNo", "subMaterialCostPerUnit", "totalAmount", "totalMaterialCost", "updatedAt", "validDays") SELECT "createdAt", "customerContact", "customerFax", "customerName", "customerPhone", "deliveryTerms", "dosage", "id", "note", "paymentTerms", "productName", "productSpec", "productTypeId", "quotationNo", "subMaterialCostPerUnit", "totalAmount", "totalMaterialCost", "updatedAt", "validDays" FROM "SimpleQuotation";
DROP TABLE "SimpleQuotation";
ALTER TABLE "new_SimpleQuotation" RENAME TO "SimpleQuotation";
CREATE UNIQUE INDEX "SimpleQuotation_quotationNo_key" ON "SimpleQuotation"("quotationNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
