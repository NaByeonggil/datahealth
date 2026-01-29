#!/bin/bash

# =====================================================
# 견적시스템 전체 셋업 스크립트
# 새 환경에서 GitHub clone 후 실행
# =====================================================

# 색상 출력
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  견적시스템 셋업 스크립트${NC}"
echo -e "${BLUE}========================================${NC}"

# 현재 디렉토리 확인
if [ ! -f "package.json" ]; then
  echo -e "${RED}오류: package.json이 없습니다.${NC}"
  echo -e "프로젝트 루트 디렉토리에서 실행해주세요."
  exit 1
fi

# Step 1: 패키지 설치
echo -e "\n${GREEN}[1/4] 패키지 설치 중...${NC}"
npm install
if [ $? -ne 0 ]; then
  echo -e "${RED}패키지 설치 실패${NC}"
  exit 1
fi
echo -e "${GREEN}✓ 패키지 설치 완료${NC}"

# Step 2: 백업 파일 확인 및 복원
echo -e "\n${GREEN}[2/4] 백업 복원${NC}"

# 백업 디렉토리 설정 (Synology Drive 또는 사용자 지정)
DEFAULT_BACKUP_DIR="/Users/byeonggilna/SynologyDrive/backups/quotation-system"
BACKUP_DIR=""

if [ -d "$DEFAULT_BACKUP_DIR" ]; then
  BACKUP_DIR="$DEFAULT_BACKUP_DIR"
  echo -e "백업 디렉토리: ${YELLOW}$BACKUP_DIR${NC}"
else
  echo -e "${YELLOW}백업 파일 경로를 입력하세요:${NC}"
  read -p "> " BACKUP_DIR
fi

# 백업 파일 선택
if [ -d "$BACKUP_DIR" ]; then
  echo -e "\n사용 가능한 백업 파일:"

  BACKUP_FILES=($(ls -t "$BACKUP_DIR"/quotation-backup_*.tar.gz 2>/dev/null))

  if [ ${#BACKUP_FILES[@]} -eq 0 ]; then
    echo -e "${YELLOW}백업 파일이 없습니다. .env와 DB를 수동으로 설정해주세요.${NC}"
  else
    echo ""
    for i in "${!BACKUP_FILES[@]}"; do
      echo "  $((i+1)). $(basename ${BACKUP_FILES[$i]})"
    done
    echo "  0. 건너뛰기 (수동 설정)"

    echo ""
    read -p "선택 (기본값: 1 - 최신 백업): " SELECTION
    SELECTION=${SELECTION:-1}

    if [ "$SELECTION" != "0" ]; then
      SELECTED_FILE="${BACKUP_FILES[$((SELECTION-1))]}"

      if [ -f "$SELECTED_FILE" ]; then
        echo -e "\n복원 중: $(basename $SELECTED_FILE)"
        tar -xzvf "$SELECTED_FILE" -C .
        echo -e "${GREEN}✓ 백업 복원 완료${NC}"
      else
        echo -e "${RED}파일을 찾을 수 없습니다.${NC}"
      fi
    else
      echo -e "${YELLOW}백업 복원을 건너뜁니다.${NC}"
    fi
  fi
else
  echo -e "${YELLOW}백업 디렉토리를 찾을 수 없습니다.${NC}"
  echo -e ".env와 DB를 수동으로 설정해주세요."
fi

# Step 3: .env 파일 확인
echo -e "\n${GREEN}[3/4] 환경설정 확인${NC}"
if [ -f ".env" ]; then
  echo -e "${GREEN}✓ .env 파일 존재${NC}"
else
  echo -e "${YELLOW}.env 파일이 없습니다. 생성합니다...${NC}"
  cat > .env << 'ENVEOF'
DATABASE_URL="file:./dev.db"
ENVEOF
  echo -e "${GREEN}✓ .env 파일 생성 완료${NC}"
fi

# Step 4: Prisma 설정
echo -e "\n${GREEN}[4/4] Prisma 설정${NC}"

# DB 파일 확인
if [ -f "prisma/dev.db" ]; then
  echo -e "${GREEN}✓ 데이터베이스 파일 존재${NC}"

  # Prisma Client 생성
  echo -e "Prisma Client 생성 중..."
  npx prisma generate
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Prisma Client 생성 완료${NC}"
  else
    echo -e "${RED}Prisma Client 생성 실패${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}데이터베이스 파일이 없습니다.${NC}"
  echo -e "새 데이터베이스를 생성하시겠습니까? (y/n)"
  read -p "> " CREATE_DB

  if [ "$CREATE_DB" = "y" ] || [ "$CREATE_DB" = "Y" ]; then
    echo -e "데이터베이스 마이그레이션 실행 중..."
    npx prisma migrate dev --name init

    echo -e "시드 데이터 입력 여부 (y/n):"
    read -p "> " RUN_SEED
    if [ "$RUN_SEED" = "y" ] || [ "$RUN_SEED" = "Y" ]; then
      npm run db:seed
    fi
  else
    echo -e "${RED}데이터베이스 없이는 실행할 수 없습니다.${NC}"
    exit 1
  fi
fi

# 완료
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}  셋업 완료!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e ""
echo -e "실행 명령어:"
echo -e "  ${YELLOW}npm run dev${NC}     - 개발 서버 실행"
echo -e "  ${YELLOW}npm run build${NC}   - 프로덕션 빌드"
echo -e "  ${YELLOW}npm run backup${NC}  - 백업 생성"
echo -e ""
