import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { runAudit } from '../../src/runtime/audit.mjs';
import { createCaptureSession } from '../../src/runtime/capture-session.mjs';
import { doctorProject } from '../../src/runtime/doctor.mjs';
import { writeBrowserEvidence } from '../../examples/browser-adapter.reference.mjs';
import {
  installDesignDna,
  planInstallation,
  verifyInstallation,
} from '../../src/runtime/install.mjs';
import {
  initializeWorkflow,
  resumeWorkflow,
} from '../../src/runtime/orchestrator.mjs';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

async function temporaryDirectory(t, prefix) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rm(directory, { force: true, recursive: true }));
  return directory;
}

async function referenceDna(status = 'accepted') {
  const dna = JSON.parse(
    await fs.readFile(
      path.join(repositoryRoot, 'examples', 'design-dna.reference-v0.2.json'),
      'utf8',
    ),
  );
  dna.status = status;
  return dna;
}

async function makeProject(t, name, { packageJson = true } = {}) {
  const root = await temporaryDirectory(t, `designome-${name}-`);
  const projectRoot = path.join(root, 'project');
  await fs.mkdir(path.join(projectRoot, 'src', 'styles'), { recursive: true });
  if (packageJson) {
    await fs.writeFile(
      path.join(projectRoot, 'package.json'),
      `${JSON.stringify({ name, private: true }, null, 2)}\n`,
    );
  }
  await fs.writeFile(
    path.join(projectRoot, 'src', 'styles', 'globals.css'),
    'body { margin: 0; }\n',
  );
  await fs.writeFile(path.join(projectRoot, 'AGENTS.md'), '# Instructions\n');
  const dnaPath = path.join(root, 'design-dna.json');
  await fs.writeFile(
    dnaPath,
    `${JSON.stringify(await referenceDna(), null, 2)}\n`,
  );
  return { root, projectRoot, dnaPath };
}

async function projectSnapshot(projectRoot) {
  const result = {};
  async function visit(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolutePath);
      else {
        result[path.relative(projectRoot, absolutePath)] = await fs.readFile(
          absolutePath,
          'utf8',
        );
      }
    }
  }
  await visit(projectRoot);
  return result;
}

async function installFixture(fixture) {
  return installDesignDna({
    dnaPath: fixture.dnaPath,
    projectPath: fixture.projectRoot,
    cssEntry: 'src/styles/globals.css',
    instructionsReviewed: true,
  });
}

async function configureSingleRouteAudit(
  projectRoot,
  { perceptual = false, secondRoute = false } = {},
) {
  const routes = [
    {
      id: 'home',
      path: '/',
      viewports: [{ name: 'mobile', width: 390, height: 844 }],
      flows: ['load-route'],
      scenarios: ['default'],
      directions: ['ltr'],
    },
  ];
  if (secondRoute) {
    routes.push({
      id: 'settings',
      path: '/settings',
      viewports: [{ name: 'mobile', width: 390, height: 844 }],
      flows: [],
      scenarios: ['default'],
      directions: ['ltr'],
    });
  }
  await fs.writeFile(
    path.join(projectRoot, '.designome', 'audit.config.json'),
    `${JSON.stringify(
      {
        schemaVersion: '1.0.0',
        baseUrl: 'http://127.0.0.1:3000',
        outputDirectory: 'audit',
        layers: {
          installation: true,
          mechanical: true,
          perceptual,
          usage: true,
        },
        routes,
      },
      null,
      2,
    )}\n`,
  );
}

