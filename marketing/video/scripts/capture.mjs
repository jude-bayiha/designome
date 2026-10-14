import { chromium } from 'playwright';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const reference = option('--reference');
if (!reference)
  throw new Error('Pass --reference /absolute/path/to/reference.png');
const appUrl = option('--app-url', 'http://localhost:3000');
const saveBaseline = args.includes('--save-baseline');
const baselineCssPath = option('--baseline-css');
if (baselineCssPath && !saveBaseline)
  throw new Error('--baseline-css requires --save-baseline.');
const baselineCss = baselineCssPath
  ? await readFile(baselineCssPath, 'utf8')
  : null;
const publicDir = path.join(root, 'public');
const referenceBytes = await readFile(reference);
if (
  referenceBytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
  referenceBytes.readUInt32BE(16) !== 2048 ||
  referenceBytes.readUInt32BE(20) !== 1714
)
  throw new Error(
    'This film expects the supplied 2048 × 1714 PNG. Review the source and crop bounds for a different reference.',
  );
await mkdir(publicDir, { recursive: true });
await copyFile(reference, path.join(publicDir, 'reference.png'));
for (const name of [
  'designome-lockup-on-light.svg',
  'designome-mark-on-light.svg',
]) {
  await copyFile(
    path.join(root, '../../assets/brand', name),
    path.join(publicDir, name),
  );
}

