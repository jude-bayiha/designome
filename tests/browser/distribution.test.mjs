import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';

const execute = promisify(execFile);
const repository = path.resolve(import.meta.dirname, '../..');
const require = createRequire(import.meta.url);

test('distributed skill installs twice, discovers nested Playwright and captures real ready rendered evidence', async (t) => {
  const evidenceRoot =
    process.env.DESIGNOME_BROWSER_EVIDENCE_DIR ?? os.tmpdir();
  await fs.mkdir(evidenceRoot, { recursive: true });
  const root = await fs.mkdtemp(path.join(evidenceRoot, 'designome-browser-'));
  if (!process.env.DESIGNOME_BROWSER_EVIDENCE_DIR)
    t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = path.join(root, 'target');
  await fs.mkdir(path.join(project, 'apps/web/src/app'), { recursive: true });
  const write = async (name, content) => {
    await fs.mkdir(path.dirname(path.join(project, name)), { recursive: true });
    await fs.writeFile(
      path.join(project, name),
      typeof content === 'string' ? content : JSON.stringify(content),
    );
  };
  await write('package.json', {
    name: 'fixture',
    private: true,
    workspaces: ['apps/*'],
  });
  await write('apps/web/package.json', {
    name: 'web',
    dependencies: { 'react-dom': '*' },
    devDependencies: { '@playwright/test': '1.64.1' },
  });
  await write('apps/web/src/app/globals.css', 'body { margin:0; }');
  await write('apps/web/playwright.config.ts', 'export default {};');
  // This models pnpm's package-local symlinks. The root has no Playwright link.
  await fs.mkdir(path.join(project, 'apps/web/node_modules/@playwright'), {
    recursive: true,
  });
  await fs.symlink(
    path.dirname(require.resolve('@playwright/test/package.json')),
    path.join(project, 'apps/web/node_modules/@playwright/test'),
    'dir',
  );
  const install = [
    path.join(repository, 'node_modules/skills/bin/cli.mjs'),
    'add',
    path.join(repository, 'skills/designome'),
    '--skill',
    'designome',
    '--agent',
    'codex',
    '--copy',
    '--yes',
  ];
  const env = {
    ...process.env,
    CI: '1',
    DISABLE_TELEMETRY: '1',
    DO_NOT_TRACK: '1',
  };
  await execute(process.execPath, install, { cwd: project, env });
  const runtime = path.join(
    project,
    '.agents/skills/designome/scripts/runtime',
  );
  const run = async (...args) =>
    JSON.parse(
      (
        await execute(
          process.execPath,
          [path.join(runtime, 'bin/designome.mjs'), ...args],
          { cwd: project, env, maxBuffer: 8 * 1024 * 1024 },
        )
      ).stdout,
    );
  const firstManifest = await fs.readFile(
    path.join(project, '.agents/skills/designome/bundle-manifest.json'),
  );
  await execute(process.execPath, install, { cwd: project, env });
  assert.deepEqual(
    await fs.readFile(
      path.join(project, '.agents/skills/designome/bundle-manifest.json'),
    ),
    firstManifest,
  );
  const {
    discoverProject,
    inspectPlaywright,
    launchProjectPlaywright,
    createCaptureSession,
    capturePlaywrightPage,
  } = await import(pathToFileURL(path.join(runtime, 'src/index.mjs')).href);
  const context = await discoverProject({ projectPath: project });
  assert.equal(context.frontend.path, path.join(project, 'apps/web'));
  const capability = await inspectPlaywright(context);
  assert.equal(capability.available, true);
  assert.equal(capability.captureExecuted, false);
  assert.equal(capability.serverReachable, 'not-probed');
  const dna = JSON.parse(
    await fs.readFile(
      path.join(runtime, 'examples/design-dna.fidelity.reference.json'),
    ),
  );
  dna.status = 'accepted';
  const constraint = structuredClone(dna.fidelity.constraints[0]);
  constraint.id = 'constraint.synthetic-row-height';
  constraint.name = 'Synthetic row height';
  constraint.measurement = {
    target: 'sample-row',
    property: 'height',
    unit: 'px',
    expected: {
      kind: 'range',
      minimum: 38,
      maximum: 40,
      unit: 'px',
      strategy: 'audit-only',
    },
    tolerance: 0,
  };
  constraint.claim.statement =
    'Proposed synthetic fixture row-height requirement, not a source-derived value.';
  constraint.acceptance = {
    status: 'accepted',
    basis:
      'Accepted solely by the automated synthetic test author; no real DNA acceptance is implied.',
  };
  dna.fidelity.constraints.push(constraint);
  const dnaPath = path.join(root, 'dna.json');
  await fs.writeFile(dnaPath, JSON.stringify(dna));
  await run(
    'install',
    '--dna',
    dnaPath,
    '--project',
    project,
    '--instructions-reviewed',
  );
  const second = await run(
    'install',
    '--dna',
    dnaPath,
    '--project',
    project,
    '--instructions-reviewed',
  );
  assert.equal(
    second.actions.filter((x) =>
      ['create', 'update', 'delete'].includes(x.action),
    ).length,
    0,
  );
  const html = await fs.readFile(
    path.join(repository, 'tests/fixtures/transfer-board.html'),
  );
  const server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(html);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const configPath = path.join(project, '.designome/audit.config.json');
  const config = JSON.parse(await fs.readFile(configPath));
  const viewports = [1799, 1800, 1801, 1920].map((width) => ({
    name: `width-${width}`,
    width,
    height: 1000,
  }));
  config.baseUrl = baseUrl;
  config.frontend = 'apps/web';
  config.routes = [
    {
      id: 'board',
      path: '/',
      viewports,
      scenarios: ['default'],
      directions: ['ltr'],
      flows: ['period'],
      readiness: {
        selectors: ['article', 'svg[data-chart-ready="true"]'],
        fonts: ['13px Arial'],
      },
    },
  ];
  await fs.writeFile(configPath, JSON.stringify(config));
  const candidate = await run(
    'audit',
    '--project',
    project,
    '--provider',
    'existing-playwright',
    '--dry-run',
  );
  const obligation = candidate.verification.obligations.find(
    (item) => item.constraintRef === 'constraint.synthetic-row-height',
  );
  config.verification.bindings.push({
    obligationRef: obligation.id,
    layer: 'mechanical',
    method: 'measurement',
    targetContexts: viewports.map((viewport) => ({
      routeId: 'board',
      viewport,
      scenario: 'default',
      direction: 'ltr',
    })),
    sourceRefs: [],
  });
  await fs.writeFile(configPath, JSON.stringify(config));
  const plan = await run(
    'audit',
    '--project',
    project,
    '--provider',
    'existing-playwright',
    '--dry-run',
  );
  const measurementFor = (viewport) => [
    {
      checkRef: plan.verification.checks.find(
        (item) =>
          item.obligationRef === obligation.id &&
          item.targetContexts[0].viewport.width === viewport.width,
      ).id,
      target: 'sample-row',
      property: 'height',
      unit: 'px',
      metric: 'height',
      selector: 'tr',
    },
  ];
  assert.equal(plan.provider.status, 'awaiting-evidence');
  assert.equal(plan.provider.playwright.available, true);
  const browser = await launchProjectPlaywright(context, { headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const session = createCaptureSession(plan, {
    provider: 'existing-playwright',
  });
  const options = {
    id: 'ready',
    routeId: 'board',
    measurements: measurementFor(viewports[0]),
    viewport: viewports[0],
    screenshotPath: path.join(project, 'evidence/ready.png'),
    elements: [
      { id: 'sidebar', role: 'navigation', selector: 'nav' },
      { id: 'row', role: 'row', selector: 'tr' },
      { id: 'value', role: 'metric', selector: 'strong' },
    ],
  };
  await page.goto(baseUrl + '/?unready');
  await assert.rejects(
    capturePlaywrightPage(session, page, { ...options, timeout: 150 }),
    /Timeout/,
  );
  assert.equal(session.captures.length, 0);
  await assert.rejects(fs.access(options.screenshotPath));
  // A pending FontFace must also block capture, even when the chart is ready.
  await page.route('**/delayed.woff2', () => {});
  await page.evaluate(() => {
    window.releaseChart();
    const face = new FontFace('Delayed', 'url("/delayed.woff2")');
    document.fonts.add(face);
    face.load().catch(() => {});
  });
  await assert.rejects(
    capturePlaywrightPage(session, page, { ...options, timeout: 150 }),
    /Timeout/,
  );
  await page.goto(baseUrl);
  const capture = await capturePlaywrightPage(session, page, options);
  assert.equal(capture.execution.captureExecuted, true);
  assert.equal(capture.execution.readiness.status, 'ready');
  assert.equal(capture.execution.fontInspection, 'executed');
  assert.ok(
    capture.execution.renderedFonts.some((x) =>
      x.fonts.some((f) => f.glyphCount > 0),
    ),
  );
  assert.equal(capture.nativeDimensions.width, 1799);
  const before = [],
    after = [];
  before.push({
    width: 1799,
    fontSize: capture.elements[1].fontSize,
    rowHeight: capture.elements[1].rect.height,
    sidebar: capture.elements[0].rect.width,
  });
  for (const viewport of viewports.slice(1)) {
    await page.goto(baseUrl + '/?drift');
    const c = await capturePlaywrightPage(session, page, {
      ...options,
      id: `drift-${viewport.width}`,
      viewport,
      measurements: measurementFor(viewport),
      screenshotPath: path.join(
        project,
        `evidence/drift-${viewport.width}.png`,
      ),
    });
    before.push({
      width: viewport.width,
      fontSize: c.elements[1].fontSize,
      rowHeight: c.elements[1].rect.height,
      sidebar: c.elements[0].rect.width,
    });
  }
  assert.ok(before[1].rowHeight > before[0].rowHeight * 1.2);
  assert.equal(new Set(before.map((x) => x.sidebar)).size, 1);
  const evidencePath = path.join(project, 'evidence/browser.json');
  await page.getByRole('button').click();
  assert.equal(await page.getByRole('button').textContent(), 'Period changed');
  await session.recordInteraction({
    id: 'period-change',
    routeId: 'board',
    flowId: 'period',
    kind: 'filter',
    expected: 'Period changed',
    observed: 'Period changed',
    passed: true,
    captureRef: capture.id,
  });
  await session.finalize({ allowIncomplete: true, outputPath: evidencePath });
  await run(
    'audit',
    '--project',
    project,
    '--provider',
    'existing-playwright',
    '--evidence',
    'evidence/browser.json',
    '--output',
    'evidence/audit',
  );
  const report = JSON.parse(
    await fs.readFile(path.join(project, 'evidence/audit/report.json')),
  );
  assert.equal(report.layers.perceptual.status, 'incomplete');
  assert.equal(report.layers.mechanical.status, 'failed');
  assert.equal(report.overallStatus, 'failed');
  // Synthetic correction removes only the drift class; no consumer files change.
  const corrected = createCaptureSession(plan, {
    provider: 'existing-playwright',
  });
  for (const viewport of viewports) {
    await page.goto(baseUrl);
    const c = await capturePlaywrightPage(corrected, page, {
      ...options,
      id: `fixed-${viewport.width}`,
      viewport,
      measurements: measurementFor(viewport),
      screenshotPath: path.join(
        project,
        `evidence/fixed-${viewport.width}.png`,
      ),
    });
    after.push({
      width: viewport.width,
      rowHeight: c.elements[1].rect.height,
      sidebar: c.elements[0].rect.width,
      fontSize: c.elements[1].fontSize,
    });
  }
  assert.equal(new Set(after.map((x) => x.rowHeight)).size, 1);
  const correctedEvidence = await corrected.finalize({
    allowIncomplete: true,
    outputPath: path.join(project, 'evidence/corrected.json'),
  });
  const { evaluateAuditVerification } = await import(
    pathToFileURL(path.join(runtime, 'src/index.mjs')).href
  );
  const evaluated = evaluateAuditVerification({
    verification: plan.verification,
    evidence: correctedEvidence,
    dna,
  });
  assert.ok(
    evaluated.checks
      .filter((item) => item.obligationRef === obligation.id)
      .every((item) => item.result === 'passed'),
  );
  assert.equal(evaluated.status, 'incomplete');
  await fs.writeFile(
    path.join(root, 'results.json'),
    JSON.stringify(
      {
        capability,
        before,
        after,
        audit: { overallStatus: report.overallStatus, layers: report.layers },
        limitations: [
          'Synthetic 220px sidebar is a test choice, not a user requirement or a Design DNA recommendation.',
          'No source-image perceptual comparison was executed by this automated test.',
        ],
      },
      null,
      2,
    ),
  );
  console.log(`Browser distribution evidence: ${root}`);
});
