-- 문의 게시판 고객 접수 폼 — 접수번호·고객사·유입 경로·동의 시각
ALTER TABLE "BoardInquiry" ADD COLUMN "company" TEXT;
ALTER TABLE "BoardInquiry" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE "BoardInquiry" ADD COLUMN "receiptNo" TEXT;
ALTER TABLE "BoardInquiry" ADD COLUMN "consentAt" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "BoardInquiry_receiptNo_key" ON "BoardInquiry"("receiptNo");
