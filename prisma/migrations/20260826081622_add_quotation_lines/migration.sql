-- CreateTable
CREATE TABLE "SimpleQuotationLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 1,
    "label" TEXT,
    "packageUnit" INTEGER NOT NULL,
    "bottleBoxCost" REAL NOT NULL DEFAULT 0,
    "setCount" INTEGER NOT NULL DEFAULT 1,
    "packagingMethod" TEXT,
    "marginRate" REAL NOT NULL DEFAULT 0,
    "sellingUnitPrice" REAL,
    CONSTRAINT "SimpleQuotationLine_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "SimpleQuotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SimpleQuotationLine_quotationId_idx" ON "SimpleQuotationLine"("quotationId");
