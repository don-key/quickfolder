const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function createProfileSvg(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
    <linearGradient id="ear" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#8B7355"/>
      <stop offset="100%" style="stop-color:#6B5340"/>
    </linearGradient>
    <linearGradient id="face" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#9C8B75"/>
      <stop offset="100%" style="stop-color:#7A6B58"/>
    </linearGradient>
  </defs>

  <!-- Background circle -->
  <circle cx="256" cy="256" r="256" fill="url(#bg)"/>

  <!-- Subtle pattern -->
  <circle cx="256" cy="256" r="240" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="2"/>
  <circle cx="256" cy="256" r="220" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>

  <!-- Left ear -->
  <ellipse cx="155" cy="115" rx="45" ry="75" transform="rotate(-20 155 115)" fill="url(#ear)"/>
  <ellipse cx="155" cy="115" rx="28" ry="50" transform="rotate(-20 155 115)" fill="#C4A882"/>

  <!-- Right ear -->
  <ellipse cx="357" cy="115" rx="45" ry="75" transform="rotate(20 357 115)" fill="url(#ear)"/>
  <ellipse cx="357" cy="115" rx="28" ry="50" transform="rotate(20 357 115)" fill="#C4A882"/>

  <!-- Head -->
  <ellipse cx="256" cy="240" rx="140" ry="155" fill="url(#face)"/>

  <!-- Muzzle -->
  <ellipse cx="256" cy="310" rx="90" ry="65" fill="#C4A882"/>

  <!-- Eyes -->
  <!-- Left eye white -->
  <ellipse cx="205" cy="220" rx="30" ry="32" fill="white"/>
  <!-- Left eye pupil -->
  <circle cx="210" cy="222" r="16" fill="#2D1B0E"/>
  <!-- Left eye shine -->
  <circle cx="216" cy="215" r="6" fill="white"/>

  <!-- Right eye white -->
  <ellipse cx="307" cy="220" rx="30" ry="32" fill="white"/>
  <!-- Right eye pupil -->
  <circle cx="302" cy="222" r="16" fill="#2D1B0E"/>
  <!-- Right eye shine -->
  <circle cx="308" cy="215" r="6" fill="white"/>

  <!-- Eyebrows (friendly) -->
  <path d="M175 195 Q195 183 230 190" stroke="#5A4A3A" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M337 195 Q317 183 282 190" stroke="#5A4A3A" stroke-width="4" fill="none" stroke-linecap="round"/>

  <!-- Nostrils -->
  <ellipse cx="235" cy="305" rx="12" ry="10" fill="#8B7355"/>
  <ellipse cx="277" cy="305" rx="12" ry="10" fill="#8B7355"/>

  <!-- Smile -->
  <path d="M215 340 Q256 370 297 340" stroke="#6B5340" stroke-width="4" fill="none" stroke-linecap="round"/>

  <!-- Code brackets on forehead -->
  <text x="215" y="175" font-family="SF Mono, Menlo, monospace" font-size="36" font-weight="bold" fill="rgba(255,255,255,0.7)">&lt;/&gt;</text>

  <!-- Key icon (don-KEY) -->
  <g transform="translate(370, 380) rotate(30)" opacity="0.9">
    <circle cx="0" cy="0" r="18" fill="none" stroke="#FFD700" stroke-width="5"/>
    <line x1="15" y1="10" x2="50" y2="10" stroke="#FFD700" stroke-width="5" stroke-linecap="round"/>
    <line x1="40" y1="10" x2="40" y2="22" stroke="#FFD700" stroke-width="4" stroke-linecap="round"/>
    <line x1="48" y1="10" x2="48" y2="18" stroke="#FFD700" stroke-width="4" stroke-linecap="round"/>
  </g>
</svg>`;
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 512, height: 512, show: false, webPreferences: { offscreen: true } });

  const svg = createProfileSvg(512);
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

  await win.loadURL(`data:text/html,
    <html><body style="margin:0;padding:0;background:transparent">
    <img src="${dataUri}" width="512" height="512">
    </body></html>`);

  win.setSize(512, 512);
  await new Promise(r => setTimeout(r, 300));
  const image = await win.webContents.capturePage();
  const png = image.resize({ width: 512, height: 512 }).toPNG();

  const outPath = path.join(__dirname, 'profile-donkey.png');
  fs.writeFileSync(outPath, png);
  console.log(`Profile image saved: ${outPath}`);

  app.quit();
});
