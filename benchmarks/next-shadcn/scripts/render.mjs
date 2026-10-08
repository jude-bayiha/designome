// Build and render every generated app, then capture each route at the benchmark viewport.
// Usage: node render.mjs --work <dir> [--run <id>]... [--port <number>]
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  exists,
  loadPlaywright,
  parseArgs,
  required,
  routes,
  sha256File,
  viewport,
  writeJson,
} from './lib.mjs';

const options = parseArgs(process.argv.slice(2), { lists: ['run'] });
const work = path.resolve(required(options, 'work'));
const port = Number(options.port ?? 3100);
const runsDirectory = path.join(work, 'runs');
const runIds =
  options.run ??
  (await fs.readdir(runsDirectory)).filter((id) => !id.startsWith('.'));

const { chromium } = await loadPlaywright();
const browser = await chromium.launch();

async function isListening(url) {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server did not answer at ${url}`);
}

for (const runId of runIds.sort()) {
  const app = path.join(runsDirectory, runId, 'app');
  if (!(await exists(app))) continue;
  const output = path.join(work, 'captures', runId);
  if (await exists(output)) {
    console.log(`${runId}: captures exist, skipped`);
    continue;
  }
  await fs.mkdir(output, { recursive: true });

  const build = spawnSync('npm', ['run', 'build'], {
    cwd: app,
    encoding: 'utf8',
  });
  await fs.writeFile(
    path.join(output, 'build.log'),
    build.stdout + build.stderr,
  );
  if (build.status !== 0) {
    await writeJson(path.join(output, 'capture.json'), {
      runId,
      build: 'failed',
    });
    console.log(`${runId}: build failed, see ${output}/build.log`);
    continue;
  }

  if (await isListening(`http://localhost:${port}/`))
    throw new Error(`Port ${port} is busy; pass --port`);
  // A detached group lets the whole server tree stop, not only the npx wrapper.
  const server = spawn('npx', ['next', 'start', '-p', String(port)], {
    cwd: app,
    stdio: 'ignore',
    detached: true,
  });
  const captures = [];
  try {
    await waitForServer(`http://localhost:${port}/`);
    for (const route of routes) {
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 1,
        colorScheme: 'light',
      });
      const page = await context.newPage();
      const console_ = [];
      page.on('console', (message) => {
        if (['error', 'warning'].includes(message.type()))
          console_.push(`${message.type()}: ${message.text()}`);
      });
      page.on('pageerror', (error) => console_.push(`pageerror: ${error}`));
      const response = await page.goto(`http://localhost:${port}/${route}`, {
        waitUntil: 'networkidle',
      });
      await page.evaluate(() => document.fonts.ready);
      const first = path.join(output, `${route}.png`);
      const full = path.join(output, `${route}.full.png`);
      await page.screenshot({ path: first });
      await page.screenshot({ path: full, fullPage: true });
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        fonts: [...document.fonts]
          .filter((font) => font.status === 'loaded')
          .map((font) => font.family),
      }));
      captures.push({
        route,
        status: response?.status() ?? null,
        finalUrl: page.url(),
        firstScreen: { path: `${route}.png`, hash: await sha256File(first) },
        fullPage: { path: `${route}.full.png`, hash: await sha256File(full) },
        horizontalOverflow: metrics.scrollWidth > viewport.width,
        pageHeight: metrics.scrollHeight,
        loadedFonts: [...new Set(metrics.fonts)],
        console: console_,
      });
      await context.close();
    }
  } finally {
    process.kill(-server.pid);
  }
  await writeJson(path.join(output, 'capture.json'), {
    runId,
    build: 'passed',
    viewport,
    deviceScaleFactor: 1,
    colorScheme: 'light',
    captures,
  });
  console.log(`${runId}: ${captures.length} routes captured`);
}
await browser.close();
