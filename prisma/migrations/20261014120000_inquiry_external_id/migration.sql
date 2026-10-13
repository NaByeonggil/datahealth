-- 홈페이지(factory) 견적문의 게시판 연동 — 상대편 문의 ID
ALTER TABLE "BoardInquiry" ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BoardInquiry_externalId_key" ON "BoardInquiry"("externalId");
