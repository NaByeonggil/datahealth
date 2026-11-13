-- CreateTable
CREATE TABLE "FunctionalStandard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT,
    "group" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "component" TEXT,
    "keywords" TEXT NOT NULL,
    "excludes" TEXT,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "FunctionalStandard_code_key" ON "FunctionalStandard"("code");

-- CreateIndex
CREATE UNIQUE INDEX "FunctionalStandard_name_key" ON "FunctionalStandard"("name");
