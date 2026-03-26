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
let hotEdgeTimer = null;
let isHotEdgeActive = false;
let isPinned = false;

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

// Hot edge: show window when mouse reaches top of screen
function startHotEdge() {
  const HOT_EDGE_THRESHOLD = 2; // pixels from top
  const HOT_EDGE_DELAY = 300;   // ms to trigger

  let hoverStart = 0;

  hotEdgeTimer = setInterval(() => {
    if (!mainWindow) return;

    const point = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(point);
    const topEdge = display.bounds.y;

    if (point.y <= topEdge + HOT_EDGE_THRESHOLD) {
      if (!isHotEdgeActive) {
        if (hoverStart === 0) {
          hoverStart = Date.now();
        } else if (Date.now() - hoverStart >= HOT_EDGE_DELAY) {
          isHotEdgeActive = true;
          if (!mainWindow.isVisible()) {
            showWindowAtMouse(point, display);
          }
        }
      }
    } else {
      hoverStart = 0;
      if (isHotEdgeActive && point.y > topEdge + 50) {
        isHotEdgeActive = false;
      }
    }
  }, 100);
}

function showWindow() {
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  const { x, y, width } = display.workArea;
  const windowBounds = mainWindow.getBounds();

  // Center horizontally on the display where the cursor is
  mainWindow.setPosition(
    Math.round(x + (width - windowBounds.width) / 2),
    y
  );
  mainWindow.show();
  mainWindow.focus();
}

function showWindowAtMouse(point, display) {
  const windowBounds = mainWindow.getBounds();
  const displayBounds = display.workArea;

  // Position window centered on mouse X, at top of screen
  let x = Math.round(point.x - windowBounds.width / 2);
  x = Math.max(displayBounds.x, Math.min(x, displayBounds.x + displayBounds.width - windowBounds.width));

  mainWindow.setPosition(x, displayBounds.y);
  mainWindow.show();
  mainWindow.focus();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 640,
    minWidth: 360,
    minHeight: 400,
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

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Hide instead of close (keeps running in tray)
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // Hide window when mouse leaves it
  let mouseLeaveTimer = null;
  const MOUSE_LEAVE_DELAY = 400; // ms grace period

  function startMouseTracking() {
    if (mouseLeaveTimer) return;
    mouseLeaveTimer = setInterval(() => {
      if (!mainWindow || !mainWindow.isVisible()) {
        stopMouseTracking();
        return;
      }
      const point = screen.getCursorScreenPoint();
      const bounds = mainWindow.getBounds();
      const margin = 20; // px grace area around window
      const inside =
        point.x >= bounds.x - margin &&
        point.x <= bounds.x + bounds.width + margin &&
        point.y >= bounds.y - margin &&
        point.y <= bounds.y + bounds.height + margin;

      if (!inside && !isPinned) {
        mainWindow.hide();
        isHotEdgeActive = false;
        stopMouseTracking();
      }
    }, MOUSE_LEAVE_DELAY);
  }

  function stopMouseTracking() {
    if (mouseLeaveTimer) {
      clearInterval(mouseLeaveTimer);
      mouseLeaveTimer = null;
    }
  }

  mainWindow.on('show', () => startMouseTracking());
  mainWindow.on('hide', () => stopMouseTracking());
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  startHotEdge();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (hotEdgeTimer) clearInterval(hotEdgeTimer);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  } else {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('load-data', () => loadData());

ipcMain.handle('save-data', (_, data) => {
  saveData(data);
  return true;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'multiSelections']
  });
  if (result.canceled) return [];
  return result.filePaths;
});

ipcMain.handle('open-folder', (_, folderPath) => {
  // Open Finder on the same display as the QuickFolder window
  const winBounds = mainWindow.getBounds();
  const display = screen.getDisplayNearestPoint({ x: winBounds.x, y: winBounds.y });
  const { x, y, width, height } = display.workArea;

  // Use AppleScript to open folder in Finder and position it on the same display
  const finderW = Math.min(800, width - 100);
  const finderH = Math.min(500, height - 100);
  const finderX = x + Math.round((width - finderW) / 2);
  const finderY = y + Math.round((height - finderH) / 2);

  const script = `
    tell application "Finder"
      activate
      set targetFolder to POSIX file "${folderPath.replace(/"/g, '\\"')}" as alias
      set newWindow to make new Finder window to targetFolder
      set bounds of newWindow to {${finderX}, ${finderY}, ${finderX + finderW}, ${finderY + finderH}}
    end tell
  `;
  require('child_process').exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
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
  const HEADER_HEIGHT = 38 + 50 + 40; // titlebar + header + workspace tabs
  const FOLDER_ROW = 56;              // per folder item
  const EMPTY_STATE = 140;            // empty state height
  const PADDING = 16;                 // bottom padding
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
