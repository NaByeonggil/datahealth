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

## 백업 / 복원

```bash
npm run backup                  # 백업 생성
npm run restore                 # 백업 목록에서 골라 복원
npm run restore -- --latest     # 최신 DB만 바로 복원
npm run restore -- <파일경로>    # 특정 아카이브로 복원
```

기본 백업 위치는 `~/Library/CloudStorage/SynologyDrive-1/datahealth-backup` 이며
`BACKUP_DIR=/다른/경로 npm run backup` 으로 바꿀 수 있다. 30일 지난 아카이브는
자동 삭제되고 `KEEP_DAYS` 로 조정한다.

- DB 복사는 `cp` 가 아니라 `sqlite3 .backup` 을 쓴다. 서버가 켜진 채 `cp` 하면
  쓰기 도중 파일을 떠 깨진 백업이 나온다.
- 백업·복원 모두 `pragma integrity_check` 로 검증하고, 깨졌으면 중단한다.
- 복원 직전 현재 DB를 `prisma/dev.db.before_restore_<시각>` 으로 남긴다.
- 아카이브 복원은 스키마·마이그레이션까지 되돌리므로 이어서
  `npx prisma generate` 를 실행한다.
- 복원 전에 개발 서버를 멈춘다.
