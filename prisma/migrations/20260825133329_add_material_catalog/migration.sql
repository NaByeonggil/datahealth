-- CreateTable
CREATE TABLE "MaterialCatalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "origin" TEXT,
    "specification" TEXT,
    "packingUnit" REAL,
    "refCode" TEXT,
    "note" TEXT,
    "materialId" TEXT,
    "sourceFile" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaterialCatalog_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaterialCatalog_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialCatalog_supplierId_name_origin_key" ON "MaterialCatalog"("supplierId", "name", "origin");
