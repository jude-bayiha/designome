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
  viewport: { width: 1440, height: 1260 },
  deviceScaleFactor: 1,
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
  viewport: { width: 1440, height: 1260 },
  captures: [],
};
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
    const file = `${name}.png`;
    await page.screenshot({
      path: path.join(publicDir, file),
      animations: 'disabled',
    });
    const sha256 = createHash('sha256')
      .update(await readFile(path.join(publicDir, file)))
      .digest('hex');
    report.captures.push({ file, sha256, privacy });
  }
  await writeFile(
    path.join(publicDir, 'capture-report.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
