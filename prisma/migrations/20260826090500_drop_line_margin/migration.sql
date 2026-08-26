-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SimpleQuotationLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 1,
    "label" TEXT,
    "packageUnit" INTEGER NOT NULL,
    "bottleBoxCost" REAL NOT NULL DEFAULT 0,
    "setCount" INTEGER NOT NULL DEFAULT 1,
    "packagingMethod" TEXT,
    CONSTRAINT "SimpleQuotationLine_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "SimpleQuotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SimpleQuotationLine" ("bottleBoxCost", "id", "label", "packageUnit", "packagingMethod", "quotationId", "setCount", "sortOrder") SELECT "bottleBoxCost", "id", "label", "packageUnit", "packagingMethod", "quotationId", "setCount", "sortOrder" FROM "SimpleQuotationLine";
DROP TABLE "SimpleQuotationLine";
ALTER TABLE "new_SimpleQuotationLine" RENAME TO "SimpleQuotationLine";
CREATE INDEX "SimpleQuotationLine_quotationId_idx" ON "SimpleQuotationLine"("quotationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

