-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FunctionalStandard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "group" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "component" TEXT,
    "keywords" TEXT NOT NULL,
    "excludes" TEXT,
    "note" TEXT,
    "dailyMin" REAL,
    "dailyMax" REAL,
    "dailyUnit" TEXT,
    "dailyBasis" TEXT,
    "quoteMin" REAL,
    "dailyVerified" BOOLEAN NOT NULL DEFAULT false,
    "dailyNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_FunctionalStandard" ("code", "component", "createdAt", "excludes", "group", "id", "keywords", "name", "note", "sortOrder", "updatedAt") SELECT "code", "component", "createdAt", "excludes", "group", "id", "keywords", "name", "note", "sortOrder", "updatedAt" FROM "FunctionalStandard";
DROP TABLE "FunctionalStandard";
ALTER TABLE "new_FunctionalStandard" RENAME TO "FunctionalStandard";
CREATE UNIQUE INDEX "FunctionalStandard_code_key" ON "FunctionalStandard"("code");
CREATE UNIQUE INDEX "FunctionalStandard_name_key" ON "FunctionalStandard"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
