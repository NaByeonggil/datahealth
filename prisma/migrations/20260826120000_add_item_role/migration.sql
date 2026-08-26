-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SimpleQuotationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '주원료',
    "materialName" TEXT NOT NULL,
    "theoryAmount" REAL NOT NULL DEFAULT 0,
    "actualAmount" REAL NOT NULL DEFAULT 0,
    "kgUnitPrice" REAL NOT NULL DEFAULT 0,
    "materialCost" REAL NOT NULL DEFAULT 0,
    "origin" TEXT,
    CONSTRAINT "SimpleQuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "SimpleQuotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SimpleQuotationItem" ("actualAmount", "category", "id", "kgUnitPrice", "materialCost", "materialName", "origin", "quotationId", "sortOrder", "theoryAmount") SELECT "actualAmount", "category", "id", "kgUnitPrice", "materialCost", "materialName", "origin", "quotationId", "sortOrder", "theoryAmount" FROM "SimpleQuotationItem";
DROP TABLE "SimpleQuotationItem";
ALTER TABLE "new_SimpleQuotationItem" RENAME TO "SimpleQuotationItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

