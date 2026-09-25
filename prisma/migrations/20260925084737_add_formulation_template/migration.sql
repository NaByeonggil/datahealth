-- CreateTable
CREATE TABLE "FormulationTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "productTypeId" TEXT,
    "productSpec" TEXT,
    "dosage" TEXT,
    "subMaterialCostPerUnit" REAL,
    "note" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FormulationTemplate_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormulationTemplateItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 1,
    "category" TEXT NOT NULL DEFAULT '일반식품',
    "role" TEXT NOT NULL DEFAULT '주원료',
    "materialId" TEXT,
    "materialName" TEXT NOT NULL,
    "theoryAmount" REAL NOT NULL DEFAULT 0,
    "origin" TEXT,
    "refUnitPrice" REAL NOT NULL DEFAULT 0,
    "note" TEXT,
    CONSTRAINT "FormulationTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FormulationTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FormulationTemplateItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FormulationTemplate_name_idx" ON "FormulationTemplate"("name");

-- CreateIndex
CREATE INDEX "FormulationTemplate_productTypeId_idx" ON "FormulationTemplate"("productTypeId");

-- CreateIndex
CREATE INDEX "FormulationTemplateItem_templateId_idx" ON "FormulationTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "FormulationTemplateItem_materialName_idx" ON "FormulationTemplateItem"("materialName");
