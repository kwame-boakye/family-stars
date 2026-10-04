// Renders the app icons (PNG) from an inline SVG. Run: node scripts/make-icons.mjs
import { chromium } from '@playwright/test';

const star = 'M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z';
const svg = (size, padding, rounded) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="${rounded ? 22 : 0}" fill="#fff3d6"/>
  <g transform="translate(${padding} ${padding}) scale(${(100 - 2 * padding) / 24})">
    <path d="${star}" fill="#f7b81f" stroke="#c98a00" stroke-width="0.9" stroke-linejoin="round"/>
    <circle cx="9.6" cy="11.4" r="0.9" fill="#3b2a1a"/><circle cx="14.4" cy="11.4" r="0.9" fill="#3b2a1a"/>
    <path d="M10.2 13.6 q1.8 1.6 3.6 0" stroke="#3b2a1a" stroke-width="0.7" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;

const targets = [
  ['public/icon-192.png', 192, 10, true],
  ['public/icon-512.png', 512, 10, true],
  ['public/icon-maskable-512.png', 512, 20, false],
  ['public/apple-touch-icon.png', 180, 12, false],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, pad, rounded] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(size, pad, rounded)}</body></html>`);
  await page.locator('svg').screenshot({ path: file, omitBackground: true });
  console.log('wrote', file);
}
await browser.close();
