#!/bin/bash

# =====================================================
# 견적시스템 백업 스크립트
# 백업 위치: Synology Drive
# =====================================================

# 설정
BACKUP_DIR="/Users/byeonggilna/SynologyDrive/backups/quotation-system"
PROJECT_DIR="/Users/byeonggilna/Desktop/datahealth2/quotation-system"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="quotation-backup_${TIMESTAMP}"

# 색상 출력
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  견적시스템 백업 시작${NC}"
echo -e "${YELLOW}========================================${NC}"

# 백업 디렉토리 생성
mkdir -p "$BACKUP_DIR"

# 백업할 파일 목록 확인
echo -e "\n${GREEN}[1/3] 백업 대상 확인${NC}"
echo "  - prisma/dev.db (데이터베이스)"
echo "  - prisma/schema.prisma (스키마)"
echo "  - .env, .env.local (환경설정)"

# 백업 실행
echo -e "\n${GREEN}[2/3] 백업 생성 중...${NC}"

# 전체 백업 (DB + 설정 + 스키마)
tar -czvf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" \
  -C "$PROJECT_DIR" \
  prisma/dev.db \
  prisma/schema.prisma \
  .env \
  .env.local 2>/dev/null

# DB만 별도 백업 (빠른 복원용)
cp "$PROJECT_DIR/prisma/dev.db" "$BACKUP_DIR/dev.db.latest"

echo -e "\n${GREEN}[3/3] 백업 완료!${NC}"
echo -e "  위치: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
echo -e "  최신 DB: $BACKUP_DIR/dev.db.latest"

# 백업 파일 크기 확인
BACKUP_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)
echo -e "  크기: ${BACKUP_SIZE}"

# 30일 이상 된 백업 삭제
OLD_COUNT=$(find "$BACKUP_DIR" -name "quotation-backup_*.tar.gz" -mtime +30 | wc -l | tr -d ' ')
if [ "$OLD_COUNT" -gt 0 ]; then
  echo -e "\n${YELLOW}30일 이상 된 백업 ${OLD_COUNT}개 삭제${NC}"
  find "$BACKUP_DIR" -name "quotation-backup_*.tar.gz" -mtime +30 -delete
fi

# 현재 백업 목록 표시
echo -e "\n${GREEN}현재 백업 목록:${NC}"
ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -5

echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}  백업 완료!${NC}"
echo -e "${YELLOW}========================================${NC}"
