#!/bin/bash
# =====================================================
# 견적시스템 복원
#   npm run restore                 → 백업 목록에서 고르기
#   npm run restore -- --latest     → dev.db.latest 로 바로 복원
#   npm run restore -- <파일경로>    → 특정 아카이브로 복원
#
#   복원 전에 개발 서버를 반드시 멈추세요.
# =====================================================
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$HOME/Library/CloudStorage/SynologyDrive-1/datahealth-backup}"
DB_PATH="$PROJECT_DIR/prisma/dev.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "${YELLOW}=== 견적시스템 복원 ===${NC}"
echo "  프로젝트: $PROJECT_DIR"
echo "  백업 위치: $BACKUP_DIR"

# 개발 서버가 떠 있으면 복원 도중 DB를 다시 쓸 수 있다
if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo -e "${YELLOW}  경고: 포트 3000 에 서버가 떠 있습니다. 멈추고 다시 실행하세요.${NC}"
  read -r -p "  그래도 진행할까요? (y/N) " GO
  [ "$GO" = "y" ] || { echo "복원 취소됨"; exit 0; }
fi

# 복원 직전 현재 DB 를 타임스탬프로 남긴다 (덮어쓰지 않는다)
snapshot_current() {
  [ -f "$DB_PATH" ] || return 0
  local SAFE="$PROJECT_DIR/prisma/dev.db.before_restore_${TIMESTAMP}"
  sqlite3 "$DB_PATH" ".backup '$SAFE'"
  echo -e "${GREEN}  현재 DB 보관: $SAFE${NC}"
}

verify_db() {
  local CHECK
  CHECK=$(sqlite3 "$1" "pragma integrity_check;")
  [ "$CHECK" = "ok" ] || { echo -e "${RED}  복원본이 손상됐습니다: $CHECK${NC}"; exit 1; }
  echo "  integrity_check: ok"
  sqlite3 "$1" "
    select '  견적서(일반) ' || count(*) from SimpleQuotation
    union all select '  견적서(상세) ' || count(*) from DetailedQuotation
    union all select '  원료         ' || count(*) from Material;"
}

restore_db_only() {
  local SRC="$1"
  [ -f "$SRC" ] || { echo -e "${RED}  파일이 없습니다: $SRC${NC}"; exit 1; }
  snapshot_current
  cp "$SRC" "$DB_PATH"
  # 이전 저널이 남아 있으면 복원본과 섞인다
  rm -f "$DB_PATH-wal" "$DB_PATH-shm" "$DB_PATH-journal"
  verify_db "$DB_PATH"
  echo -e "\n${GREEN}복원 완료 (DB만)${NC}"
}

restore_archive() {
  local ARCHIVE="$1"
  [ -f "$ARCHIVE" ] || { echo -e "${RED}  파일이 없습니다: $ARCHIVE${NC}"; exit 1; }
  echo -e "\n${YELLOW}  선택된 백업: $(basename "$ARCHIVE")${NC}"
  local WORK; WORK=$(mktemp -d); trap 'rm -rf "$WORK"' RETURN
  tar -xzf "$ARCHIVE" -C "$WORK"
  [ -f "$WORK/prisma/dev.db" ] || { echo -e "${RED}  아카이브에 DB가 없습니다.${NC}"; exit 1; }

  snapshot_current
  cp "$WORK/prisma/dev.db" "$DB_PATH"
  rm -f "$DB_PATH-wal" "$DB_PATH-shm" "$DB_PATH-journal"
  cp "$WORK/prisma/schema.prisma" "$PROJECT_DIR/prisma/schema.prisma"
  rm -rf "$PROJECT_DIR/prisma/migrations"
  cp -R "$WORK/prisma/migrations" "$PROJECT_DIR/prisma/"
  verify_db "$DB_PATH"

  echo -e "\n${GREEN}복원 완료 (DB + 스키마 + 마이그레이션)${NC}"
  echo -e "${YELLOW}  스키마가 바뀌었을 수 있으니 이어서 실행하세요:${NC}"
  echo "    npx prisma generate && npm run dev"
}

# --- 인자 처리 ---
ARG="${1:-}"
if [ "$ARG" = "--latest" ]; then
  restore_db_only "$BACKUP_DIR/dev.db.latest"; exit 0
elif [ -n "$ARG" ]; then
  restore_archive "$ARG"; exit 0
fi

# --- 대화형 선택 ---
shopt -s nullglob
ARCHIVES=("$BACKUP_DIR"/datahealth-backup_*.tar.gz)
shopt -u nullglob
if [ ${#ARCHIVES[@]} -eq 0 ] && [ ! -f "$BACKUP_DIR/dev.db.latest" ]; then
  echo -e "${RED}백업이 없습니다. 먼저 npm run backup 을 실행하세요.${NC}"; exit 1
fi

echo -e "\n${GREEN}복원할 백업을 고르세요:${NC}"
select CHOICE in "${ARCHIVES[@]}" "최신 DB만 복원 (dev.db.latest)" "취소"; do
  case "$CHOICE" in
    "취소"|"") echo "복원 취소됨"; exit 0 ;;
    "최신 DB만 복원 (dev.db.latest)") restore_db_only "$BACKUP_DIR/dev.db.latest"; exit 0 ;;
    *) restore_archive "$CHOICE"; exit 0 ;;
  esac
done
