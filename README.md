<p align="center">
  <img src="icons/icon.png" width="128" height="128" alt="QuickFolder">
</p>

<h1 align="center">QuickFolder</h1>

<p align="center">
  <strong>macOS 폴더를 빠르게 관리하는 가장 쉬운 방법</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS-blue?style=flat-square" alt="macOS">
  <img src="https://img.shields.io/badge/electron-33-47848F?style=flat-square&logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License">
</p>

---

## What is QuickFolder?

자주 사용하는 폴더를 **한 곳에 모아두고**, 마우스를 화면 상단에 올리면 **즉시 접근**할 수 있는 macOS 유틸리티입니다.

> 폴더를 찾느라 Finder를 헤매지 마세요. QuickFolder로 **1초 만에** 원하는 폴더를 여세요.

---

## Features

| 기능 | 설명 |
|------|------|
| **Hot Edge** | 마우스를 화면 상단에 올리면 자동으로 QuickFolder가 나타남 |
| **워크스페이스** | 폴더를 그룹별로 정리 (업무, 개인, 프로젝트 등) |
| **멀티 모니터** | 커서가 있는 디스플레이에서 창이 열림 |
| **Finder 연동** | 더블클릭하면 같은 화면에서 Finder가 열림 |
| **터미널 열기** | 우클릭 → 터미널에서 바로 해당 폴더 진입 |
| **핀 고정** | 고정 시 마우스가 벗어나도 창이 유지됨 |
| **자동 숨김** | 마우스 이탈 시 자동으로 창이 닫힘 |
| **드래그 정렬** | 워크스페이스 순서를 드래그로 변경 |
| **메뉴바 상주** | 트레이 아이콘으로 항상 빠르게 접근 |

---

## Quick Start

### DMG 설치 (권장)

1. [**QuickFolder-1.0.0-arm64.dmg**](https://github.com/don-key/quickfolder/releases/latest) 다운로드
2. DMG 파일 열기
3. `QuickFolder`를 `Applications` 폴더로 드래그
4. 실행!

> Apple Silicon (M1/M2/M3/M4) Mac 전용

### 소스에서 실행 (개발자용)

```bash
git clone https://github.com/don-key/quickfolder.git
cd quickfolder
npm install
npm start
```

---

## How to Use

### 폴더 추가하기

헤더의 **`+`** 버튼을 클릭하고 원하는 폴더를 선택하세요.

### 폴더 열기

등록된 폴더를 **더블클릭**하면 Finder에서 열립니다.

### 우클릭 메뉴

폴더를 **우클릭**하면:

| 메뉴 | 동작 |
|------|------|
| Finder에서 열기 | 해당 폴더를 Finder로 엶 |
| 터미널에서 열기 | 해당 폴더로 터미널 진입 |
| 이름 변경 | 표시 이름을 변경 |
| 제거 | 목록에서 제거 (실제 폴더는 삭제 안 됨) |

### Hot Edge (자동 팝업)

마우스를 **화면 최상단**에 **0.3초** 올려두면 QuickFolder가 자동으로 나타납니다.
마우스가 창 밖으로 나가면 자동으로 사라집니다.

### 핀 고정

스크린샷을 찍거나 창을 유지하고 싶을 때 **핀 버튼** (📌)을 클릭하세요.
고정 시 마우스가 벗어나도 창이 닫히지 않습니다.

### 워크스페이스

- 상단 **`+`** 아이콘으로 새 워크스페이스 생성
- 탭을 **드래그**하여 순서 변경
- 탭을 **우클릭**하여 이름 변경 / 삭제

---

## Build (DMG 생성)

배포용 `.dmg` 파일을 만들려면:

```bash
npm run build
```

`dist/` 폴더에 macOS용 설치 파일이 생성됩니다.

---

## Requirements

- **macOS** 10.15+
- **Node.js** 18+
- **npm** 9+

---

## Project Structure

```
quickfolder/
├── main.js          # Electron 메인 프로세스
├── preload.js       # IPC 브릿지
├── renderer.js      # UI 로직
├── index.html       # 앱 화면
├── styles.css       # 스타일
├── icons/           # 앱 아이콘
└── package.json     # 프로젝트 설정
```

---

## License

MIT License - 자유롭게 사용하세요.

---

<p align="center">
  <sub>Made with Electron & Claude Code</sub>
</p>
