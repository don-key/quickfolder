// State
let data = { workspaces: [], activeWorkspace: 'default' };

// DOM Elements
const workspaceTabs = document.getElementById('workspace-tabs');
const folderList = document.getElementById('folder-list');
const addWorkspaceBtn = document.getElementById('add-workspace');
const addFolderBtn = document.getElementById('btn-add-folder');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalInput = document.getElementById('modal-input');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');
const contextMenu = document.getElementById('context-menu');
const wsContextMenu = document.getElementById('ws-context-menu');

let contextTarget = null;
let modalCallback = null;

// Initialize
async function init() {
  data = await window.api.loadData();
  render();
}

// Helpers
function activeWs() {
  return data.workspaces.find(w => w.id === data.activeWorkspace) || data.workspaces[0];
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function folderName(folderPath) {
  return folderPath.split('/').filter(Boolean).pop() || folderPath;
}

function shortenPath(folderPath) {
  return folderPath.replace(/^\/Users\/[^/]+/, '~');
}

// Render
function render() {
  renderWorkspaceTabs();
  renderFolderList();
  // Dynamically resize window based on folder count
  const ws = activeWs();
  const count = ws ? ws.folders.length : 0;
  window.api.resizeWindow(count);
}

function renderWorkspaceTabs() {
  workspaceTabs.innerHTML = data.workspaces.map(ws => `
    <button class="workspace-tab ${ws.id === data.activeWorkspace ? 'active' : ''}"
            data-ws-id="${ws.id}"
            draggable="true"
            oncontextmenu="showWsContextMenu(event, '${ws.id}')">
      ${ws.name}<span class="count">${ws.folders.length}</span>
    </button>
  `).join('');

  let dragSrcWsId = null;

  workspaceTabs.querySelectorAll('.workspace-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      data.activeWorkspace = tab.dataset.wsId;
      save();
      render();
    });

    // Drag & drop reorder
    tab.addEventListener('dragstart', (e) => {
      dragSrcWsId = tab.dataset.wsId;
      tab.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    tab.addEventListener('dragend', () => {
      tab.classList.remove('dragging');
      dragSrcWsId = null;
      workspaceTabs.querySelectorAll('.workspace-tab').forEach(t => t.classList.remove('drag-over-left', 'drag-over-right'));
    });

    tab.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (tab.dataset.wsId === dragSrcWsId) return;
      const rect = tab.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      tab.classList.toggle('drag-over-left', e.clientX < midX);
      tab.classList.toggle('drag-over-right', e.clientX >= midX);
    });

    tab.addEventListener('dragleave', () => {
      tab.classList.remove('drag-over-left', 'drag-over-right');
    });

    tab.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragSrcWsId || tab.dataset.wsId === dragSrcWsId) return;

      const fromIdx = data.workspaces.findIndex(w => w.id === dragSrcWsId);
      const toIdx = data.workspaces.findIndex(w => w.id === tab.dataset.wsId);
      if (fromIdx === -1 || toIdx === -1) return;

      // Determine insert position based on mouse position
      const rect = tab.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const insertAfter = e.clientX >= midX;

      const [moved] = data.workspaces.splice(fromIdx, 1);
      let newIdx = data.workspaces.findIndex(w => w.id === tab.dataset.wsId);
      if (insertAfter) newIdx++;
      data.workspaces.splice(newIdx, 0, moved);

      save();
      render();
    });
  });
}

