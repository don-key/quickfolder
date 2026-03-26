const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const iconDir = path.join(__dirname, 'icons');
const iconsetDir = path.join(iconDir, 'icon.iconset');

function createIconSvg(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1f2e"/><stop offset="100%" style="stop-color:#0d1117"/>
    </linearGradient>
    <linearGradient id="fb" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb"/><stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
    <linearGradient id="ff" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6"/><stop offset="100%" style="stop-color:#2563eb"/>
    </linearGradient>
    <linearGradient id="sh" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.25)"/><stop offset="100%" style="stop-color:rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="108" fill="url(#bg)"/>
  <ellipse cx="256" cy="300" rx="140" ry="80" fill="#3b82f6" opacity="0.15"/>
  <path d="M108 175L108 370C108 386 121 399 137 399L375 399C391 399 404 386 404 370L404 205C404 189 391 176 375 176L268 176L238 148C234 144 228 142 222 142L137 142C121 142 108 155 108 171Z" fill="url(#fb)"/>
  <path d="M88 220L88 385C88 401 101 414 117 414L395 414C411 414 424 401 424 385L424 220C424 204 411 191 395 191L117 191C101 191 88 204 88 220Z" fill="url(#ff)"/>
  <path d="M88 220C88 204 101 191 117 191L395 191C411 191 424 204 424 220L424 260C350 270 200 265 88 250Z" fill="url(#sh)"/>
  <circle cx="256" cy="310" r="16" fill="white"/>
  <circle cx="256" cy="250" r="10" fill="white" opacity="0.9"/>
  <circle cx="196" cy="340" r="10" fill="white" opacity="0.9"/>
  <circle cx="316" cy="340" r="10" fill="white" opacity="0.9"/>
  <line x1="256" y1="295" x2="256" y2="260" stroke="white" stroke-width="3" opacity="0.6"/>
  <line x1="245" y1="320" x2="206" y2="335" stroke="white" stroke-width="3" opacity="0.6"/>
  <line x1="267" y1="320" x2="306" y2="335" stroke="white" stroke-width="3" opacity="0.6"/>
</svg>`;
}

function createTrayIconSvg(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
  <path d="M7 13v19a3 3 0 003 3h24a3 3 0 003-3V18a3 3 0 00-3-3H22l-4-4H10a3 3 0 00-3 3z" fill="black" opacity="0.85"/>
  <circle cx="22" cy="25" r="3.5" fill="white"/>
  <circle cx="14" cy="29.5" r="2.2" fill="white"/>
  <circle cx="30" cy="29.5" r="2.2" fill="white"/>
  <line x1="22" y1="25" x2="15.5" y2="28.5" stroke="white" stroke-width="1.4"/>
  <line x1="22" y1="25" x2="28.5" y2="28.5" stroke="white" stroke-width="1.4"/>
</svg>`;
}

app.whenReady().then(async () => {
  if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir);
  if (!fs.existsSync(iconsetDir)) fs.mkdirSync(iconsetDir, { recursive: true });

  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    webPreferences: { offscreen: true }
  });

  // Generate app icon at various sizes
  const sizes = [
    { name: 'icon_16x16.png', size: 16 },
    { name: 'icon_16x16@2x.png', size: 32 },
    { name: 'icon_32x32.png', size: 32 },
    { name: 'icon_32x32@2x.png', size: 64 },
    { name: 'icon_128x128.png', size: 128 },
    { name: 'icon_128x128@2x.png', size: 256 },
    { name: 'icon_256x256.png', size: 256 },
    { name: 'icon_256x256@2x.png', size: 512 },
    { name: 'icon_512x512.png', size: 512 },
    { name: 'icon_512x512@2x.png', size: 1024 },
  ];

  for (const { name, size } of sizes) {
    const svg = createIconSvg(size);
    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    await win.loadURL(`data:text/html,
      <html><body style="margin:0;padding:0;background:transparent">
      <img src="${dataUri}" width="${size}" height="${size}">
      </body></html>`);

    win.setSize(size, size);
    await new Promise(r => setTimeout(r, 200));
    const image = await win.webContents.capturePage();
    const png = image.resize({ width: size, height: size }).toPNG();
    fs.writeFileSync(path.join(iconsetDir, name), png);
    console.log(`Generated ${name}`);
  }

  // Generate tray icon (44x44 for @2x)
  const traySvg = createTrayIconSvg(44);
  const trayDataUri = `data:image/svg+xml;base64,${Buffer.from(traySvg).toString('base64')}`;
  await win.loadURL(`data:text/html,
    <html><body style="margin:0;padding:0;background:transparent">
    <img src="${trayDataUri}" width="44" height="44">
    </body></html>`);
  win.setSize(44, 44);
  await new Promise(r => setTimeout(r, 200));
  const trayImg = await win.webContents.capturePage();
  const trayPng = trayImg.resize({ width: 44, height: 44 }).toPNG();
  fs.writeFileSync(path.join(__dirname, 'icon-tray.png'), trayPng);
  fs.writeFileSync(path.join(iconDir, 'tray-icon.png'), trayPng);
  console.log('Generated tray icon');

  // Also save a 512 PNG as the main icon
  const mainSvg = createIconSvg(512);
  const mainDataUri = `data:image/svg+xml;base64,${Buffer.from(mainSvg).toString('base64')}`;
  await win.loadURL(`data:text/html,
    <html><body style="margin:0;padding:0;background:transparent">
    <img src="${mainDataUri}" width="512" height="512">
    </body></html>`);
  win.setSize(512, 512);
  await new Promise(r => setTimeout(r, 200));
  const mainImg = await win.webContents.capturePage();
  fs.writeFileSync(path.join(iconDir, 'icon.png'), mainImg.resize({ width: 512, height: 512 }).toPNG());
  console.log('Generated main icon.png');

  // Create .icns using iconutil
  try {
    const { execSync } = require('child_process');
    execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(iconDir, 'icon.icns')}"`);
    console.log('Generated icon.icns');
  } catch (e) {
    console.error('iconutil failed:', e.message);
  }

  app.quit();
});
