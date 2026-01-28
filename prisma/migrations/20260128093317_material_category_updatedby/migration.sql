-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Material" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '일반식품',
    "origin" TEXT,
    "specification" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "unitPrice" REAL NOT NULL,
    "minOrderQty" REAL,
    "isFunctional" BOOLEAN NOT NULL DEFAULT false,
    "certifications" TEXT,
    "note" TEXT,
    "updatedBy" TEXT DEFAULT '관리자',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Material_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Material" ("category", "certifications", "code", "createdAt", "id", "isActive", "isFunctional", "minOrderQty", "name", "note", "origin", "specification", "supplierId", "unit", "unitPrice", "updatedAt") SELECT "category", "certifications", "code", "createdAt", "id", "isActive", "isFunctional", "minOrderQty", "name", "note", "origin", "specification", "supplierId", "unit", "unitPrice", "updatedAt" FROM "Material";
DROP TABLE "Material";
ALTER TABLE "new_Material" RENAME TO "Material";
CREATE UNIQUE INDEX "Material_code_key" ON "Material"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
