-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MaterialPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "changedBy" TEXT,
    "changeReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaterialPrice_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MaterialPrice" ("changedBy", "createdAt", "effectiveDate", "endDate", "id", "materialId", "price") SELECT "changedBy", "createdAt", "effectiveDate", "endDate", "id", "materialId", "price" FROM "MaterialPrice";
DROP TABLE "MaterialPrice";
ALTER TABLE "new_MaterialPrice" RENAME TO "MaterialPrice";
CREATE INDEX "MaterialPrice_materialId_endDate_idx" ON "MaterialPrice"("materialId", "endDate");
CREATE TABLE "new_SimpleQuotationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '주원료',
    "materialId" TEXT,
    "materialName" TEXT NOT NULL,
    "theoryAmount" REAL NOT NULL DEFAULT 0,
    "actualAmount" REAL NOT NULL DEFAULT 0,
    "kgUnitPrice" REAL NOT NULL DEFAULT 0,
    "materialCost" REAL NOT NULL DEFAULT 0,
    "origin" TEXT,
    CONSTRAINT "SimpleQuotationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SimpleQuotationProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SimpleQuotationItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SimpleQuotationItem" ("actualAmount", "category", "id", "kgUnitPrice", "materialCost", "materialName", "origin", "productId", "role", "sortOrder", "theoryAmount") SELECT "actualAmount", "category", "id", "kgUnitPrice", "materialCost", "materialName", "origin", "productId", "role", "sortOrder", "theoryAmount" FROM "SimpleQuotationItem";
DROP TABLE "SimpleQuotationItem";
ALTER TABLE "new_SimpleQuotationItem" RENAME TO "SimpleQuotationItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
