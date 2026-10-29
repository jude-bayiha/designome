import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { chromium } from '@playwright/test';
import {
  createCaptureSession,
  capturePlaywrightPage,
} from '../../skills/designome/scripts/runtime/src/index.mjs';

async function fixture(t) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'designome-capture-state-'),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const viewport = { width: 800, height: 800 };
  const page = await browser.newPage({ viewport });
  const session = createCaptureSession({
    projectRoot: directory,
    baseUrl: 'http://capture.test',
    routes: [
      {
        id: 'board',
        path: '/',
        viewports: [viewport],
        scenarios: ['default'],
        directions: ['ltr'],
        flows: [],
      },
    ],
  });
  const options = {
    id: 'ready',
    routeId: 'board',
    viewport,
    screenshotPath: path.join(directory, 'capture.png'),
    readiness: { selectors: ['#row'], fonts: [] },
    elements: [{ id: 'row', role: 'data-row', selector: '#row' }],
    timeout: 2000,
  };
  return { directory, page, session, options };
}

test('rendered measurements match pixels after finite motion, while infinite motion resumes', async (t) => {
  const { page, session, options } = await fixture(t);
  await page.setContent(
    '<style>html,body{margin:0;height:100vh;background:white}@keyframes grow{from{height:20px}to{height:200px}}@keyframes pulse{from{opacity:1}to{opacity:.5}}#row{width:100px;background:black;animation:grow 60s steps(1,end) forwards}#pulse{animation:pulse 60s steps(1,end) infinite}</style><div id="row"></div><span id="pulse">Status</span>',
  );
  const capture = await capturePlaywrightPage(session, page, options);
  assert.equal(capture.elements[0].rect.height, 200);
  assert.equal(
    capture.elements[0].rect.height,
    await page
      .locator('#row')
      .evaluate((node) => node.getBoundingClientRect().height),
  );
  assert.deepEqual(
    await fs.readFile(options.screenshotPath),
    await page.screenshot({ animations: 'allow' }),
  );
  assert.equal(
    await page
      .locator('#pulse')
      .evaluate((node) => node.getAnimations()[0].playState),
    'running',
  );
});

test('offscreen lazy images do not block viewport capture, but visible pending images do', async (t) => {
  const { page, session, options } = await fixture(t);
  let requests = 0;
  await page.route('**/slow.png', () => {
    requests++;
  });
  await page.route('http://capture.test/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<div id="row" style="height:40px">Ready</div><div style="height:18000px"></div><img loading="lazy" width="100" height="100" src="http://capture.test/slow.png">',
    }),
  );
  await page.goto('http://capture.test/');
  assert.equal(
    await page.locator('img').evaluate((node) => node.complete),
    false,
  );
  const capture = await capturePlaywrightPage(session, page, options);
  assert.equal(capture.execution.readiness.status, 'ready');
  assert.equal(requests, 0);
  await page.locator('img').scrollIntoViewIfNeeded();
  await assert.rejects(
    capturePlaywrightPage(session, page, {
      ...options,
      id: 'pending',
      screenshotPath: path.join(
        path.dirname(options.screenshotPath),
        'pending.png',
      ),
      timeout: 300,
    }),
    /Timeout/,
  );
  assert.equal(session.captures.length, 1);
});

test('a state change during the screenshot cannot publish stale measurements or overwrite evidence', async (t) => {
  const { page, session, options } = await fixture(t);
  await page.setContent('<div id="row" style="height:40px">Ready</div>');
  const screenshot = page.screenshot.bind(page);
  page.screenshot = async (captureOptions) => {
    await page.locator('#row').evaluate((node) => {
      node.style.height = '120px';
    });
    return screenshot(captureOptions);
  };
  await assert.rejects(capturePlaywrightPage(session, page, options), {
    code: 'CAPTURE_RENDER_CHANGED',
  });
  assert.equal(session.captures.length, 0);
  await assert.rejects(fs.access(options.screenshotPath));
  page.screenshot = screenshot;
  await fs.writeFile(options.screenshotPath, 'Existing evidence');
  await assert.rejects(capturePlaywrightPage(session, page, options), {
    code: 'CAPTURE_OUTPUT_EXISTS',
  });
  assert.equal(
    await fs.readFile(options.screenshotPath, 'utf8'),
    'Existing evidence',
  );
});
