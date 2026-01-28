-- CreateTable
CREATE TABLE "ProductType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "processingCost" REAL NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProcessingCost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productTypeId" TEXT NOT NULL,
    "cost" REAL NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "changeReason" TEXT,
    "changedBy" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcessingCost_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "manager" TEXT,
    "address" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "origin" TEXT,
    "specification" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "unitPrice" REAL NOT NULL,
    "minOrderQty" REAL,
    "isFunctional" BOOLEAN NOT NULL DEFAULT false,
    "certifications" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Material_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaterialPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "changedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaterialPrice_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SimpleQuotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationNo" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "customerName" TEXT,
    "productTypeId" TEXT NOT NULL,
    "packageUnit" INTEGER NOT NULL,
    "bottleBoxCost" REAL NOT NULL DEFAULT 0,
    "setCount" INTEGER NOT NULL DEFAULT 1,
    "totalMaterialCost" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SimpleQuotation_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SimpleQuotationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "theoryAmount" REAL NOT NULL DEFAULT 0,
    "actualAmount" REAL NOT NULL DEFAULT 0,
    "kgUnitPrice" REAL NOT NULL DEFAULT 0,
    "materialCost" REAL NOT NULL DEFAULT 0,
    "origin" TEXT,
    CONSTRAINT "SimpleQuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "SimpleQuotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DetailedQuotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationNo" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "customerName" TEXT,
    "productType" TEXT NOT NULL,
    "formType" TEXT,
    "contentAmount" REAL,
    "packageUnit" INTEGER NOT NULL DEFAULT 0,
    "intakeGuide" TEXT,
    "productionQty" INTEGER NOT NULL DEFAULT 0,
    "unitWeight" REAL NOT NULL DEFAULT 0,
    "totalWeight" REAL NOT NULL DEFAULT 0,
    "yieldRate" REAL NOT NULL DEFAULT 100,
    "actualQty" INTEGER NOT NULL DEFAULT 0,
    "packagingMethod" TEXT,
    "inspectionCost" REAL NOT NULL DEFAULT 0,
    "managementCost" REAL NOT NULL DEFAULT 0,
    "deliveryCost" REAL NOT NULL DEFAULT 0,
    "designCost" REAL NOT NULL DEFAULT 0,
    "onetimeCost" REAL NOT NULL DEFAULT 0,
    "profitRate" REAL NOT NULL DEFAULT 5,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DetailedMaterialItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "materialName" TEXT NOT NULL,
    "specification" TEXT,
    "mixRatio" REAL NOT NULL DEFAULT 0,
    "contentMg" REAL NOT NULL DEFAULT 0,
    "inputKg" REAL NOT NULL DEFAULT 0,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "totalPrice" REAL NOT NULL DEFAULT 0,
    "functionalContent" TEXT,
    "note" TEXT,
    CONSTRAINT "DetailedMaterialItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "DetailedQuotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DetailedSupplyItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "supplyName" TEXT NOT NULL,
    "specification" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "inputQty" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "totalPrice" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    CONSTRAINT "DetailedSupplyItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "DetailedQuotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DetailedProcessItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "processName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitCost" REAL NOT NULL DEFAULT 0,
    "totalCost" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    CONSTRAINT "DetailedProcessItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "DetailedQuotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductType_code_key" ON "ProductType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Material_code_key" ON "Material"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SimpleQuotation_quotationNo_key" ON "SimpleQuotation"("quotationNo");

-- CreateIndex
CREATE UNIQUE INDEX "DetailedQuotation_quotationNo_key" ON "DetailedQuotation"("quotationNo");