async function recordPassingEvidence(
  projectRoot,
  plan,
  outputPath,
  options = {},
) {
  const screenshotPath = path.join(
    projectRoot,
    'audit',
    'screenshots',
    'home-mobile.png',
  );
  await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
  await fs.writeFile(screenshotPath, 'browser screenshot fixture\n');
  const session = createCaptureSession(plan, {
    outputPath,
    provider: 'in-app-browser',
  });
  await session.recordCapture({
    id: 'capture.home.mobile',
    routeId: 'home',
    viewport: { width: 390, height: 844 },
    screenshotPath,
    scenario: 'default',
    direction: 'ltr',
    document: {
      scrollWidth: 390,
      clientWidth: 390,
      scrollHeight: 1000,
      clientHeight: 844,
    },
    elements: [
      {
        id: 'main-action',
        role: 'action',
        visible: true,
        clipped: false,
        rect: { width: 120, height: 44 },
      },
    ],
    responsiveChecks: [{ id: 'mobile-reflow', passed: true }],
  });
  await session.recordInteraction({
    id: 'load-route',
    flowId: 'load-route',
    routeId: 'home',
    kind: 'navigation',
    expected: 'The route loads and the URL remains on home',
    observed: 'The route loaded and the URL remained on home',
    passed: true,
    urlBefore: 'http://127.0.0.1:3000/',
    urlAfter: 'http://127.0.0.1:3000/',
  });
  if (options.consoleFailure) {
    await session.recordConsoleMessage({
      routeId: 'home',
      level: 'error',
      message: 'Hydration failed',
    });
  }
  for (const aspect of plan.perceptual.aspects) {
    if (!options.perceptual) break;
    await session.recordPerceptualObservation({
      id: `perceptual.${aspect}`,
      aspect,
      statement:
        aspect === 'density' && options.perceptualFailure
          ? 'The target density conflicts with the source references.'
          : `The ${aspect} comparison is consistent with the accepted evidence.`,
      epistemicStatus: 'observed',
      certainty: 0.85,
      result:
        aspect === 'density' && options.perceptualFailure ? 'failed' : 'passed',
      sourceCaptureRefs: ['source.reference'],
      targetCaptureRefs: ['capture.home.mobile'],
      limitations: ['Only configured captures were evaluated.'],
    });
  }
  return session;
}

test('doctor and install preflight reject a missing package.json without writes', async (t) => {
  const fixture = await makeProject(t, 'missing-package', {
    packageJson: false,
  });
  const before = await projectSnapshot(fixture.projectRoot);
  const diagnostic = await doctorProject({
    projectPath: fixture.projectRoot,
    dnaPath: fixture.dnaPath,
  });
  assert.equal(diagnostic.status, 'failed');
  assert.equal(diagnostic.readOnly, true);
  assert.equal(diagnostic.errors[0].code, 'PROJECT_PACKAGE_JSON_MISSING');
  assert.equal(
    diagnostic.errors[0].details.checkedPath,
    path.join(fixture.projectRoot, 'package.json'),
  );
  assert.deepEqual(await projectSnapshot(fixture.projectRoot), before);
  await assert.rejects(
    installFixture(fixture),
    (error) =>
      error.code === 'PROJECT_PACKAGE_JSON_MISSING' &&
      error.details.writesPerformed === false,
  );
  assert.deepEqual(await projectSnapshot(fixture.projectRoot), before);
});

test('doctor reports missing and non-accepted Design DNA without mutation', async (t) => {
  const fixture = await makeProject(t, 'doctor-dna');
  const before = await projectSnapshot(fixture.projectRoot);
  const missing = await doctorProject({ projectPath: fixture.projectRoot });
  assert.equal(
    missing.errors.find((error) => error.code === 'DESIGN_DNA_MISSING').details
      .writesPerformed,
    false,
  );
  const draftPath = path.join(fixture.root, 'draft-design-dna.json');
  await fs.writeFile(
    draftPath,
    `${JSON.stringify(await referenceDna('draft'), null, 2)}\n`,
  );
  const draft = await doctorProject({
    projectPath: fixture.projectRoot,
    dnaPath: draftPath,
  });
  assert.ok(
    draft.errors.some(
      (error) => error.code === 'DESIGN_DNA_NOT_ACCEPTED_OR_INVALID',
    ),
  );
  assert.deepEqual(await projectSnapshot(fixture.projectRoot), before);
});

