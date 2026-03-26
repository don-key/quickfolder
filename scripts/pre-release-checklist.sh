#!/bin/bash
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

passed=0
failed=0
total=0

check() {
  total=$((total + 1))
  local category="$1"
  local description="$2"
  printf "${CYAN}[${category}]${NC} ${description}\n"
  printf "  통과? (y/n): "
  read -r answer
  if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    printf "  ${GREEN}✓ PASS${NC}\n\n"
    passed=$((passed + 1))
  else
    printf "  ${RED}✗ FAIL${NC}\n\n"
    failed=$((failed + 1))
  fi
}

echo ""
printf "${BOLD}╔══════════════════════════════════════════╗${NC}\n"
printf "${BOLD}║   QuickFolder Pre-Release Checklist      ║${NC}\n"
printf "${BOLD}╚══════════════════════════════════════════╝${NC}\n"
echo ""

VERSION=$(node -p "require('./package.json').version")
printf "버전: ${YELLOW}v${VERSION}${NC}\n\n"

# 앱 실행
printf "${YELLOW}▶ 앱을 dev 모드로 실행합니다...${NC}\n"
npx electron . &
APP_PID=$!
sleep 3
echo ""

printf "${BOLD}── Hot Edge ──${NC}\n\n"
check "Hot Edge" "일반 화면에서 마우스 상단 → 창 팝업"
check "Hot Edge" "전체화면 앱에서 마우스 상단 → 창 팝업"
check "Hot Edge" "멀티 모니터에서 커서 있는 디스플레이에 창 표시"

printf "${BOLD}── Auto-hide ──${NC}\n\n"
check "Auto-hide" "포커스 없을 때 마우스 이탈 → 창 숨김"
check "Auto-hide" "포커스 상태(클릭)에서 마우스 이탈 → 창 유지"
check "Auto-hide" "드래그 중 마우스 이탈 → 창 유지"

printf "${BOLD}── 핀 고정 ──${NC}\n\n"
check "핀" "핀 ON → 마우스 이탈해도 창 유지"

printf "${BOLD}── 폴더 ──${NC}\n\n"
check "폴더" "폴더 클릭 → Finder 열기"
check "폴더" "폴더 우클릭 → 네이티브 메뉴 (잘림 없음)"
check "폴더" "우클릭 → 터미널에서 열기 동작"
check "폴더" "우클릭 → 이름 변경 동작"
check "폴더" "우클릭 → 제거 동작"
check "폴더" "폴더 추가 다이얼로그 중 창 안 사라짐"

printf "${BOLD}── 워크스페이스 ──${NC}\n\n"
check "워크스페이스" "워크스페이스 추가/삭제/이름변경"
check "워크스페이스" "워크스페이스 탭 드래그 정렬"

printf "${BOLD}── 트레이 ──${NC}\n\n"
check "트레이" "트레이 아이콘 클릭 토글"
check "트레이" "트레이 우클릭 메뉴 동작"

printf "${BOLD}── UI ──${NC}\n\n"
check "UI" "창 드래그 이동 (헤더 영역)"
check "UI" "버전 표시 (dev 모드에서 v${VERSION} (dev) 표시)"

printf "${BOLD}── 설정 ──${NC}\n\n"
check "설정" "⚙️ 설정 메뉴 (터미널 선택, 자동화 권한)"

# 앱 종료
kill $APP_PID 2>/dev/null || true

# 결과
echo ""
printf "${BOLD}══════════════════════════════════════════${NC}\n"
printf "  결과: ${GREEN}${passed} PASS${NC} / ${RED}${failed} FAIL${NC} / ${total} TOTAL\n"
printf "${BOLD}══════════════════════════════════════════${NC}\n"
echo ""

if [[ $failed -gt 0 ]]; then
  printf "${RED}✗ 체크리스트 미통과. 릴리즈를 중단합니다.${NC}\n"
  exit 1
else
  printf "${GREEN}✓ 모든 항목 통과! 릴리즈 준비 완료.${NC}\n"
  exit 0
fi