// Capture only in a fresh, temporary browser context. No app files are edited.
const browser = await chromium.launch({
  headless: true,
  ...(process.env.VIDEO_BROWSER
    ? { executablePath: process.env.VIDEO_BROWSER }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1500 },
  deviceScaleFactor: 3,
});
const page = await context.newPage();
// A showcase capture never starts a download or mutates the application.
await page.route('**/api/**', (route) =>
  ['GET', 'HEAD'].includes(route.request().method())
    ? route.continue()
    : route.abort(),
);
const report = {
  status: 'observed',
  capturedAt: new Date().toISOString(),
  palettePreview: baselineCss ? 'earlier-palette-on-current-english-app' : null,
  paletteCssSha256: baselineCss
    ? createHash('sha256').update(baselineCss).digest('hex')
    : null,
  viewport: { width: 1440, height: 1500 },
  deviceScaleFactor: 3,
  reference: {
    file: 'reference.png',
    width: 2048,
    height: 1714,
    sha256: createHash('sha256').update(referenceBytes).digest('hex'),
  },
  captures: [],
  productTheme: [],
};
async function saveCapture(file, clip, privacy, framing) {
  // Pixel-aligned clips preserve whole cards, panels, and table rows.
  const box = {
    x: Math.floor(clip.x),
    y: Math.floor(clip.y),
    width: Math.ceil(clip.x + clip.width) - Math.floor(clip.x),
    height: Math.ceil(clip.y + clip.height) - Math.floor(clip.y),
  };
  await page.screenshot({
    path: path.join(publicDir, file),
    animations: 'disabled',
    clip: box,
  });
  const sha256 = createHash('sha256')
    .update(await readFile(path.join(publicDir, file)))
    .digest('hex');
  report.captures.push({
    file,
    sha256,
    privacy,
    framing,
    clip: box,
    pixels: { width: box.width * 3, height: box.height * 3 },
  });
}
try {
  for (const [name, pathname] of [
    ['glane-dashboard', '/'],
    ['glane-library', '/historique'],
  ]) {
    await page.goto(new URL(pathname, appUrl).href, {
      waitUntil: 'networkidle',
    });
    await page.locator('table tbody tr').first().waitFor();
    if (baselineCss) await page.addStyleTag({ content: baselineCss });
    if (pathname === '/historique') {
      await page.addStyleTag({
        content: `
        article.dn-card:nth-child(3) > :last-child { filter: blur(5px) !important; }
      `,
      });
    }
    await page.addStyleTag({
      content: `
      /* Blur private text only; preserve thumbnails, cell layout and metadata. */
      table tbody td:first-child > div > div:last-child,
      table tbody td:nth-child(5) > p {
        filter: blur(5px) !important;
        user-select: none !important;
      }
      [role="tooltip"], nextjs-portal { visibility: hidden !important; }
      * { caret-color: transparent !important; animation: none !important; transition: none !important; }
    `,
    });
    const privacy = await page.evaluate((isLibrary) => {
      const table = document.querySelector('table');
      const headers = [...table.querySelectorAll('thead th')].map((cell) =>
        cell.textContent.trim(),
      );
      if (headers[0] !== 'Video' || headers[4] !== 'File')
        throw new Error(
          'Table structure changed. Review the text privacy selectors.',
        );
      const rows = [...table.querySelectorAll('tbody tr')].filter(
        (row) => row.querySelectorAll('td').length === 7,
      );
      if (!rows.length)
        throw new Error(
          'No private rows found; refusing an unverified capture.',
        );
      let textSlotsBlurred = 0;
      for (const row of rows) {
        const title = row.querySelector(
          'td:first-child > div > div:last-child',
        );
        const filename = row.querySelector('td:nth-child(5) > p');
        if (
          !title?.querySelector('p[title]') ||
          !filename?.hasAttribute('title')
        )
          throw new Error('A private text slot changed structure.');
        for (const slot of [title, filename]) {
          const style = getComputedStyle(slot);
          if (
            style.filter !== 'blur(5px)' ||
            style.visibility !== 'visible' ||
            style.display === 'none'
          )
            throw new Error(
              'A private text slot must stay in place with its verified blur.',
            );
          textSlotsBlurred++;
        }
      }
      const images = [...document.images];
      if (
        images.some(
          (img) =>
            getComputedStyle(img).visibility !== 'visible' ||
            getComputedStyle(img).display === 'none',
        )
      )
        throw new Error('Thumbnails must remain visible.');
      if (isLibrary) {
        const card = document.querySelector('article.dn-card:nth-child(3)');
        if (card?.querySelector('h2')?.textContent !== 'Latest addition')
          throw new Error('Latest-added summary structure changed.');
        if (getComputedStyle(card.lastElementChild).filter !== 'blur(5px)')
          throw new Error('Latest-added title needs its privacy blur.');
      }
      return {
        textSlotsBlurred,
        blurCssPixels: 5,
        thumbnailsVisible: images.length,
        latestAddedTitleBlurred: isLibrary,
      };
    }, pathname === '/historique');
    const productTheme = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const card = document.querySelector('article.dn-card');
      const active = document.querySelector(
        '.dn-nav-link[aria-current="page"]',
      );
      return {
        emphasis: root.getPropertyValue('--designome-data-emphasis').trim(),
        chrome: root.getPropertyValue('--designome-surface-chrome').trim(),
        activeBackground: getComputedStyle(active).backgroundColor,
        activeColor: getComputedStyle(active).color,
        cardRadius: getComputedStyle(card).borderRadius,
        cardPadding: getComputedStyle(card).padding,
        bodySize: root.fontSize,
        language: document.documentElement.lang,
      };
    });
    report.productTheme.push({ pathname, ...productTheme });
    if (pathname === '/') {
      const composer = await page.locator('#nouveau').boundingBox();
      const chart = await page.locator('.activity-panel').boundingBox();
      const first = await page.locator('article.dn-card').nth(0).boundingBox();
      const second = await page.locator('article.dn-card').nth(1).boundingBox();
      if (!composer || !chart || !first || !second)
        throw new Error('Expected dashboard panels are missing.');
      const bottom = Math.ceil(
        Math.max(composer.y + composer.height, chart.y + chart.height),
      );
      await saveCapture(
        `${name}.png`,
        { x: 0, y: 0, width: 1440, height: bottom + 16 },
        privacy,
        'Dashboard overview ending after both complete analysis panels.',
      );
      await saveCapture(
        'glane-composer.png',
        composer,
        privacy,
        'Complete new-video panel.',
      );
      await saveCapture(
        'glane-chart.png',
        chart,
        privacy,
        'Complete activity panel including axes.',
      );
      await saveCapture(
        'glane-cards.png',
        {
          ...first,
          width: second.x + second.width - first.x,
        },
        privacy,
        'Two complete adjacent summary cards.',
      );
    } else {
      const first = await page.locator('article.dn-card').nth(0).boundingBox();
      const second = await page.locator('article.dn-card').nth(1).boundingBox();
      if (!first || !second)
        throw new Error('History summary cards are missing.');
      await saveCapture(
        'glane-history-cards.png',
        { ...first, width: second.x + second.width - first.x },
        privacy,
        'Two complete adjacent history summary cards, using the product palette.',
      );
      // A clearly labelled excerpt: keep five whole rows and the real table border.
      // The total remains unchanged; only this temporary capture context is affected.
      const excerptCss = await page.evaluate(() => {
        let kept = 0;
        const hidden = [];
        for (const [bodyIndex, body] of [
          ...document.querySelectorAll('table tbody'),
        ].entries()) {
          for (const [rowIndex, row] of [
            ...body.querySelectorAll('tr'),
          ].entries()) {
            const dataRow = row.querySelectorAll('td').length === 7;
            if (dataRow && kept++ < 5) continue;
            hidden.push(
              `table tbody:nth-of-type(${bodyIndex + 1}) tr:nth-child(${rowIndex + 1})`,
            );
          }
        }
        if (kept < 5)
          throw new Error('The library excerpt needs five data rows.');
        return `${hidden.join(', ')} { display: none !important; }`;
      });
      await page.addStyleTag({ content: excerptCss });
      const visibleRows = await page.locator('table tbody tr:visible').count();
      if (visibleRows !== 5)
        throw new Error(
          'The library excerpt must contain exactly five complete data rows.',
        );
      const panel = page
        .locator('section')
        .filter({ has: page.locator('table') });
      const box = await panel.boundingBox();
      if (!box) throw new Error('Library panel is missing.');
      await saveCapture(
        `${name}.png`,
        box,
        privacy,
        'Library excerpt with the first five complete rows.',
      );
    }
  }
  await writeFile(
    path.join(publicDir, 'capture-report.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  if (saveBaseline) {
    const baseline = {
      ...report,
      capturedBeforeProductPalette: !baselineCss,
      palettePreview: baselineCss
        ? 'earlier-palette-on-current-english-app'
        : null,
      captures: [],
    };
    for (const capture of report.captures.filter((entry) =>
      ['glane-dashboard.png', 'glane-cards.png'].includes(entry.file),
    )) {
      const file = capture.file.replace('glane-', 'glane-before-');
      await copyFile(
        path.join(publicDir, capture.file),
        path.join(publicDir, file),
      );
      baseline.captures.push({ ...capture, file });
    }
    await writeFile(
      path.join(publicDir, 'baseline-capture-report.json'),
      JSON.stringify(baseline, null, 2) + '\n',
    );
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
