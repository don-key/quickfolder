// Generate app icons from SVG using Electron's nativeImage
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Beautiful gradient folder icon SVG
function createIconSvg(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1f2e"/>
      <stop offset="100%" style="stop-color:#0d1117"/>
    </linearGradient>
    <linearGradient id="folder-back" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb"/>
      <stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
    <linearGradient id="folder-front" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6"/>
      <stop offset="100%" style="stop-color:#2563eb"/>
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.25)"/>
      <stop offset="100%" style="stop-color:rgba(255,255,255,0)"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="rgba(0,0,0,0.4)"/>
    </filter>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background rounded square -->
  <rect width="512" height="512" rx="108" ry="108" fill="url(#bg)"/>

  <!-- Subtle grid pattern -->
  <g opacity="0.03">
    <line x1="128" y1="0" x2="128" y2="512" stroke="white" stroke-width="1"/>
    <line x1="256" y1="0" x2="256" y2="512" stroke="white" stroke-width="1"/>
    <line x1="384" y1="0" x2="384" y2="512" stroke="white" stroke-width="1"/>
    <line x1="0" y1="128" x2="512" y2="128" stroke="white" stroke-width="1"/>
    <line x1="0" y1="256" x2="512" y2="256" stroke="white" stroke-width="1"/>
    <line x1="0" y1="384" x2="512" y2="384" stroke="white" stroke-width="1"/>
  </g>

  <!-- Glow behind folder -->
  <ellipse cx="256" cy="300" rx="140" ry="80" fill="#3b82f6" opacity="0.15" filter="url(#glow)"/>

  <!-- Folder back -->
  <path d="M108 175 L108 370 C108 386 121 399 137 399 L375 399 C391 399 404 386 404 370 L404 205 C404 189 391 176 375 176 L268 176 L238 148 C234 144 228 142 222 142 L137 142 C121 142 108 155 108 171 Z"
        fill="url(#folder-back)" filter="url(#shadow)"/>

  <!-- Folder tab -->
  <path d="M108 171 C108 155 121 142 137 142 L222 142 C228 142 234 144 238 148 L268 176 L108 176 Z"
        fill="#2563eb"/>

  <!-- Folder front -->
  <path d="M88 220 L88 385 C88 401 101 414 117 414 L395 414 C411 414 424 401 424 385 L424 220 C424 204 411 191 395 191 L117 191 C101 191 88 204 88 220 Z"
        fill="url(#folder-front)" filter="url(#shadow)"/>

  <!-- Shine on folder front -->
  <path d="M88 220 C88 204 101 191 117 191 L395 191 C411 191 424 204 424 220 L424 260 C350 270 200 265 88 250 Z"
        fill="url(#shine)"/>

  <!-- Hub dots (connected nodes) -->
  <g filter="url(#shadow)">
    <!-- Center dot -->
    <circle cx="256" cy="310" r="16" fill="white"/>
    <!-- Top dot -->
    <circle cx="256" cy="250" r="10" fill="white" opacity="0.9"/>
    <!-- Left dot -->
    <circle cx="196" cy="340" r="10" fill="white" opacity="0.9"/>
    <!-- Right dot -->
    <circle cx="316" cy="340" r="10" fill="white" opacity="0.9"/>
    <!-- Lines -->
    <line x1="256" y1="295" x2="256" y2="260" stroke="white" stroke-width="3" opacity="0.6"/>
    <line x1="245" y1="320" x2="206" y2="335" stroke="white" stroke-width="3" opacity="0.6"/>
    <line x1="267" y1="320" x2="306" y2="335" stroke="white" stroke-width="3" opacity="0.6"/>
  </g>
</svg>`;
}

// Tray icon SVG (simpler, template-style)
function createTrayIconSvg(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
  <path d="M3.5 6.5v9.5a1.5 1.5 0 001.5 1.5h13a1.5 1.5 0 001.5-1.5V9a1.5 1.5 0 00-1.5-1.5h-6L10 5.5H5A1.5 1.5 0 003.5 7z"
        fill="black" opacity="0.85"/>
  <circle cx="11" cy="12.5" r="2" fill="white"/>
  <circle cx="7.5" cy="14.5" r="1.2" fill="white"/>
  <circle cx="14.5" cy="14.5" r="1.2" fill="white"/>
  <line x1="11" y1="12.5" x2="8.2" y2="14" stroke="white" stroke-width="0.8"/>
  <line x1="11" y1="12.5" x2="13.8" y2="14" stroke="white" stroke-width="0.8"/>
</svg>`;
}

// Write SVG files
const iconDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir);

// Write main icon SVG
fs.writeFileSync(path.join(iconDir, 'icon.svg'), createIconSvg(512));
fs.writeFileSync(path.join(iconDir, 'tray-icon.svg'), createTrayIconSvg(44));

console.log('SVG icons created in icons/ directory');

// Generate PNG from SVG using sips (macOS)
// First we need to convert SVG to PNG - use a simple approach with qlmanage
const sizes = [16, 32, 64, 128, 256, 512, 1024];
const iconsetDir = path.join(iconDir, 'icon.iconset');
if (!fs.existsSync(iconsetDir)) fs.mkdirSync(iconsetDir);

// Use built-in macOS tool to convert SVG → PNG
try {
  // Create a temporary HTML file to render SVG to canvas and export PNG
  const renderHtml = path.join(iconDir, 'render.html');
  fs.writeFileSync(renderHtml, `<!DOCTYPE html>
<html><body>
<canvas id="c" width="1024" height="1024"></canvas>
<script>
const svg = \`${createIconSvg(1024)}\`;
const blob = new Blob([svg], {type: 'image/svg+xml'});
const url = URL.createObjectURL(blob);
const img = new Image();
img.onload = () => {
  const c = document.getElementById('c');
  c.getContext('2d').drawImage(img, 0, 0, 1024, 1024);
  document.title = c.toDataURL('image/png');
};
img.src = url;
</script></body></html>`);

  console.log('Render HTML created. Use Electron to generate PNGs.');
  console.log('Run: npx electron generate-icons-electron.js');
} catch (e) {
  console.error('Error:', e.message);
}
