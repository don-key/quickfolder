# QuickFolder - Claude Code 지침

## 필수 플로우 (반드시 지켜야 함)

### "배포해" 요청 시 실행 프로세스

사용자가 "배포해", "릴리즈", "release" 등을 요청하면 아래 순서를 **반드시** 따른다:

1. **커밋되지 않은 변경사항 확인** → 있으면 먼저 커밋
2. **package.json 버전 올리기** → 이전 릴리즈와 겹치지 않게
3. **`npm run checklist` 실행** → 사용자에게 20개 항목 수동 테스트 요청
4. **체크리스트 통과 후** `npm run release` 실행 (또는 수동으로 아래 단계 진행):
   - `npx electron-builder --mac dmg` 빌드
   - `shasum -a 256` 해시 생성
   - `gh release create` GitHub 릴리즈
   - `/tmp/homebrew-quickfolder` Cask 파일 업데이트 + push
   - `/Applications/QuickFolder.app` 로컬 업데이트

### 체크리스트를 건너뛰지 말 것

빌드+릴리즈 전에 **반드시** 체크리스트를 실행해야 한다. 과거 발생한 버그들:
- Hot Edge 전체화면 미동작
- auto-hide가 포커스/드래그 중 작동
- 우클릭 메뉴 짤림
- 터미널 열기 권한 문제
- 창이 좌측 상단에 숨는 버그

이 모든 항목이 체크리스트에 포함되어 있으므로 건너뛰면 리그레션 발생 가능.

## 프로젝트 정보

- **GitHub**: https://github.com/don-key/quickfolder
- **Homebrew tap**: https://github.com/don-key/homebrew-quickfolder (로컬: /tmp/homebrew-quickfolder)
- **git config**: name=don-key, email=rlahdzlsla@gmail.com
- **기술 스택**: Electron 33 + vanilla JS
- **데이터 저장**: ~/Library/Application Support/quickfolder/quickfolder-data.json

## 코드 수정 시 주의사항

- `main.js` 수정 후 반드시 `npx electron .`로 실행 테스트
- 전체화면 Hot Edge threshold는 50px 유지 (macOS 메뉴바 영역 때문)
- auto-hide는 포커스 상태 + 드래그 중 + 핀 상태에서 비활성화
- 우클릭 메뉴는 네이티브 Menu 사용 (HTML 컨텍스트 메뉴 사용 금지)
- `type: 'panel'` + `visibleOnFullScreen: true`로 전체화면 지원