test('transactional installation covers idempotence, invalid DNA, conflicts, preparation failure, apply failure, rollback, and manifest commit', async (t) => {
  const fixture = await makeProject(t, 'transaction');
  const first = await installFixture(fixture);
  assert.equal(first.status, 'installed');
  assert.equal(first.transaction.status, 'committed');
  assert.equal(
    await fs
      .stat(
        path.join(
          fixture.projectRoot,
          '.designome',
          'install-transaction.json',
        ),
      )
      .catch(() => null),
    null,
  );
  assert.equal(
    (await verifyInstallation({ projectPath: fixture.projectRoot })).valid,
    true,
  );
  assert.equal(
    (
      await doctorProject({
        projectPath: fixture.projectRoot,
        dnaPath: fixture.dnaPath,
      })
    ).status,
    'passed',
  );

  const second = await installFixture(fixture);
  assert.equal(
    second.actions.filter((action) =>
      ['create', 'update', 'delete', 'conflict'].includes(action.action),
    ).length,
    0,
  );

  await assert.rejects(
    installDesignDna({
      dnaPath: path.join(fixture.root, 'missing.json'),
      projectPath: fixture.projectRoot,
      cssEntry: 'src/styles/globals.css',
      instructionsReviewed: true,
    }),
    (error) => error.code === 'DESIGN_DNA_UNREADABLE',
  );
  const draftPath = path.join(fixture.root, 'draft.json');
  await fs.writeFile(
    draftPath,
    `${JSON.stringify(await referenceDna('draft'), null, 2)}\n`,
  );
  await assert.rejects(
    installDesignDna({
      dnaPath: draftPath,
      projectPath: fixture.projectRoot,
      cssEntry: 'src/styles/globals.css',
      instructionsReviewed: true,
    }),
    (error) => error.code === 'INVALID_DESIGN_DNA',
  );

  const managedPath = path.join(
    fixture.projectRoot,
    'src',
    'styles',
    'designome.generated.css',
  );
  await fs.appendFile(managedPath, '\n/* manual edit */\n');
  const conflict = await planInstallation({
    dnaPath: fixture.dnaPath,
    projectPath: fixture.projectRoot,
    cssEntry: 'src/styles/globals.css',
  });
  const managedConflict = conflict.publicPlan.actions.find(
    (action) => action.path === 'src/styles/designome.generated.css',
  );
  assert.equal(managedConflict.nature, 'managed-file-modified');
  assert.equal(managedConflict.expectedOwner, 'designome');
  assert.ok(managedConflict.recordedChecksum);
  assert.ok(managedConflict.observedChecksum);
  assert.deepEqual(managedConflict.refusedOperations, ['overwrite', 'delete']);

  const freshPreparation = await makeProject(t, 'prepare-failure');
  const preparationBefore = await projectSnapshot(freshPreparation.projectRoot);
  await assert.rejects(
    installDesignDna({
      dnaPath: freshPreparation.dnaPath,
      projectPath: freshPreparation.projectRoot,
      cssEntry: 'src/styles/globals.css',
      instructionsReviewed: true,
      failureInjection: 'prepare',
    }),
    (error) =>
      error.code === 'INSTALLATION_PREPARATION_FAILED' &&
      error.details.projectModified === false,
  );
  assert.deepEqual(
    await projectSnapshot(freshPreparation.projectRoot),
    preparationBefore,
  );

  const freshApply = await makeProject(t, 'apply-failure');
  const applyBefore = await projectSnapshot(freshApply.projectRoot);
  await assert.rejects(
    installDesignDna({
      dnaPath: freshApply.dnaPath,
      projectPath: freshApply.projectRoot,
      cssEntry: 'src/styles/globals.css',
      instructionsReviewed: true,
      failureInjection: 'apply',
    }),
    (error) =>
      error.code === 'INSTALLATION_ROLLED_BACK' &&
      error.details.rollback === 'completed',
  );
  assert.deepEqual(await projectSnapshot(freshApply.projectRoot), applyBefore);

  const unmanaged = await makeProject(t, 'unmanaged-conflict');
  await fs.writeFile(
    path.join(
      unmanaged.projectRoot,
      'src',
      'styles',
      'designome.generated.css',
    ),
    '/* user owned */\n',
  );
  const unmanagedPlan = await planInstallation({
    dnaPath: unmanaged.dnaPath,
    projectPath: unmanaged.projectRoot,
    cssEntry: 'src/styles/globals.css',
  });
  assert.equal(unmanagedPlan.status, 'conflict');
  assert.equal(
    unmanagedPlan.publicPlan.actions.find(
      (action) => action.path === 'src/styles/designome.generated.css',
    ).nature,
    'unmanaged-file-collision',
  );
  assert.equal(
    await fs
      .stat(path.join(unmanaged.projectRoot, '.designome', 'manifest.json'))
      .catch(() => null),
    null,
  );

  const interrupted = await makeProject(t, 'interrupted-transaction');
  const interruptedCssPath = path.join(
    interrupted.projectRoot,
    'src',
    'styles',
    'globals.css',
  );
  const originalCss = await fs.readFile(interruptedCssPath, 'utf8');
  await fs.writeFile(interruptedCssPath, '/* partial interrupted write */\n');
  await fs.mkdir(path.join(interrupted.projectRoot, '.designome'), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(
      interrupted.projectRoot,
      '.designome',
      'install-transaction.json',
    ),
    `${JSON.stringify(
      {
        schemaVersion: '1.0.0',
        transactionId: 'interrupted-fixture',
        owner: 'designome',
        status: 'applying',
        backups: [{ path: 'src/styles/globals.css', content: originalCss }],
      },
      null,
      2,
    )}\n`,
  );
  const recovered = await installFixture(interrupted);
  assert.equal(recovered.recovery.status, 'recovered');
  assert.equal(recovered.recovery.transactionId, 'interrupted-fixture');
  assert.match(await fs.readFile(interruptedCssPath, 'utf8'), /designome/u);
});

