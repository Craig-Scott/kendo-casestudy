import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:6006/iframe.html?viewMode=story&id=template-builder-v1-pure-kendo-zero-customization--default';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(URL, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 2000));

// Find the license banner — look for any element containing "License key"
const licenseInfo = await page.evaluate(() => {
  const results = [];
  document.querySelectorAll('*').forEach(el => {
    if (el.children.length === 0 && el.textContent?.includes('License key')) {
      let node = el;
      for (let i = 0; i < 5; i++) {
        node = node.parentElement;
        if (!node) break;
        results.push({
          tag: node.tagName,
          class: node.className,
          id: node.id,
          style: node.getAttribute('style'),
        });
      }
    }
  });
  return results.slice(0, 10);
});

console.log('License banner ancestors:');
console.log(JSON.stringify(licenseInfo, null, 2));

// Find fixed position elements
const fixed = await page.evaluate(() => {
  const els = [];
  document.querySelectorAll('*').forEach(el => {
    const s = window.getComputedStyle(el);
    if (s.position === 'fixed' || s.position === 'sticky') {
      els.push({ tag: el.tagName, class: el.className.substring(0, 80), zIndex: s.zIndex });
    }
  });
  return els;
});
console.log('\nFixed/sticky elements:');
console.log(JSON.stringify(fixed, null, 2));

// Find watermark canvas or pseudo elements
const watermarks = await page.evaluate(() => {
  const els = [];
  document.querySelectorAll('*').forEach(el => {
    const s = window.getComputedStyle(el);
    const bg = s.backgroundImage;
    if (bg && bg !== 'none' && (bg.includes('svg') || bg.includes('data:'))) {
      els.push({ tag: el.tagName, class: el.className.substring(0, 60), bg: bg.substring(0, 80) });
    }
  });
  return els.slice(0, 15);
});
console.log('\nElements with background images:');
console.log(JSON.stringify(watermarks, null, 2));

await browser.close();
