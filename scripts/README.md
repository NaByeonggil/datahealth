# scripts

## 재사용 가능
- `import-source21.ts` — source21 원료 단가표 → Material
- `import-vendor-catalog.ts` — 거래처 취급품목 → MaterialCatalog (+ 대조 리포트)
- `import-material-quotes.ts` — 단가 있는 거래처 문서 → Material
- `seed-quotation-notes.ts` — 견적서 특기사항 기본 문구 시드
- `fill-product-type-form-codes.ts` — 제품유형 마스터의 빈 formCode 채우기
- `verify-detailed-calc.ts` — 상세견적서 계산 검증

## 실행 완료 (스키마가 바뀌어 재실행 불가, 삭제됨)
- `migrate-quotation-lines.ts` — 견적서 포장정보 → 포장옵션(SimpleQuotationLine)
  마이그레이션 `20260826081622_add_quotation_lines` · `20260826082000_move_packaging_to_lines`
- `migrate-quotation-products.ts` — 견적서 제형·배합 → 제품(SimpleQuotationProduct)
  마이그레이션 `20260826130000_add_quotation_product` · `20260826133000_move_to_product_layer`