test('browser adapter rejects incomplete evidence and audit reports external provider state from canonical evidence', async (t) => {
  const fixture = await makeProject(t, 'external-audit');
  await installFixture(fixture);
  await configureSingleRouteAudit(fixture.projectRoot, {
    perceptual: false,
    secondRoute: true,
  });
  await runAudit({
    projectPath: fixture.projectRoot,
    provider: 'in-app-browser',
  });
  const plan = JSON.parse(
    await fs.readFile(
      path.join(fixture.projectRoot, 'audit', 'plan.json'),
      'utf8',
    ),
  );
  const evidencePath = path.join(
    fixture.projectRoot,
    'audit',
    'external-evidence.json',
  );
  const session = await recordPassingEvidence(
    fixture.projectRoot,
    plan,
    evidencePath,
  );
  await assert.rejects(
    session.finalize(),
    (error) =>
      error.code === 'INCOMPLETE_AUDIT_EVIDENCE' &&
      error.details.captures.some((capture) => capture.routeId === 'settings'),
  );
  await session.finalize({ allowIncomplete: true });
  const audited = await runAudit({
    projectPath: fixture.projectRoot,
    provider: 'in-app-browser',
    evidencePath: 'audit/external-evidence.json',
    overwrite: true,
  });
  assert.equal(audited.status, 'incomplete');
  const report = JSON.parse(
    await fs.readFile(
      path.join(fixture.projectRoot, 'audit', 'report.json'),
      'utf8',
    ),
  );
  assert.equal(report.provider.status, 'incomplete');
  assert.ok(report.provider.receivedAt);
  assert.deepEqual(report.provider.coveredRoutes, ['home']);
  assert.deepEqual(report.provider.coveredViewports, ['390x844']);
  assert.equal(report.layers.mechanical.status, 'incomplete');
  assert.equal(report.layers.usage.status, 'passed');
  assert.equal(report.layers.perceptual.status, 'not-requested');
  const markdown = await fs.readFile(
    path.join(fixture.projectRoot, 'audit', 'report.md'),
    'utf8',
  );
  assert.doesNotMatch(markdown, /pending provider execution/u);
  assert.match(markdown, /Status: \*\*incomplete\*\*/u);
});

