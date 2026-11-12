-- CreateTable
CREATE TABLE "MaterialContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "materialId" TEXT,
    "catalogId" TEXT,
    "name" TEXT NOT NULL,
    "specification" TEXT,
    "status" TEXT NOT NULL,
    "component" TEXT,
    "amount" REAL,
    "amountMax" REAL,
    "unit" TEXT,
    "qualifier" TEXT,
    "matches" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaterialContent_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaterialContent_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "MaterialCatalog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialContent_materialId_key" ON "MaterialContent"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialContent_catalogId_key" ON "MaterialContent"("catalogId");

-- CreateIndex
CREATE INDEX "MaterialContent_status_idx" ON "MaterialContent"("status");
