-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MaterialContent" (
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
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaterialContent_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaterialContent_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "MaterialCatalog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MaterialContent" ("amount", "amountMax", "catalogId", "component", "createdAt", "id", "matches", "materialId", "name", "qualifier", "sourceType", "specification", "status", "unit") SELECT "amount", "amountMax", "catalogId", "component", "createdAt", "id", "matches", "materialId", "name", "qualifier", "sourceType", "specification", "status", "unit" FROM "MaterialContent";
DROP TABLE "MaterialContent";
ALTER TABLE "new_MaterialContent" RENAME TO "MaterialContent";
CREATE UNIQUE INDEX "MaterialContent_materialId_key" ON "MaterialContent"("materialId");
CREATE UNIQUE INDEX "MaterialContent_catalogId_key" ON "MaterialContent"("catalogId");
CREATE INDEX "MaterialContent_status_idx" ON "MaterialContent"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