test('external in-app-browser evidence transitions to passed and never remains pending', async (t) => {
  const fixture = await makeProject(t, 'audit-regression');
  await installFixture(fixture);
  await configureSingleRouteAudit(fixture.projectRoot, { perceptual: false });
  await runAudit({
    projectPath: fixture.projectRoot,
    provider: 'in-app-browser',
  });
  const plan = JSON.parse(
    await fs.readFile(
      path.join(fixture.projectRoot, 'audit', 'plan.json'),
      'utf8',
    ),
  );
  const evidencePath = path.join(
    fixture.projectRoot,
    'audit',
    'external-evidence.json',
  );
  const session = await recordPassingEvidence(
    fixture.projectRoot,
    plan,
    evidencePath,
  );
  await session.finalize();
  const result = await runAudit({
    projectPath: fixture.projectRoot,
    provider: 'in-app-browser',
    evidencePath: 'audit/external-evidence.json',
    overwrite: true,
  });
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.layers, {
    installation: 'passed',
    mechanical: 'passed',
    perceptual: 'not-requested',
    usage: 'passed',
  });
  const markdown = await fs.readFile(
    path.join(fixture.projectRoot, 'audit', 'report.md'),
    'utf8',
  );
  assert.doesNotMatch(markdown, /pending provider execution/u);
  assert.match(markdown, /Status: \*\*passed\*\*/u);
  const report = JSON.parse(
    await fs.readFile(
      path.join(fixture.projectRoot, 'audit', 'report.json'),
      'utf8',
    ),
  );
  assert.deepEqual(
    report.provider.transitions.map((transition) => transition.to),
    ['evidence-received', 'running', 'passed'],
  );
});

test('published browser adapter example writes evidence that the audit accepts', async (t) => {
  const fixture = await makeProject(t, 'adapter-example');
  await installFixture(fixture);
  await configureSingleRouteAudit(fixture.projectRoot, { perceptual: true });
  await runAudit({
    projectPath: fixture.projectRoot,
    provider: 'in-app-browser',
  });
  const plan = JSON.parse(
    await fs.readFile(
      path.join(fixture.projectRoot, 'audit', 'plan.json'),
      'utf8',
    ),
  );
  const screenshotPath = path.join(
    fixture.projectRoot,
    'audit',
    'screenshots',
    'example.png',
  );
  await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
  await fs.writeFile(screenshotPath, 'example screenshot\n');
  const evidencePath = path.join(
    fixture.projectRoot,
    'audit',
    'example-evidence.json',
  );
  await writeBrowserEvidence({
    plan,
    screenshotPath,
    outputPath: evidencePath,
  });
  const result = await runAudit({
    projectPath: fixture.projectRoot,
    provider: 'in-app-browser',
    evidencePath: 'audit/example-evidence.json',
    overwrite: true,
  });
  assert.equal(result.status, 'passed');

  await fs.writeFile(
    path.join(fixture.projectRoot, 'audit', 'incompatible.json'),
    '{"schemaVersion":"9.0.0"}\n',
  );
  await assert.rejects(
    runAudit({
      projectPath: fixture.projectRoot,
      provider: 'in-app-browser',
      evidencePath: 'audit/incompatible.json',
      overwrite: true,
    }),
    (error) => error.code === 'INCOMPATIBLE_AUDIT_EVIDENCE_VERSION',
  );
});

