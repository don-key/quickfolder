const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');

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

// ── Hot Edge + Auto-Hide 통합 관리 ──
let edgeTimer = null;
let hoverStart = 0;
let lastShowTime = 0;
const EDGE_THRESHOLD = 5;     // 상단에서 5px 이내
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
    if (!isVisible) {
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
    if (isPinned || inCooldown) return;

    const bounds = mainWindow.getBounds();
    const inside =
      point.x >= bounds.x - HIDE_MARGIN &&
      point.x <= bounds.x + bounds.width + HIDE_MARGIN &&
      point.y >= Math.min(0, bounds.y - HIDE_MARGIN) &&
      point.y <= bounds.y + bounds.height + HIDE_MARGIN;

    if (!inside) {
      mainWindow.hide();
    }
  }, 100);
}

function showWindowAtCursor(point, display) {
  if (mainWindow.isMinimized()) mainWindow.restore();
  const windowBounds = mainWindow.getBounds();
  const area = display.workArea;

  let x = Math.round(point.x - windowBounds.width / 2);
  x = Math.max(area.x, Math.min(x, area.x + area.width - windowBounds.width));

  mainWindow.setPosition(x, area.y);
  mainWindow.show();
  mainWindow.focus();
}

function showWindow() {
  if (mainWindow.isMinimized()) mainWindow.restore();
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  const { x, y, width } = display.workArea;
  const windowBounds = mainWindow.getBounds();

  mainWindow.setPosition(
    Math.round(x + (width - windowBounds.width) / 2),
    y
  );
  lastShowTime = Date.now();
  mainWindow.show();
  mainWindow.focus();
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
    { type: 'separator' },
    { label: '종료', click: () => { app.isQuitting = true; app.quit(); } }
  ]);

  tray.on('click', () => {
    if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
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
    width: 480,
    height: 200,
    minWidth: 360,
    minHeight: 150,
    maxHeight: 250,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d1117',
    vibrancy: 'under-window',
    icon: path.join(__dirname, 'icons', 'icon.png'),
    show: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
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
  createWindow();
  createTray();
  startEdgeAndAutoHide();
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
  const terminalScript = `tell application "Terminal" to do script "cd '${folderPath.replace(/'/g, "'\\''")}'"\ntell application "Terminal" to activate`;
  require('child_process').exec(`osascript -e '${terminalScript.replace(/'/g, "'\\''")}'`);
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

ipcMain.handle('resolve-dropped-paths', (_, paths) => {
  return paths.filter(p => {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  });
});

ipcMain.handle('resize-window', (_, folderCount) => {
  if (!mainWindow) return;
  const HEADER_HEIGHT = 38 + 50 + 40;
  const FOLDER_ROW = 56;
  const EMPTY_STATE = 110;
  const PADDING = 10;
  const MIN_HEIGHT = 200;
  const MAX_HEIGHT = 800;

  const contentHeight = folderCount > 0
    ? HEADER_HEIGHT + (folderCount * FOLDER_ROW) + PADDING
    : HEADER_HEIGHT + EMPTY_STATE + PADDING;

  const height = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, contentHeight));
  const bounds = mainWindow.getBounds();
  mainWindow.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height });
});

ipcMain.handle('toggle-pin', () => {
  isPinned = !isPinned;
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(isPinned);
  }
  return isPinned;
});

ipcMain.handle('get-pinned', () => isPinned);

ipcMain.handle('open-github', () => {
  shell.openExternal('https://github.com/don-key/quickfolder');
});

ipcMain.handle('open-settings', () => {
  require('child_process').exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation"');
});
