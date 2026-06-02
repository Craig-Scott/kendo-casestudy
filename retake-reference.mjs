import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:6006/iframe.html?viewMode=story&id=template-builder-00-target-reference--reference';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });

// Wait for portal CSS async load and all secondary resource fetches
// (CSS background-image SVGs, font files, and <img> icon elements)
await new Promise(r => setTimeout(r, 6000));

// Wait for any <img> elements to finish loading
await page.evaluate(() =>
  Promise.all(
    Array.from(document.images)
      .filter(img => !img.complete)
      .map(img => new Promise(res => { img.onload = res; img.onerror = res; }))
  )
);

// Remove Kendo license banner / watermark if present
await page.evaluate(() => {
  document.querySelectorAll('body > div').forEach(el => {
    if (window.getComputedStyle(el).position === 'fixed') el.remove();
  });
  document.querySelectorAll('div').forEach(el => {
    if (window.getComputedStyle(el).backgroundImage.startsWith('url("data:image/png')) {
      el.style.backgroundImage = 'none';
    }
  });
});

await new Promise(r => setTimeout(r, 500));

await page.screenshot({
  path: 'screenshots/reference.png',
  clip: { x: 0, y: 0, width: 1440, height: 900 },
});

await browser.close();
console.log('✓ screenshots/reference.png retaken');
