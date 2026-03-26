#!/bin/bash
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

HOMEBREW_TAP="/tmp/homebrew-quickfolder"
GITHUB_REPO="don-key/quickfolder"

echo ""
printf "${BOLD}╔══════════════════════════════════════════╗${NC}\n"
printf "${BOLD}║   QuickFolder Release Script             ║${NC}\n"
printf "${BOLD}╚══════════════════════════════════════════╝${NC}\n"
echo ""

# 1. 버전 확인
VERSION=$(node -p "require('./package.json').version")
printf "릴리즈 버전: ${YELLOW}v${VERSION}${NC}\n\n"

# 기존 태그 확인
if git tag -l "v${VERSION}" | grep -q "v${VERSION}"; then
  printf "${RED}✗ v${VERSION} 태그가 이미 존재합니다. package.json 버전을 올려주세요.${NC}\n"
  exit 1
fi

# 2. 커밋되지 않은 변경사항 확인
if ! git diff --quiet || ! git diff --cached --quiet; then
  printf "${RED}✗ 커밋되지 않은 변경사항이 있습니다. 먼저 커밋해주세요.${NC}\n"
  exit 1
fi

# 3. 체크리스트 실행
printf "${BOLD}── Step 1/6: 체크리스트 ──${NC}\n\n"
bash scripts/pre-release-checklist.sh
echo ""

# 4. DMG 빌드
printf "${BOLD}── Step 2/6: DMG 빌드 ──${NC}\n\n"
npx electron-builder --mac dmg
DMG_FILE="dist/QuickFolder-${VERSION}-arm64.dmg"
if [[ ! -f "$DMG_FILE" ]]; then
  printf "${RED}✗ DMG 파일을 찾을 수 없습니다: ${DMG_FILE}${NC}\n"
  exit 1
fi
printf "${GREEN}✓ 빌드 완료: ${DMG_FILE}${NC}\n\n"

# 5. SHA256 해시
SHA=$(shasum -a 256 "$DMG_FILE" | awk '{print $1}')
printf "SHA256: ${SHA}\n\n"

# 6. GitHub 릴리즈
printf "${BOLD}── Step 3/6: GitHub 릴리즈 ──${NC}\n\n"
gh release create "v${VERSION}" "$DMG_FILE" \
  --title "QuickFolder v${VERSION}" \
  --notes "## QuickFolder v${VERSION}

### 설치 / 업데이트

\`\`\`bash
brew tap don-key/quickfolder
brew install --cask quickfolder
# 기존 사용자
brew upgrade quickfolder
\`\`\`

### 릴리즈 노트
체크리스트 20개 항목 전체 통과 후 릴리즈됨."
printf "${GREEN}✓ GitHub 릴리즈 완료${NC}\n\n"

# 7. Homebrew tap 업데이트
printf "${BOLD}── Step 4/6: Homebrew tap 업데이트 ──${NC}\n\n"
if [[ ! -d "$HOMEBREW_TAP" ]]; then
  git clone "https://github.com/${GITHUB_REPO%/*}/homebrew-quickfolder.git" "$HOMEBREW_TAP"
fi
cd "$HOMEBREW_TAP"
git pull
cat > Casks/quickfolder.rb << RUBY
cask "quickfolder" do
  version "${VERSION}"
  sha256 "${SHA}"

  url "https://github.com/${GITHUB_REPO}/releases/download/v#{version}/QuickFolder-#{version}-arm64.dmg"
  name "QuickFolder"
  desc "macOS 폴더 관리 유틸리티 - 빠른 폴더 접근"
  homepage "https://github.com/${GITHUB_REPO}"

  app "QuickFolder.app"

  postflight do
    system_command "/usr/bin/xattr",
                   args: ["-cr", "#{appdir}/QuickFolder.app"],
                   sudo: true
  end

  zap trash: [
    "~/Library/Application Support/quickfolder",
  ]
end
RUBY
git add -A
git commit -m "chore: bump to v${VERSION}"
git push
cd - > /dev/null
printf "${GREEN}✓ Homebrew tap 업데이트 완료${NC}\n\n"

# 8. 로컬 앱 업데이트
printf "${BOLD}── Step 5/6: 로컬 앱 업데이트 ──${NC}\n\n"
rm -rf /Applications/QuickFolder.app
cp -R "dist/mac-arm64/QuickFolder.app" /Applications/
printf "${GREEN}✓ /Applications/QuickFolder.app 업데이트 완료${NC}\n\n"

# 9. 완료
printf "${BOLD}── Step 6/6: 완료 ──${NC}\n\n"
printf "${GREEN}${BOLD}✓ QuickFolder v${VERSION} 릴리즈 완료!${NC}\n"
printf "  - GitHub: https://github.com/${GITHUB_REPO}/releases/tag/v${VERSION}\n"
printf "  - Homebrew: brew upgrade quickfolder\n"
printf "  - 로컬: /Applications/QuickFolder.app\n"
echo ""
