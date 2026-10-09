// Anonymize captured runs and compose one blind review board per screen.
// Each benchmark's scripts/boards.mjs calls composeBoards with its screens and capture size.
// Options: --work <dir> --sources <dir> [--routing <file>] [--seed <text>]
// The reviewer receives review/; key.json stays with the operator until scoring is done.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  exists,
  fill,
  listImages,
  loadPlaywright,
  parseArgs,
  readJson,
  required,
  writeJson,
} from './lib.mjs';

/**
 * @param {object} config
 * @param {string} config.benchmarkRoot benchmark directory holding brief.md, rubric.md and prompts/
 * @param {string[]} config.screens capture names, one board each
 * @param {{width: number, height: number}} config.tile pixel size of a first-screen capture
 * @param {number} [config.scale] board scale of each capture
 * @param {number} [config.maxColumns] captures per board row
 * @param {string[]} [config.suffixes] capture variants copied for the reviewer
 * @param {string[]} [config.argv] command-line arguments
 */
export async function composeBoards({
  benchmarkRoot,
  screens,
  tile,
  scale = 0.5,
  maxColumns = 3,
  suffixes = ['.png', '.full.png'],
  argv = process.argv.slice(2),
}) {
  const options = parseArgs(argv);
  const work = path.resolve(required(options, 'work'));
  const sources = path.resolve(required(options, 'sources'));
  const seed = options.seed ?? crypto.randomUUID();
  const review = path.join(work, 'review');
  if (await exists(review))
    throw new Error(`${review} already exists; boards are immutable`);

  const captured = [];
  for (const runId of (await fs.readdir(path.join(work, 'captures'))).sort()) {
    const record = path.join(work, 'captures', runId, 'capture.json');
    if (!(await exists(record))) continue;
    if ((await readJson(record)).build !== 'passed') continue;
    // A run joins the review only when every screen was captured.
    let complete = true;
    for (const screen of screens)
      if (!(await exists(path.join(work, 'captures', runId, screen + '.png'))))
        complete = false;
    if (complete) captured.push(runId);
  }
  if (captured.length < 2) throw new Error('Need at least two captured runs');

  // Seeded shuffle so the operator can reproduce the assignment from key.json.
  const order = captured
    .map((runId) => ({
      runId,
      rank: crypto
        .createHash('sha256')
        .update(seed + runId)
        .digest('hex'),
    }))
    .sort((a, b) => a.rank.localeCompare(b.rank));
  const letters = Object.fromEntries(
    order.map((item, index) => [String.fromCharCode(65 + index), item.runId]),
  );

  for (const [letter, runId] of Object.entries(letters)) {
    const target = path.join(review, 'apps', letter);
    await fs.mkdir(target, { recursive: true });
    for (const screen of screens)
      for (const suffix of suffixes)
        await fs.copyFile(
          path.join(work, 'captures', runId, screen + suffix),
          path.join(target, screen + suffix),
        );
    // The override case: the reviewer checks this app against its own request.
    const request = path.join(work, 'runs', runId, 'request.md');
    if (await exists(request))
      await fs.copyFile(request, path.join(target, 'request.md'));
  }

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const columns = Math.min(maxColumns, Object.keys(letters).length);
  const tileWidth = Math.round(tile.width * scale);
  // The viewport must hold every column, or the element screenshot is clipped.
  const page = await browser.newPage({
    viewport: {
      width: 48 + columns * tileWidth + (columns - 1) * 24,
      height: 900,
    },
  });
  for (const screen of screens) {
    const tiles = [];
    for (const letter of Object.keys(letters)) {
      const image = await fs.readFile(
        path.join(review, 'apps', letter, screen + '.png'),
      );
      tiles.push(
        `<figure><figcaption>${letter}</figcaption><img src="data:image/png;base64,${image.toString('base64')}"></figure>`,
      );
    }
    await page.setContent(
      `<style>body{margin:0;padding:24px;background:#fff;font:600 20px system-ui}
main{display:grid;grid-template-columns:repeat(${columns},${tileWidth}px);gap:24px}
figure{margin:0}figcaption{margin-bottom:8px}
img{width:${tileWidth}px;display:block;outline:1px solid #ccc}</style><main>${tiles.join('')}</main>`,
      { waitUntil: 'load' },
    );
    await page.locator('main').screenshot({
      path: path.join(review, `board-${screen}.png`),
    });
  }
  await browser.close();

  await fs.mkdir(path.join(review, 'sources'));
  for (const name of await listImages(sources))
    await fs.copyFile(
      path.join(sources, name),
      path.join(review, 'sources', name),
    );
  for (const name of ['rubric.md', 'brief.md'])
    await fs.copyFile(path.join(benchmarkRoot, name), path.join(review, name));
  // Mixed sources only make sense with the subjects each one was routed to.
  if (options.routing)
    await fs.copyFile(
      path.resolve(options.routing),
      path.join(review, 'routing.md'),
    );
  await fs.writeFile(
    path.join(review, 'prompt.md'),
    fill(
      await fs.readFile(
        path.join(benchmarkRoot, 'prompts', 'reviewer.md'),
        'utf8',
      ),
      { REVIEW_DIR: review },
    ),
  );

  await writeJson(path.join(work, 'key.json'), { seed, letters });
  console.log(
    `${captured.length} apps anonymized in ${review}; key in ${work}/key.json`,
  );
}