function renderFolderList() {
  const ws = activeWs();
  if (!ws || ws.folders.length === 0) {
    folderList.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>
        <p>폴더가 없습니다</p>
        <p style="font-size:12px">아래에서 폴더를 추가하세요</p>
      </div>
    `;
    return;
  }

  folderList.innerHTML = ws.folders.map((f, i) => `
    <div class="folder-item" data-index="${i}" data-path="${f.path}"
         ondblclick="openFolder('${f.path.replace(/'/g, "\\'")}')"
         oncontextmenu="showContextMenu(event, ${i})">
      <div class="folder-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>
      </div>
      <div class="folder-info">
        <div class="folder-name">${f.name}</div>
        <div class="folder-path">${shortenPath(f.path)}</div>
      </div>
      <div class="folder-meta">${f.itemCount != null ? f.itemCount + '개' : ''}</div>
    </div>
  `).join('');
}

// Save
async function save() {
  await window.api.saveData(data);
}

// Add folders
async function addFolders(paths) {
  const ws = activeWs();
  for (const p of paths) {
    if (ws.folders.some(f => f.path === p)) continue;
    const info = await window.api.getFolderInfo(p);
    ws.folders.push({
      id: genId(),
      name: folderName(p),
      path: p,
      itemCount: info.itemCount,
      addedAt: new Date().toISOString()
    });
  }
  await save();
  render();
}

// Folder actions
window.openFolder = (path) => {
  window.api.openFolder(path);
};

// Context menu for folders
window.showContextMenu = (e, index) => {
  e.preventDefault();
  contextTarget = { type: 'folder', index };
  hideAllMenus();
  contextMenu.style.left = e.clientX + 'px';
  contextMenu.style.top = e.clientY + 'px';
  contextMenu.classList.add('visible');
};

// Context menu for workspaces
window.showWsContextMenu = (e, wsId) => {
  e.preventDefault();
  e.stopPropagation();
  if (data.workspaces.length <= 1 && wsId === data.workspaces[0]?.id) return;
  contextTarget = { type: 'workspace', wsId };
  hideAllMenus();
  wsContextMenu.style.left = e.clientX + 'px';
  wsContextMenu.style.top = e.clientY + 'px';
  wsContextMenu.classList.add('visible');
};

function hideAllMenus() {
  contextMenu.classList.remove('visible');
  wsContextMenu.classList.remove('visible');
}

// Context menu actions
contextMenu.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', async () => {
    const action = btn.dataset.action;
    const ws = activeWs();
    const folder = ws.folders[contextTarget.index];

    if (action === 'open') {
      window.api.openFolder(folder.path);
    } else if (action === 'terminal') {
      window.api.openInTerminal(folder.path);
    } else if (action === 'rename') {
      showModal('폴더 별명 변경', folder.name, (newName) => {
        if (newName.trim()) {
          folder.name = newName.trim();
          save();
          render();
        }
      });
    } else if (action === 'remove') {
      ws.folders.splice(contextTarget.index, 1);
      await save();
      render();
    }
    hideAllMenus();
  });
});

// Workspace context menu actions
wsContextMenu.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', async () => {
    const action = btn.dataset.action;
    const wsId = contextTarget.wsId;
    const ws = data.workspaces.find(w => w.id === wsId);

    if (action === 'rename-ws') {
      showModal('워크스페이스 이름 변경', ws.name, (newName) => {
        if (newName.trim()) {
          ws.name = newName.trim();
          save();
          render();
        }
      });
    } else if (action === 'delete-ws') {
      if (data.workspaces.length <= 1) return;
      data.workspaces = data.workspaces.filter(w => w.id !== wsId);
      if (data.activeWorkspace === wsId) {
        data.activeWorkspace = data.workspaces[0].id;
      }
      await save();
      render();
    }
    hideAllMenus();
  });
});

// Modal
function showModal(title, defaultValue, callback) {
  modalTitle.textContent = title;
  modalInput.value = defaultValue || '';
  modalCallback = callback;
  modalOverlay.classList.add('visible');
  setTimeout(() => modalInput.focus(), 50);
}

function hideModal() {
  modalOverlay.classList.remove('visible');
  modalCallback = null;
}

modalCancel.addEventListener('click', hideModal);
modalConfirm.addEventListener('click', () => {
  if (modalCallback) modalCallback(modalInput.value);
  hideModal();
});
modalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (modalCallback) modalCallback(modalInput.value);
    hideModal();
  } else if (e.key === 'Escape') {
    hideModal();
  }
});
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) hideModal();
});

// Pin toggle
const pinBtn = document.getElementById('btn-pin');
pinBtn.addEventListener('click', async () => {
  const pinned = await window.api.togglePin();
  pinBtn.classList.toggle('pinned', pinned);
});
// Init pin state
window.api.getPinned().then(pinned => {
  pinBtn.classList.toggle('pinned', pinned);
});

// Add workspace
addWorkspaceBtn.addEventListener('click', () => {
  showModal('새 워크스페이스', '', (name) => {
    if (!name.trim()) return;
    const ws = { id: genId(), name: name.trim(), folders: [] };
    data.workspaces.push(ws);
    data.activeWorkspace = ws.id;
    save();
    render();
  });
});

// Add folder button
addFolderBtn.addEventListener('click', async () => {
  const paths = await window.api.selectFolder();
  if (paths.length > 0) addFolders(paths);
});

// Close menus on click elsewhere
document.addEventListener('click', () => {
  hideAllMenus();
});

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideAllMenus();
    hideModal();
  }
});

// Start
init();