test('four audit layers remain independent when host perceptual evaluation fails', async (t) => {
  const fixture = await makeProject(t, 'four-layers');
  await installFixture(fixture);
  await configureSingleRouteAudit(fixture.projectRoot, { perceptual: true });
  await runAudit({
    projectPath: fixture.projectRoot,
    provider: 'in-app-browser',
  });
  const plan = JSON.parse(
    await fs.readFile(
      path.join(fixture.projectRoot, 'audit', 'plan.json'),
      'utf8',
    ),
  );
  const evidencePath = path.join(
    fixture.projectRoot,
    'audit',
    'external-evidence.json',
  );
  const session = await recordPassingEvidence(
    fixture.projectRoot,
    plan,
    evidencePath,
    { perceptual: true, perceptualFailure: true },
  );
  await session.finalize();
  const result = await runAudit({
    projectPath: fixture.projectRoot,
    provider: 'in-app-browser',
    evidencePath: 'audit/external-evidence.json',
    overwrite: true,
  });
  assert.deepEqual(result.layers, {
    installation: 'passed',
    mechanical: 'passed',
    perceptual: 'failed',
    usage: 'passed',
  });
  assert.equal(result.overallStatus, 'failed');
  const findings = JSON.parse(
    await fs.readFile(
      path.join(fixture.projectRoot, 'audit', 'findings.json'),
      'utf8',
    ),
  );
  assert.equal(findings.findings[0].layer, 'perceptual');
  assert.equal(findings.findings[0].provenance.evaluator, 'host-agent');
});

test('orchestrated run persists failure and resumes installation deterministically', async (t) => {
  const fixture = await makeProject(t, 'orchestrator');
  const workspacePath = path.join(fixture.root, 'workspace');
  await fs.mkdir(workspacePath);
  const sourcePath = path.join(fixture.root, 'source.png');
  await fs.writeFile(
    sourcePath,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=',
      'base64',
    ),
  );
  const initialized = await initializeWorkflow({
    sourcePaths: [sourcePath],
    projectPath: fixture.projectRoot,
    workspacePath,
    cssEntry: 'src/styles/globals.css',
  });
  assert.equal(initialized.status, 'awaiting-host');
  assert.equal(initialized.currentStep, 'extract-design-dna');
  await fs.writeFile(
    path.join(initialized.runDirectory, 'design-dna.json'),
    `${JSON.stringify(await referenceDna('draft'), null, 2)}\n`,
  );
  const awaitingAcceptance = await resumeWorkflow({ workspacePath });
  assert.equal(awaitingAcceptance.status, 'awaiting-human');
  assert.equal(awaitingAcceptance.currentStep, 'accept-design-dna');
  const projectBeforeFailure = await projectSnapshot(fixture.projectRoot);
  await assert.rejects(
    resumeWorkflow({
      workspacePath,
      acceptDesignDna: true,
      failureInjection: 'apply',
    }),
    (error) => error.code === 'INSTALLATION_ROLLED_BACK',
  );
  assert.deepEqual(
    await projectSnapshot(fixture.projectRoot),
    projectBeforeFailure,
  );
  const stateAfterFailure = JSON.parse(
    await fs.readFile(
      path.join(initialized.runDirectory, 'workflow-state.json'),
      'utf8',
    ),
  );
  assert.equal(stateAfterFailure.status, 'failed');
  assert.equal(
    stateAfterFailure.steps.find((step) => step.id === 'install-design-dna')
      .status,
    'failed',
  );
  const resumed = await resumeWorkflow({ workspacePath });
  assert.equal(resumed.status, 'awaiting-host');
  assert.equal(resumed.currentStep, 'implement-interface');
  assert.equal(
    resumed.steps.find((step) => step.id === 'install-design-dna').attempts,
    2,
  );
  assert.equal(
    (await verifyInstallation({ projectPath: fixture.projectRoot })).valid,
    true,
  );
});
