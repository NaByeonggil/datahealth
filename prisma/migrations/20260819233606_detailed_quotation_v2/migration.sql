/*
  Warnings:

  - You are about to drop the column `actualQty` on the `DetailedQuotation` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryCost` on the `DetailedQuotation` table. All the data in the column will be lost.
  - You are about to drop the column `designCost` on the `DetailedQuotation` table. All the data in the column will be lost.
  - You are about to drop the column `inspectionCost` on the `DetailedQuotation` table. All the data in the column will be lost.
  - You are about to drop the column `managementCost` on the `DetailedQuotation` table. All the data in the column will be lost.
  - You are about to drop the column `onetimeCost` on the `DetailedQuotation` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "DetailedOverheadItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    CONSTRAINT "DetailedOverheadItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "DetailedQuotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- DataMigration: 고정 컬럼이던 간접제조비 5개 항목을 DetailedOverheadItem 행으로 옮긴다
INSERT INTO "DetailedOverheadItem" ("id", "quotationId", "sortOrder", "name", "amount")
SELECT lower(hex(randomblob(16))), "id", 1, '검사비', "inspectionCost" FROM "DetailedQuotation" WHERE "inspectionCost" > 0;
INSERT INTO "DetailedOverheadItem" ("id", "quotationId", "sortOrder", "name", "amount")
SELECT lower(hex(randomblob(16))), "id", 2, '관리비', "managementCost" FROM "DetailedQuotation" WHERE "managementCost" > 0;
INSERT INTO "DetailedOverheadItem" ("id", "quotationId", "sortOrder", "name", "amount")
SELECT lower(hex(randomblob(16))), "id", 3, '운반비', "deliveryCost" FROM "DetailedQuotation" WHERE "deliveryCost" > 0;
INSERT INTO "DetailedOverheadItem" ("id", "quotationId", "sortOrder", "name", "amount")
SELECT lower(hex(randomblob(16))), "id", 4, '디자인비용', "designCost" FROM "DetailedQuotation" WHERE "designCost" > 0;
INSERT INTO "DetailedOverheadItem" ("id", "quotationId", "sortOrder", "name", "amount")
SELECT lower(hex(randomblob(16))), "id", 5, '1회성비용', "onetimeCost" FROM "DetailedQuotation" WHERE "onetimeCost" > 0;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DetailedMaterialItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "materialId" TEXT,
    "materialName" TEXT NOT NULL,
    "specification" TEXT,
    "mixRatio" REAL NOT NULL DEFAULT 0,
    "contentMg" REAL NOT NULL DEFAULT 0,
    "inputKg" REAL NOT NULL DEFAULT 0,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "totalPrice" REAL NOT NULL DEFAULT 0,
    "functionalContent" TEXT,
    "note" TEXT,
    CONSTRAINT "DetailedMaterialItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "DetailedQuotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DetailedMaterialItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DetailedMaterialItem" ("contentMg", "functionalContent", "id", "inputKg", "materialName", "mixRatio", "note", "quotationId", "sortOrder", "specification", "totalPrice", "unitPrice") SELECT "contentMg", "functionalContent", "id", "inputKg", "materialName", "mixRatio", "note", "quotationId", "sortOrder", "specification", "totalPrice", "unitPrice" FROM "DetailedMaterialItem";
DROP TABLE "DetailedMaterialItem";
ALTER TABLE "new_DetailedMaterialItem" RENAME TO "DetailedMaterialItem";
CREATE TABLE "new_DetailedProcessItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "processId" TEXT,
    "processName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitCost" REAL NOT NULL DEFAULT 0,
    "totalCost" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    CONSTRAINT "DetailedProcessItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "DetailedQuotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DetailedProcessItem_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DetailedProcessItem" ("id", "note", "processName", "quantity", "quotationId", "sortOrder", "totalCost", "unitCost") SELECT "id", "note", "processName", "quantity", "quotationId", "sortOrder", "totalCost", "unitCost" FROM "DetailedProcessItem";
DROP TABLE "DetailedProcessItem";
ALTER TABLE "new_DetailedProcessItem" RENAME TO "DetailedProcessItem";
CREATE TABLE "new_DetailedQuotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationNo" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "customerName" TEXT,
    "customerId" TEXT,
    "productType" TEXT NOT NULL,
    "formType" TEXT,
    "contentAmount" REAL,
    "packageUnit" INTEGER NOT NULL DEFAULT 0,
    "intakeGuide" TEXT,
    "productionQty" INTEGER NOT NULL DEFAULT 0,
    "unitWeight" REAL NOT NULL DEFAULT 0,
    "totalWeight" REAL NOT NULL DEFAULT 0,
    "lossRate" REAL NOT NULL DEFAULT 1.1,
    "yieldRate" REAL NOT NULL DEFAULT 100,
    "theoreticalQty" INTEGER NOT NULL DEFAULT 0,
    "caseQty" INTEGER NOT NULL DEFAULT 0,
    "packagingMethod" TEXT,
    "profitRate" REAL NOT NULL DEFAULT 5,
    "vatRate" REAL NOT NULL DEFAULT 10,
    "finalUnitPrice" REAL NOT NULL DEFAULT 0,
    "materialCost" REAL NOT NULL DEFAULT 0,
    "supplyCost" REAL NOT NULL DEFAULT 0,
    "processCost" REAL NOT NULL DEFAULT 0,
    "overheadCost" REAL NOT NULL DEFAULT 0,
    "costSubtotal" REAL NOT NULL DEFAULT 0,
    "profitAmount" REAL NOT NULL DEFAULT 0,
    "unitPriceExVat" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "validUntil" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DetailedQuotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DetailedQuotation" ("contentAmount", "createdAt", "customerName", "formType", "id", "intakeGuide", "note", "packageUnit", "packagingMethod", "productName", "productType", "productionQty", "profitRate", "quotationNo", "totalWeight", "unitWeight", "updatedAt", "yieldRate", "caseQty", "overheadCost") SELECT "contentAmount", "createdAt", "customerName", "formType", "id", "intakeGuide", "note", "packageUnit", "packagingMethod", "productName", "productType", "productionQty", "profitRate", "quotationNo", "totalWeight", "unitWeight", "updatedAt", "yieldRate", "actualQty", COALESCE("inspectionCost",0) + COALESCE("managementCost",0) + COALESCE("deliveryCost",0) + COALESCE("designCost",0) + COALESCE("onetimeCost",0) FROM "DetailedQuotation";
DROP TABLE "DetailedQuotation";
ALTER TABLE "new_DetailedQuotation" RENAME TO "DetailedQuotation";
CREATE UNIQUE INDEX "DetailedQuotation_quotationNo_key" ON "DetailedQuotation"("quotationNo");
CREATE TABLE "new_DetailedSupplyItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "supplyId" TEXT,
    "supplyName" TEXT NOT NULL,
    "specification" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "inputQty" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "totalPrice" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    CONSTRAINT "DetailedSupplyItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "DetailedQuotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DetailedSupplyItem_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DetailedSupplyItem" ("id", "inputQty", "note", "quantity", "quotationId", "sortOrder", "specification", "supplyName", "totalPrice", "unitPrice") SELECT "id", "inputQty", "note", "quantity", "quotationId", "sortOrder", "specification", "supplyName", "totalPrice", "unitPrice" FROM "DetailedSupplyItem";
DROP TABLE "DetailedSupplyItem";
ALTER TABLE "new_DetailedSupplyItem" RENAME TO "DetailedSupplyItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
