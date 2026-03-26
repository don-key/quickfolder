const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage, screen, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

const CURRENT_VERSION = require('./package.json').version;
const GITHUB_REPO = 'don-key/quickfolder';
const APP_ICON = path.join(__dirname, 'icons', 'icon.png');

// ── Auto Update Check ──
function checkForUpdates(silent = true) {
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${GITHUB_REPO}/releases/latest`,
    headers: { 'User-Agent': 'QuickFolder' }
  };

  https.get(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const release = JSON.parse(data);
        const latest = release.tag_name.replace('v', '');
        if (latest !== CURRENT_VERSION) {
          const body = release.body || '';
          const notification = new Notification({
            title: `QuickFolder ${latest} 업데이트 available`,
            body: body.slice(0, 200).replace(/[#*`]/g, ''),
            icon: APP_ICON
          });
          notification.on('click', () => {
            shell.openExternal(`https://github.com/${GITHUB_REPO}/releases/tag/v${latest}`);
          });
          notification.show();
        } else if (!silent) {
          new Notification({
            title: 'QuickFolder',
            body: '최신 버전을 사용 중입니다.',
            icon: APP_ICON
          }).show();
        }
      } catch {}
    });
  }).on('error', () => {});
}

const DATA_PATH = path.join(app.getPath('userData'), 'quickfolder-data.json');

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    return {
      workspaces: [
        { id: 'default', name: 'General', folders: [] }
      ],
      activeWorkspace: 'default'
    };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

let mainWindow;
let tray;
let isPinned = false;
let terminalApp = 'Terminal';
let hotEdgeEnabled = true;

const TERMINAL_OPTIONS = ['Terminal', 'iTerm', 'Warp', 'Alacritty', 'kitty', 'Ghostty'];

function buildTerminalSubmenu() {
  return TERMINAL_OPTIONS.map(t => ({
    label: t, type: 'radio', checked: t === terminalApp,
    click: () => saveTerminalSetting(t)
  }));
}

function loadSettings() {
  const data = loadData();
  terminalApp = data.terminalApp || 'Terminal';
  hotEdgeEnabled = data.hotEdgeEnabled !== false;
}

function saveTerminalSetting(app) {
  const data = loadData();
  data.terminalApp = app;
  saveData(data);
  terminalApp = app;
}
let isDragging = false;
let dragEndTimer = null;

// ── Hot Edge + Auto-Hide 통합 관리 ──
let edgeTimer = null;
let hoverStart = 0;
let lastShowTime = 0;
const EDGE_THRESHOLD = 50;    // 상단에서 50px 이내 (전체화면 메뉴바 영역 포함)
const EDGE_DELAY = 250;       // 250ms 유지 시 트리거
const SHOW_COOLDOWN = 1500;   // 창 뜬 후 1.5초간 재트리거/자동숨김 방지
const HIDE_MARGIN = 40;       // 창 주변 여유 마진

function startEdgeAndAutoHide() {
  edgeTimer = setInterval(() => {
    if (!mainWindow) return;

    const now = Date.now();
    const point = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(point);
    const topEdge = display.bounds.y;
    const inCooldown = (now - lastShowTime) < SHOW_COOLDOWN;
    const isVisible = mainWindow.isVisible() && !mainWindow.isMinimized();

    // ── 1) Hot Edge: 창이 안 보이면 상단 감지 후 열기 ──
    if (!isVisible && hotEdgeEnabled) {
      if (point.y <= topEdge + EDGE_THRESHOLD) {
        if (hoverStart === 0) {
          hoverStart = now;
        } else if (now - hoverStart >= EDGE_DELAY) {
          hoverStart = 0;
          lastShowTime = now;
          showWindowAtCursor(point, display);
        }
      } else {
        hoverStart = 0;
      }
      return; // 창이 안 보이면 auto-hide 체크 불필요
    }

    // ── 2) Auto-Hide: 창이 보이면 마우스 이탈 시 숨기기 ──
    // 포커스 상태(사용자가 직접 조작 중)면 auto-hide 안 함
    if (isPinned || inCooldown || isDragging || mainWindow.isFocused()) return;

    const bounds = mainWindow.getBounds();
    const inside =
      point.x >= bounds.x - HIDE_MARGIN &&
      point.x <= bounds.x + bounds.width + HIDE_MARGIN &&
      point.y >= Math.min(0, bounds.y - HIDE_MARGIN) &&
      point.y <= bounds.y + bounds.height + HIDE_MARGIN;

    if (!inside) {
      mainWindow.setAlwaysOnTop(false);
      mainWindow.hide();
    }
  }, 200);
}

