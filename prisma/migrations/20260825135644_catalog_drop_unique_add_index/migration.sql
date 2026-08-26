-- DropIndex
DROP INDEX "MaterialCatalog_supplierId_name_origin_key";

-- CreateIndex
CREATE INDEX "MaterialCatalog_supplierId_idx" ON "MaterialCatalog"("supplierId");

-- CreateIndex
CREATE INDEX "MaterialCatalog_sourceFile_idx" ON "MaterialCatalog"("sourceFile");

-- CreateIndex
CREATE INDEX "MaterialCatalog_name_idx" ON "MaterialCatalog"("name");
