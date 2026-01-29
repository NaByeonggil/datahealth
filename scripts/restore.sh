#!/bin/bash

# =====================================================
# 견적시스템 복원 스크립트
# =====================================================

BACKUP_DIR="/Users/byeonggilna/SynologyDrive/backups/quotation-system"
PROJECT_DIR="/Users/byeonggilna/Desktop/datahealth2/quotation-system"

# 색상 출력
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  견적시스템 복원${NC}"
echo -e "${YELLOW}========================================${NC}"

# 백업 파일 목록 표시
echo -e "\n${GREEN}사용 가능한 백업 파일:${NC}"
echo ""
select BACKUP_FILE in "$BACKUP_DIR"/quotation-backup_*.tar.gz "최신 DB만 복원 (dev.db.latest)" "취소"; do
  case $BACKUP_FILE in
    "취소")
      echo "복원 취소됨"
      exit 0
      ;;
    "최신 DB만 복원 (dev.db.latest)")
      if [ -f "$BACKUP_DIR/dev.db.latest" ]; then
        echo -e "\n${YELLOW}현재 DB를 백업하고 복원합니다...${NC}"
        cp "$PROJECT_DIR/prisma/dev.db" "$PROJECT_DIR/prisma/dev.db.before_restore"
        cp "$BACKUP_DIR/dev.db.latest" "$PROJECT_DIR/prisma/dev.db"
        echo -e "${GREEN}복원 완료!${NC}"
      else
        echo -e "${RED}최신 DB 백업 파일이 없습니다.${NC}"
      fi
      exit 0
      ;;
    *)
      if [ -f "$BACKUP_FILE" ]; then
        echo -e "\n${YELLOW}선택된 백업: $(basename $BACKUP_FILE)${NC}"
        echo -e "${YELLOW}현재 DB를 백업하고 복원합니다...${NC}"

        # 현재 DB 백업
        cp "$PROJECT_DIR/prisma/dev.db" "$PROJECT_DIR/prisma/dev.db.before_restore"

        # 복원
        tar -xzvf "$BACKUP_FILE" -C "$PROJECT_DIR"

        echo -e "${GREEN}복원 완료!${NC}"
        echo -e "이전 DB는 prisma/dev.db.before_restore에 저장됨"
      else
        echo -e "${RED}파일을 찾을 수 없습니다.${NC}"
      fi
      exit 0
      ;;
  esac
done