function showWindowAtCursor(point, display) {
  if (mainWindow.isMinimized()) mainWindow.restore();
  const windowBounds = mainWindow.getBounds();
  const area = display.workArea;

  let x = Math.round(point.x - windowBounds.width / 2);
  x = Math.max(area.x, Math.min(x, area.x + area.width - windowBounds.width));

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  if (!isPinned) mainWindow.setAlwaysOnTop(true, 'screen-saver');
  // 먼저 위치 설정 후 show (디스플레이 이동 보장)
  mainWindow.setBounds({ x, y: area.y, width: windowBounds.width, height: windowBounds.height });
  mainWindow.showInactive();
}

function showWindow() {
  if (mainWindow.isMinimized()) mainWindow.restore();
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  const { x, y, width } = display.workArea;
  const windowBounds = mainWindow.getBounds();

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  if (!isPinned) mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setPosition(
    Math.round(x + (width - windowBounds.width) / 2),
    y
  );
  lastShowTime = Date.now();
  mainWindow.show();
  mainWindow.focus();
  if (!isPinned) setTimeout(() => mainWindow.setAlwaysOnTop(false), 100);
}

// ── Tray ──
function createTray() {
  let icon = nativeImage.createFromPath(path.join(__dirname, 'icon-tray.png'));
  icon.setTemplateImage(true);
  icon = icon.resize({ width: 18, height: 18 });

  tray = new Tray(icon);
  tray.setToolTip('QuickFolder');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'QuickFolder 열기', click: () => showWindow() },
    { label: '업데이트 확인', click: () => checkForUpdates(false) },
    { type: 'separator' },
    { label: '기본 터미널', submenu: buildTerminalSubmenu() },
    { type: 'separator' },
    { label: '종료', click: () => { app.isQuitting = true; app.quit(); } }
  ]);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      showWindow();
    }
  });

  tray.on('right-click', () => {
    tray.popUpContextMenu(contextMenu);
  });
}

// ── Window ──
function createWindow() {
  mainWindow = new BrowserWindow({
    width: loadData().windowWidth || 480,
    height: loadData().windowHeight || 230,
    minWidth: 280,
    minHeight: 120,
    type: 'panel',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d1117',
    vibrancy: 'under-window',
    icon: APP_ICON,
    show: false,
    skipTaskbar: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');

  // ── 드래그 중 auto-hide 방지 ──
  let resizeSaveTimer = null;
  mainWindow.on('resize', () => {
    if (resizeSaveTimer) clearTimeout(resizeSaveTimer);
    resizeSaveTimer = setTimeout(() => {
      const bounds = mainWindow.getBounds();
      const d = loadData();
      d.windowWidth = bounds.width;
      d.windowHeight = bounds.height;
      saveData(d);
    }, 500);
  });

  mainWindow.on('will-move', () => {
    isDragging = true;
    if (dragEndTimer) clearTimeout(dragEndTimer);
  });

  mainWindow.on('moved', () => {
    if (dragEndTimer) clearTimeout(dragEndTimer);
    dragEndTimer = setTimeout(() => {
      isDragging = false;
      lastShowTime = Date.now(); // 드래그 끝난 후 쿨다운 재적용
    }, 300);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    lastShowTime = Date.now();
    mainWindow.show();
  });

  // Hide instead of close (keeps running in tray)
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// ── App Lifecycle ──
app.whenReady().then(() => {
  if (app.dock) app.dock.show();
  loadSettings();
  createWindow();
  createTray();
  startEdgeAndAutoHide();
  // 앱 시작 5초 후 업데이트 체크
  setTimeout(() => checkForUpdates(true), 5000);
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (edgeTimer) clearInterval(edgeTimer);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow) {
    showWindow();
  } else {
    createWindow();
  }
});

// ── IPC Handlers ──
ipcMain.handle('load-data', () => loadData());

ipcMain.handle('save-data', (_, data) => {
  saveData(data);
  return true;
});

ipcMain.handle('select-folder', async () => {
  const wasPinned = isPinned;
  isPinned = true; // 다이얼로그 열리는 동안 auto-hide 방지
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'multiSelections']
  });
  isPinned = wasPinned; // 원래 핀 상태 복원
  lastShowTime = Date.now(); // 쿨다운 재적용
  if (result.canceled) return [];
  return result.filePaths;
});

ipcMain.handle('open-folder', (_, folderPath) => {
  const winBounds = mainWindow.getBounds();
  const display = screen.getDisplayNearestPoint({ x: winBounds.x, y: winBounds.y });
  const { x, y, width, height } = display.workArea;

  const finderW = Math.min(800, width - 100);
  const finderH = Math.min(500, height - 100);
  const finderX = x + Math.round((width - finderW) / 2);
  const finderY = y + Math.round((height - finderH) / 2);

  const escapedPath = folderPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const script = [
    'tell application "Finder"',
    `  open (POSIX file "${escapedPath}" as alias)`,
    `  set bounds of front Finder window to {${finderX}, ${finderY}, ${finderX + finderW}, ${finderY + finderH}}`,
    '  activate',
    'end tell'
  ].join('\n');

  require('child_process').execFile('osascript', ['-e', script], (err) => {
    if (err) {
      // AppleScript 실패 시 fallback
      shell.openPath(folderPath);
    }
  });
});

