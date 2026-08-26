#!/bin/bash
# =====================================================
# 견적시스템 백업
#   사용법: npm run backup
#   백업 위치 변경: BACKUP_DIR=/원하는/경로 npm run backup
# =====================================================
set -euo pipefail

# 스크립트 위치 기준으로 프로젝트 루트를 찾는다 (경로 하드코딩 금지)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$HOME/Library/CloudStorage/SynologyDrive-1/datahealth-backup}"
KEEP_DAYS="${KEEP_DAYS:-30}"

DB_PATH="$PROJECT_DIR/prisma/dev.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="datahealth-backup_${TIMESTAMP}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${YELLOW}=== 견적시스템 백업 ===${NC}"
echo "  프로젝트: $PROJECT_DIR"
echo "  백업 위치: $BACKUP_DIR"

[ -f "$DB_PATH" ] || { echo -e "${RED}DB를 찾을 수 없습니다: $DB_PATH${NC}"; exit 1; }
mkdir -p "$BACKUP_DIR"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# 1) DB 안전 복사
#    cp 는 서버가 켜져 있으면 쓰기 도중 파일을 떠 깨진 백업이 될 수 있다.
#    sqlite3 .backup 은 잠금을 잡고 일관된 스냅샷을 만든다.
echo -e "\n${GREEN}[1/4] DB 스냅샷${NC}"
sqlite3 "$DB_PATH" ".backup '$WORK/dev.db'"

# 2) 스냅샷 무결성 확인 — 깨진 백업을 보관하지 않는다
echo -e "${GREEN}[2/4] 무결성 검사${NC}"
CHECK=$(sqlite3 "$WORK/dev.db" "pragma integrity_check;")
[ "$CHECK" = "ok" ] || { echo -e "${RED}백업본이 손상됐습니다: $CHECK${NC}"; exit 1; }
echo "  integrity_check: ok"
sqlite3 "$WORK/dev.db" "
  select '  견적서(일반) ' || count(*) from SimpleQuotation
  union all select '  견적서(상세) ' || count(*) from DetailedQuotation
  union all select '  원료         ' || count(*) from Material;"

# 3) 아카이브 — DB + 스키마 + 마이그레이션 + 환경설정
echo -e "${GREEN}[3/4] 아카이브 생성${NC}"
mkdir -p "$WORK/pack/prisma"
cp "$WORK/dev.db" "$WORK/pack/prisma/dev.db"
cp "$PROJECT_DIR/prisma/schema.prisma" "$WORK/pack/prisma/"
cp -R "$PROJECT_DIR/prisma/migrations" "$WORK/pack/prisma/"
for f in .env .env.local; do
  [ -f "$PROJECT_DIR/$f" ] && cp "$PROJECT_DIR/$f" "$WORK/pack/"
done
tar -czf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" -C "$WORK/pack" .

# 빠른 복원용 최신 DB 사본
cp "$WORK/dev.db" "$BACKUP_DIR/dev.db.latest"

# 4) 오래된 백업 정리
echo -e "${GREEN}[4/4] 정리${NC}"
OLD=$(find "$BACKUP_DIR" -name "datahealth-backup_*.tar.gz" -mtime +"$KEEP_DAYS" | wc -l | tr -d ' ')
if [ "$OLD" -gt 0 ]; then
  find "$BACKUP_DIR" -name "datahealth-backup_*.tar.gz" -mtime +"$KEEP_DAYS" -delete
  echo "  ${KEEP_DAYS}일 지난 백업 ${OLD}개 삭제"
else
  echo "  삭제할 오래된 백업 없음"
fi

echo -e "\n${GREEN}백업 완료${NC}"
echo "  $BACKUP_DIR/${BACKUP_NAME}.tar.gz ($(du -h "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1))"
echo "  $BACKUP_DIR/dev.db.latest"
echo -e "\n최근 백업:"
ls -1t "$BACKUP_DIR"/datahealth-backup_*.tar.gz 2>/dev/null | head -5 | sed 's|.*/|  |'
