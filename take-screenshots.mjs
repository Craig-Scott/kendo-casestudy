/**
 * take-screenshots.mjs
 *
 * Takes clean screenshots of each Storybook story for the findings site.
 * Handles:
 *   - Waiting for async CSS to load (portal CSS via useEffect)
 *   - Dismissing the Kendo license banner
 *   - Hiding the "Invalid license" diagonal watermark
 *   - Waiting for Storybook's loading spinner to clear
 */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'fs/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE   = 'http://localhost:6006/iframe.html?viewMode=story&id=';

const STORIES = [
  { name: 'reference', id: 'template-builder-00-target-reference--reference',                      wait: 3000 },
  { name: 'v1',        id: 'template-builder-v1-pure-kendo-zero-customization--default',            wait: 2000 },
  { name: 'v2',        id: 'template-builder-v2-theme-variable-overrides--default',                 wait: 2000 },
  { name: 'v3',        id: 'template-builder-v3-best-effort-kendo--default',                       wait: 2000 },
  { name: 'v4',        id: 'template-builder-v4-like-for-like-kendo--default',                     wait: 4000 },
];

// CSS injected into every page to remove Kendo licensing UI
const HIDE_LICENSE_CSS = `
  /* Kendo license notification banner */
  .k-notification-group,
  [class*="k-license"],
  [class*="kendo-license"],
  .kendo-react-license-notification,
  div[style*="z-index: 10000"],
  div[style*="z-index:10000"] { display: none !important; }

  /* Kendo "Invalid license" diagonal watermark (rendered as repeated background-image) */
  [class*="k-"], [class*="kendo-"] {
    background-image: none !important;
  }

  /* Re-apply background images that are legitimate (icons via CSS variables) */
  .ac-builder__section-header--min-max,
  .ac-builder__section-header--handle-draggable,
  .ac-builder__question-header--editing-option,
  .ac-builder__question-attribute--editing-option,
  .ac-builder__section-header--dropdown-trigger,
  .ac5-section-header--min-max,
  .ac5-section-header--handle,
  [class*="editing-option"],
  [class*="handle-draggable"],
  [class*="dropdown-trigger"] { background-image: revert !important; }
`;

await mkdir('screenshots', { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

for (const { name, id, wait } of STORIES) {
  console.log(`Capturing ${name}…`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  await page.goto(`${BASE}${id}`, { waitUntil: 'networkidle0', timeout: 30000 });

  // Extra wait for async CSS (usePortalCSS hook fires after mount)
  await new Promise(r => setTimeout(r, wait));

  // Inject CSS to hide Kendo licensing UI elements
  await page.addStyleTag({ content: HIDE_LICENSE_CSS });

  await page.evaluate(() => {
    // 1. Remove the license banner — classless div with position:fixed z-index:2000 in body
    document.querySelectorAll('body > div').forEach(el => {
      const s = window.getComputedStyle(el);
      if (s.position === 'fixed' && parseInt(s.zIndex) >= 1000) {
        el.remove();
      }
    });

    // 2. Remove the watermark — classless divs with a base64 PNG background image
    document.querySelectorAll('div').forEach(el => {
      const inlineStyle = el.getAttribute('style') ?? '';
      const computed = window.getComputedStyle(el).backgroundImage;
      if (computed.startsWith('url("data:image/png')) {
        el.style.backgroundImage = 'none';
      }
      // Also catch inline style watermarks
      if (inlineStyle.includes('data:image/png')) {
        el.style.backgroundImage = 'none';
      }
    });
  });

  await new Promise(r => setTimeout(r, 300));

  await page.screenshot({
    path: `screenshots/${name}.png`,
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.close();
  console.log(`  ✓ screenshots/${name}.png`);
}

await browser.close();
console.log('\nAll done.');