ipcMain.handle('open-in-terminal', (_, folderPath) => {
  const escaped = folderPath.replace(/"/g, '\\"');
  require('child_process').exec(`open -a "${terminalApp}" "${escaped}"`);
});

ipcMain.handle('get-folder-info', (_, folderPath) => {
  try {
    const stats = fs.statSync(folderPath);
    const items = fs.readdirSync(folderPath);
    return {
      exists: true,
      itemCount: items.length,
      modified: stats.mtime.toISOString()
    };
  } catch {
    return { exists: false, itemCount: 0, modified: null };
  }
});


ipcMain.handle('toggle-pin', () => {
  isPinned = !isPinned;
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(isPinned);
  }
  return isPinned;
});

ipcMain.handle('get-pinned', () => isPinned);

const FOLDER_COLORS = [
  { label: '기본', value: '' },
  { label: '🔴 빨강', value: '#f85149' },
  { label: '🟠 주황', value: '#f0883e' },
  { label: '🟡 노랑', value: '#d29922' },
  { label: '🟢 초록', value: '#3fb950' },
  { label: '🔵 파랑', value: '#2f81f7' },
  { label: '🟣 보라', value: '#a371f7' },
  { label: '⚪ 회색', value: '#8b949e' },
];

ipcMain.handle('show-folder-menu', (_, index) => {
  const menu = Menu.buildFromTemplate([
    { label: 'Finder에서 열기', click: () => mainWindow.webContents.send('folder-action', { action: 'open', index }) },
    { label: '터미널에서 열기', click: () => mainWindow.webContents.send('folder-action', { action: 'terminal', index }) },
    { type: 'separator' },
    { label: '색상', submenu: FOLDER_COLORS.map(c => ({
      label: c.label,
      click: () => mainWindow.webContents.send('folder-action', { action: 'color', index, color: c.value })
    }))},
    { label: '이름 변경', click: () => mainWindow.webContents.send('folder-action', { action: 'rename', index }) },
    { label: '제거', click: () => mainWindow.webContents.send('folder-action', { action: 'remove', index }) }
  ]);
  menu.popup({ window: mainWindow });
});

ipcMain.handle('show-ws-menu', (_, wsId) => {
  const menu = Menu.buildFromTemplate([
    { label: '이름 변경', click: () => mainWindow.webContents.send('ws-action', { action: 'rename', wsId }) },
    { label: '삭제', click: () => mainWindow.webContents.send('ws-action', { action: 'delete', wsId }) }
  ]);
  menu.popup({ window: mainWindow });
});

ipcMain.handle('set-search-mode', (_, active) => {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  const savedHeight = loadData().windowHeight || 230;
  if (active) {
    mainWindow.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: Math.max(400, savedHeight) });
  } else {
    mainWindow.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: savedHeight });
  }
});

ipcMain.handle('search-folders', (_, query) => {
  return new Promise((resolve) => {
    if (!query || query.trim().length < 2) return resolve([]);
    const escaped = query.replace(/"/g, '\\"');
    const cmd = `mdfind "kMDItemContentType == public.folder && kMDItemDisplayName == '*${escaped}*'" | head -20`;
    require('child_process').exec(cmd, { timeout: 3000 }, (err, stdout) => {
      if (err) return resolve([]);
      const results = stdout.trim().split('\n').filter(Boolean).map(p => ({
        path: p,
        name: p.split('/').pop()
      }));
      resolve(results);
    });
  });
});

ipcMain.handle('get-version', () => ({
  version: CURRENT_VERSION,
  isDev: !app.isPackaged
}));

ipcMain.handle('open-github', () => {
  shell.openExternal('https://github.com/don-key/quickfolder');
});

ipcMain.handle('open-settings', () => {
  const menu = Menu.buildFromTemplate([
    { label: 'Hot Edge', type: 'checkbox', checked: hotEdgeEnabled, click: () => {
      hotEdgeEnabled = !hotEdgeEnabled;
      const d = loadData();
      d.hotEdgeEnabled = hotEdgeEnabled;
      saveData(d);
    }},
    { type: 'separator' },
    { label: '기본 터미널', submenu: buildTerminalSubmenu() },
    { type: 'separator' },
    { label: '자동화 권한 설정', click: () => {
      require('child_process').exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation"');
    }}
  ]);
  menu.popup({ window: mainWindow });
});
