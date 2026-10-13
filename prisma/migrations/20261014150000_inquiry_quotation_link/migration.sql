-- 홈페이지 문의 ↔ 견적서 · 고객사 연결
ALTER TABLE "BoardInquiry" ADD COLUMN "customerId" TEXT;
ALTER TABLE "SimpleQuotation" ADD COLUMN "inquiryExternalId" TEXT;
ALTER TABLE "SimpleQuotation" ADD COLUMN "sentToInquiryAt" DATETIME;

-- CreateIndex
CREATE INDEX "SimpleQuotation_inquiryExternalId_idx" ON "SimpleQuotation"("inquiryExternalId");
