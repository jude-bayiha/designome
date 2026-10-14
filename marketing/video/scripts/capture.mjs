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
  viewport: { width: 1440, height: 1500 },
  deviceScaleFactor: 3,
  reference: {
    file: 'reference.png',
    width: 2048,
    height: 1714,
    sha256: createHash('sha256').update(referenceBytes).digest('hex'),
  },
  captures: [],
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
    if (pathname === '/historique') {
      // The latest-added summary repeats a private title outside the table.
      await page.addStyleTag({
        content: `
        article.dn-card:nth-child(3) > :last-child {
          color: transparent !important; position: relative !important;
        }
        article.dn-card:nth-child(3) > :last-child * { visibility: hidden !important; }
        article.dn-card:nth-child(3) > :last-child::after {
          content: '' !important; position: absolute !important;
          left: 0 !important; top: 9px !important; width: 72% !important;
          height: 9px !important; background: #dededc !important; border-radius: 4px !important;
        }
      `,
      });
    }
    await page.addStyleTag({
      content: `
      /* Keep privacy independent of transient React content or polling. */
      table tbody td:first-child, table tbody td:nth-child(5) {
        position: relative !important; color: transparent !important;
      }
      table tbody td:first-child *, table tbody td:nth-child(5) * {
        visibility: hidden !important;
      }
      table tbody td:first-child > *, table tbody td:nth-child(5) > * {
        display: none !important;
      }
      table tbody td:first-child::after, table tbody td:nth-child(5)::after {
        content: '' !important; position: absolute !important;
        left: 16px !important; top: 44% !important;
        width: 66% !important; height: 9px !important;
        border-radius: 4px !important; background: #dededc !important;
      }
      img, video, [role="tooltip"], nextjs-portal { visibility: hidden !important; }
      * { caret-color: transparent !important; animation: none !important; transition: none !important; }
    `,
    });
    const privacy = await page.evaluate((isLibrary) => {
      const table = document.querySelector('table');
      const headers = [...table.querySelectorAll('thead th')].map((cell) =>
        cell.textContent.trim(),
      );
      if (headers[0] !== 'Vidéo' || headers[4] !== 'Fichier') {
        throw new Error(
          'Table structure changed. Review the privacy selectors before capture.',
        );
      }
      const cells = [
        ...table.querySelectorAll(
          'tbody td:first-child, tbody td:nth-child(5)',
        ),
      ];
      if (!cells.length)
        throw new Error(
          'No private cells found; refusing an unverified capture.',
        );
      for (const cell of cells) {
        if (getComputedStyle(cell).color !== 'rgba(0, 0, 0, 0)')
          throw new Error('Privacy style missing.');
        if (
          getComputedStyle(cell, '::after').backgroundColor !==
          'rgb(222, 222, 220)'
        )
          throw new Error('Privacy mask missing.');
        for (const child of cell.querySelectorAll('*')) {
          if (getComputedStyle(child).visibility !== 'hidden')
            throw new Error('Private content is visible.');
        }
      }
      if (
        [...document.images].some(
          (img) => getComputedStyle(img).visibility !== 'hidden',
        )
      ) {
        throw new Error('A thumbnail is visible.');
      }
      if (isLibrary) {
        const card = document.querySelector('article.dn-card:nth-child(3)');
        if (card?.querySelector('h2')?.textContent !== 'Dernier ajout')
          throw new Error('Latest-added summary structure changed.');
        if (
          getComputedStyle(card.lastElementChild).color !== 'rgba(0, 0, 0, 0)'
        )
          throw new Error('Latest-added title is visible.');
      }
      return {
        privateCellsMasked: cells.length,
        thumbnailsHidden: document.images.length,
        latestAddedTitleMasked: isLibrary,
      };
    }, pathname === '/historique');
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
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
