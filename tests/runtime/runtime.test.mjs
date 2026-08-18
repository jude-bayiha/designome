import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  assertValidDesignDna,
  validateDesignDna,
} from '../../src/runtime/design-dna.mjs';
import { evaluateAuditEvidence, runAudit } from '../../src/runtime/audit.mjs';
import {
  installDesignDna,
  planInstallation,
  verifyInstallation,
} from '../../src/runtime/install.mjs';
import { inspectImageBuffer } from '../../src/runtime/images.mjs';
import { initializeRun } from '../../src/runtime/run.mjs';

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

async function referenceDna() {
  return JSON.parse(
    await fs.readFile(
      path.join(repositoryRoot, 'examples', 'design-dna.reference-v0.2.json'),
      'utf8',
    ),
  );
}

function webpBuffer(chunkType, payload) {
  const padding = payload.length % 2;
  const buffer = Buffer.alloc(20 + payload.length + padding);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WEBP', 8, 'ascii');
  buffer.write(chunkType, 12, 'ascii');
  buffer.writeUInt32LE(payload.length, 16);
  payload.copy(buffer, 20);
  return buffer;
}

test('image inspection reads extended, lossless, and lossy WebP dimensions', () => {
  const extended = Buffer.alloc(10);
  extended.writeUIntLE(1023, 4, 3);
  extended.writeUIntLE(767, 7, 3);

  const lossless = Buffer.alloc(5);
  lossless[0] = 0x2f;
  lossless.writeUInt32LE(639 | (479 << 14), 1);

  const lossy = Buffer.alloc(10);
  lossy.set([0x9d, 0x01, 0x2a], 3);
  lossy.writeUInt16LE(320, 6);
  lossy.writeUInt16LE(240, 8);

  assert.deepEqual(inspectImageBuffer(webpBuffer('VP8X', extended)), {
    format: 'webp',
    width: 1024,
    height: 768,
  });
  assert.deepEqual(inspectImageBuffer(webpBuffer('VP8L', lossless)), {
    format: 'webp',
    width: 640,
    height: 480,
  });
  assert.deepEqual(inspectImageBuffer(webpBuffer('VP8 ', lossy)), {
    format: 'webp',
    width: 320,
    height: 240,
  });
});

test('init-run records image metadata and is idempotent', async (t) => {
  const temporaryRoot = await temporaryDirectory(t, 'designome-run-test-');
  const imagePath = path.join(temporaryRoot, 'reference.png');
  const outputDirectory = path.join(temporaryRoot, 'run-001');
  await fs.writeFile(
    imagePath,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=',
      'base64',
    ),
  );

  const first = await initializeRun({
    imagePaths: [imagePath, imagePath],
    motionMode: 'off',
    outputDirectory,
  });
  assert.equal(first.sourceCount, 1);
  assert.equal(first.duplicateSourceCount, 1);
  assert.deepEqual(
    first.actions.map((action) => action.action),
    ['create', 'create', 'create'],
  );

  const manifest = JSON.parse(
    await fs.readFile(
      path.join(outputDirectory, 'source-manifest.json'),
      'utf8',
    ),
  );
  assert.deepEqual(manifest.sources[0].dimensions, { width: 1, height: 1 });
  assert.equal(manifest.sources[0].format, 'png');

  const second = await initializeRun({
    imagePaths: [imagePath, imagePath],
    motionMode: 'off',
    outputDirectory,
  });
  assert.deepEqual(
    second.actions.map((action) => action.action),
    ['unchanged', 'unchanged', 'unchanged'],
  );

  await assert.rejects(
    initializeRun({
      imagePaths: [imagePath],
      motionMode: 'auto',
      outputDirectory,
    }),
    (error) => error.code === 'RUN_INPUT_CONFLICT',
  );

  const unrelatedDirectory = path.join(temporaryRoot, 'unrelated');
  await fs.mkdir(unrelatedDirectory);
  await fs.writeFile(path.join(unrelatedDirectory, 'keep.txt'), 'keep\n');
  await assert.rejects(
    initializeRun({
      imagePaths: [imagePath],
      outputDirectory: unrelatedDirectory,
    }),
    (error) => error.code === 'RUN_OUTPUT_NOT_EMPTY',
  );
});

test('runtime Design DNA validation enforces evidence and acceptance', async () => {
  const dna = await referenceDna();
  assert.deepEqual(await validateDesignDna(dna), []);

  const missingEvidence = structuredClone(dna);
  missingEvidence.tokens[0].claim.evidenceRefs = [];
  const evidenceErrors = await validateDesignDna(missingEvidence);
  assert.ok(
    evidenceErrors.includes(
      'tokens[0].claim.evidenceRefs is required for observed claims',
    ),
  );

  const invalidValue = structuredClone(dna);
  invalidValue.tokens[0].value = { kind: 'exact' };
  assert.ok(
    (await validateDesignDna(invalidValue)).includes(
      'tokens[0].value.value must be a string, number, or boolean',
    ),
  );

  const reversedRange = structuredClone(dna);
  reversedRange.tokens[0].value = {
    kind: 'range',
    minimum: 24,
    maximum: 16,
    unit: 'px',
  };
  assert.ok(
    (await validateDesignDna(reversedRange)).includes(
      'tokens[0].value.minimum must not exceed maximum',
    ),
  );

  const preferredOutsideRange = structuredClone(dna);
  preferredOutsideRange.tokens[0].value = {
    kind: 'range',
    minimum: 12,
    maximum: 16,
    preferred: 10,
    strategy: 'bounded',
    unit: 'px',
  };
  assert.ok(
    (await validateDesignDna(preferredOutsideRange)).includes(
      'tokens[0].value.preferred must be within the range',
    ),
  );

  await assert.rejects(
    assertValidDesignDna(dna, { requireAccepted: true }),
    (error) =>
      error.code === 'INVALID_DESIGN_DNA' &&
      error.details.includes('status must be accepted for this operation'),
  );
});

test('installation is idempotent, preserves overrides, and detects conflicts', async (t) => {
  const temporaryRoot = await temporaryDirectory(t, 'designome-install-test-');
  const projectRoot = path.join(temporaryRoot, 'target-project');
  const cssDirectory = path.join(projectRoot, 'src', 'styles');
  await fs.mkdir(cssDirectory, { recursive: true });
  await fs.writeFile(
    path.join(projectRoot, 'package.json'),
    '{"name":"target-project","private":true,"devDependencies":{"tailwindcss":"^4.0.0","@tailwindcss/postcss":"^4.0.0"}}\n',
  );
  await fs.writeFile(
    path.join(cssDirectory, 'globals.css'),
    '@charset "UTF-8";\n@import "tailwindcss";\n\nbody { margin: 0; }\n',
  );
  await fs.writeFile(
    path.join(projectRoot, 'AGENTS.md'),
    '# Target project instructions\n',
  );
  await fs.mkdir(path.join(projectRoot, 'docs', 'ui'), { recursive: true });
  await fs.writeFile(
    path.join(projectRoot, 'docs', 'ui', 'core.md'),
    '# Existing UI rules\n',
  );

  const dna = await referenceDna();
  dna.status = 'accepted';
  dna.tokens[0].value = { kind: 'exact', value: '#225ea8' };
  dna.tokens[1].value = {
    kind: 'range',
    minimum: 20,
    maximum: 32,
    preferred: 24,
    strategy: 'bounded',
    unit: 'px',
  };
  const dnaPath = path.join(temporaryRoot, 'accepted-design-dna.json');
  await fs.writeFile(dnaPath, `${JSON.stringify(dna, null, 2)}\n`);
  const integrationOptions = {
    documentationDirectory: 'docs/ui/generated',
    existingRulePaths: ['docs/ui/core.md'],
    rulePrecedence: 'existing-first',
    stylingStrategy: 'auto',
  };

  const dryRun = await installDesignDna({
    dnaPath,
    projectPath: projectRoot,
    cssEntry: 'src/styles/globals.css',
    ...integrationOptions,
    dryRun: true,
  });
  assert.equal(dryRun.status, 'ready');
  assert.equal(
    await fs.stat(path.join(projectRoot, '.designome')).catch(() => null),
    null,
  );
  const first = await installDesignDna({
    dnaPath,
    projectPath: projectRoot,
    cssEntry: 'src/styles/globals.css',
    ...integrationOptions,
    instructionsReviewed: true,
  });
  assert.equal(first.status, 'installed');
  assert.equal(first.verification, 'passed');

  const verification = await verifyInstallation({ projectPath: projectRoot });
  assert.equal(verification.valid, true, verification.errors.join('\n'));

  const cssEntry = await fs.readFile(
    path.join(cssDirectory, 'globals.css'),
    'utf8',
  );
  assert.equal(cssEntry.match(/designome:generated-import:start/gu)?.length, 1);
  assert.ok(cssEntry.indexOf('@charset') < cssEntry.indexOf('@import'));

  const generatedCss = await fs.readFile(
    path.join(cssDirectory, 'designome.generated.css'),
    'utf8',
  );
  assert.match(generatedCss, /--designome-surface-hierarchy: #225ea8;/u);
  assert.match(generatedCss, /--designome-spacing-rhythm: 24px;/u);
  assert.match(generatedCss, /spacing-rhythm bounds: 20 to 32 px/u);
  assert.match(generatedCss, /Styling adapter: tailwind-utilities/u);

  const generatedDocumentation = await fs.readFile(
    path.join(projectRoot, 'docs', 'ui', 'generated', 'integration.md'),
    'utf8',
  );
  assert.match(generatedDocumentation, /Detected system: `tailwind`/u);
  assert.match(generatedDocumentation, /Policy: `existing-first`/u);
  assert.match(generatedDocumentation, /`docs\/ui\/core.md`/u);
  assert.deepEqual(
    (
      await fs.readdir(path.join(projectRoot, 'docs', 'ui', 'generated'))
    ).sort(),
    [
      'README.md',
      'component-mapping.md',
      'components-and-states.md',
      'iconography.md',
      'integration.md',
      'rules.md',
      'typography.md',
      'visual-foundations.md',
    ],
  );
  assert.match(
    await fs.readFile(
      path.join(projectRoot, 'docs', 'ui', 'generated', 'rules.md'),
      'utf8',
    ),
    /Epistemic status: `observed`/u,
  );
  const componentDocumentation = await fs.readFile(
    path.join(
      projectRoot,
      'docs',
      'ui',
      'generated',
      'components-and-states.md',
    ),
    'utf8',
  );
  assert.match(componentDocumentation, /^# Components and states\n\n## /u);
  assert.doesNotMatch(componentDocumentation, /\n#\n \nC\no\nm\np/u);

  assert.deepEqual(
    (
      await fs.readdir(
        path.join(projectRoot, '.agents', 'skills', 'designome-audit'),
      )
    ).sort(),
    ['SKILL.md', 'agents'],
  );
  assert.match(
    await fs.readFile(
      path.join(
        projectRoot,
        '.agents',
        'skills',
        'designome-audit',
        'SKILL.md',
      ),
      'utf8',
    ),
    /Project-local mode/u,
  );

  const agents = await fs.readFile(path.join(projectRoot, 'AGENTS.md'), 'utf8');
  assert.equal(agents.match(/designome:guidance:start/gu)?.length, 1);
  assert.match(agents, /docs\/ui\/generated\/README.md/u);
  assert.match(agents, /tailwind-utilities/u);

  const auditConfigPath = path.join(
    projectRoot,
    '.designome',
    'audit.config.json',
  );
  const auditConfig = JSON.parse(await fs.readFile(auditConfigPath, 'utf8'));
  auditConfig.routes.push({
    id: 'people',
    path: '/people',
    viewports: [{ name: 'desktop', width: 1280, height: 900 }],
    flows: ['filter the collection'],
  });
  await fs.writeFile(
    auditConfigPath,
    `${JSON.stringify(auditConfig, null, 2)}\n`,
  );

  const second = await installDesignDna({
    dnaPath,
    projectPath: projectRoot,
    cssEntry: 'src/styles/globals.css',
    ...integrationOptions,
    instructionsReviewed: true,
  });
  assert.equal(second.status, 'installed');
  assert.equal(
    second.actions.filter((action) =>
      ['create', 'update', 'conflict'].includes(action.action),
    ).length,
    0,
  );
  assert.match(await fs.readFile(auditConfigPath, 'utf8'), /"\/people"/u);

  const overridesPath = path.join(cssDirectory, 'designome.overrides.css');
  await fs.appendFile(
    overridesPath,
    '\n.custom-rule { color: rebeccapurple; }\n',
  );
  const afterOverride = await installDesignDna({
    dnaPath,
    projectPath: projectRoot,
    cssEntry: 'src/styles/globals.css',
    ...integrationOptions,
    instructionsReviewed: true,
  });
  assert.equal(
    afterOverride.actions.find(
      (action) => action.path === 'src/styles/designome.overrides.css',
    ).action,
    'preserve',
  );
  assert.match(await fs.readFile(overridesPath, 'utf8'), /rebeccapurple/u);

  const generatedPath = path.join(cssDirectory, 'designome.generated.css');
  await fs.appendFile(generatedPath, '\n/* manual edit */\n');
  const conflict = await planInstallation({
    dnaPath,
    projectPath: projectRoot,
    cssEntry: 'src/styles/globals.css',
    ...integrationOptions,
    instructionsReviewed: true,
  });
  assert.equal(conflict.status, 'conflict');
  assert.equal(
    conflict.publicPlan.actions.find(
      (action) => action.path === 'src/styles/designome.generated.css',
    ).action,
    'conflict',
  );

  const failedVerification = await verifyInstallation({
    projectPath: projectRoot,
  });
  assert.equal(failedVerification.valid, false);
  assert.ok(
    failedVerification.errors.includes(
      'Managed file checksum mismatch: src/styles/designome.generated.css',
    ),
  );
  const auditSkillPath = path.join(
    projectRoot,
    '.agents',
    'skills',
    'designome-audit',
    'SKILL.md',
  );
  await fs.appendFile(auditSkillPath, '\n<!-- manual edit -->\n');
  const skillConflict = await planInstallation({
    dnaPath,
    projectPath: projectRoot,
    cssEntry: 'src/styles/globals.css',
    ...integrationOptions,
    instructionsReviewed: true,
  });
  assert.equal(skillConflict.status, 'conflict');
  assert.equal(
    skillConflict.publicPlan.actions.find(
      (action) => action.path === '.agents/skills/designome-audit/SKILL.md',
    ).action,
    'conflict',
  );
});

test('installation planning detects shadcn project context without mutating it', async (t) => {
  const temporaryRoot = await temporaryDirectory(t, 'designome-shadcn-test-');
  const projectRoot = path.join(temporaryRoot, 'target-project');
  await fs.mkdir(path.join(projectRoot, 'src', 'app'), { recursive: true });
  await fs.writeFile(
    path.join(projectRoot, 'package.json'),
    '{"name":"target-project","private":true,"devDependencies":{"tailwindcss":"^4.0.0"}}\n',
  );
  await fs.writeFile(
    path.join(projectRoot, 'src', 'app', 'globals.css'),
    '@import "tailwindcss";\n',
  );
  await fs.writeFile(path.join(projectRoot, 'AGENTS.md'), '# Instructions\n');
  await fs.writeFile(
    path.join(projectRoot, 'components.json'),
    `${JSON.stringify(
      {
        style: 'nova',
        base: 'radix',
        iconLibrary: 'lucide',
        rsc: true,
        tailwind: { css: 'src/app/globals.css', cssVariables: true },
        aliases: { ui: '@/components/ui', utils: '@/lib/utils' },
      },
      null,
      2,
    )}\n`,
  );
  await fs.mkdir(path.join(projectRoot, 'src', 'components', 'ui'), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(projectRoot, 'src', 'components', 'ui', 'button.tsx'),
    'export function Button() { return null; }\n',
  );

  const dna = await referenceDna();
  dna.status = 'accepted';
  const dnaPath = path.join(temporaryRoot, 'accepted-design-dna.json');
  await fs.writeFile(dnaPath, `${JSON.stringify(dna, null, 2)}\n`);

  const plan = await planInstallation({
    dnaPath,
    projectPath: projectRoot,
    cssEntry: 'src/app/globals.css',
    stylingStrategy: 'auto',
  });

  assert.equal(plan.publicPlan.adapter.styling.system, 'shadcn');
  assert.equal(plan.publicPlan.adapter.styling.strategy, 'shadcn-components');
  assert.equal(plan.publicPlan.adapter.styling.shadcn.style, 'nova');
  assert.equal(plan.publicPlan.adapter.styling.shadcn.iconLibrary, 'lucide');
  assert.deepEqual(plan.publicPlan.adapter.styling.shadcn.installedComponents, [
    'button',
  ]);
  const disabledPlan = await planInstallation({
    dnaPath,
    projectPath: projectRoot,
    cssEntry: 'src/app/globals.css',
    stylingStrategy: 'auto',
    uiKitPreference: 'none',
  });
  assert.equal(
    disabledPlan.publicPlan.adapter.styling.strategy,
    'tailwind-utilities',
  );
  assert.equal(
    disabledPlan.publicPlan.adapter.styling.uiKit.status,
    'disabled',
  );
  assert.equal(
    await fs.stat(path.join(projectRoot, '.designome')).catch(() => null),
    null,
  );
  await installDesignDna({
    dnaPath,
    projectPath: projectRoot,
    cssEntry: 'src/app/globals.css',
    stylingStrategy: 'auto',
    instructionsReviewed: true,
  });
  const componentMapping = await fs.readFile(
    path.join(projectRoot, 'docs', 'designome', 'component-mapping.md'),
    'utf8',
  );
  assert.match(
    componentMapping,
    /Installed shadcn\/ui sources detected: `button`/u,
  );
  assert.match(componentMapping, /technical implementation guidance/u);
});

test('greenfield shadcn preference remains an explicit proposal', async (t) => {
  const temporaryRoot = await temporaryDirectory(t, 'designome-uikit-test-');
  const projectRoot = path.join(temporaryRoot, 'target-project');
  await fs.mkdir(path.join(projectRoot, 'src', 'styles'), { recursive: true });
  await fs.writeFile(
    path.join(projectRoot, 'package.json'),
    '{"name":"target-project","private":true}\n',
  );
  await fs.writeFile(
    path.join(projectRoot, 'src', 'styles', 'globals.css'),
    'body { margin: 0; }\n',
  );
  const dna = await referenceDna();
  dna.status = 'accepted';
  const dnaPath = path.join(temporaryRoot, 'accepted-design-dna.json');
  await fs.writeFile(dnaPath, `${JSON.stringify(dna, null, 2)}\n`);

  const plan = await planInstallation({
    dnaPath,
    projectPath: projectRoot,
    cssEntry: 'src/styles/globals.css',
    uiKitPreference: 'shadcn',
  });
  assert.equal(plan.publicPlan.adapter.styling.strategy, 'css-variables');
  assert.equal(plan.publicPlan.adapter.styling.uiKit.status, 'proposed');
  assert.equal(
    await fs.stat(path.join(projectRoot, 'components.json')).catch(() => null),
    null,
  );
});

test('executable audit resolves providers and initializes evidence artifacts', async (t) => {
  const temporaryRoot = await temporaryDirectory(t, 'designome-audit-test-');
  const projectRoot = path.join(temporaryRoot, 'target-project');
  await fs.mkdir(path.join(projectRoot, 'src', 'styles'), { recursive: true });
  await fs.writeFile(
    path.join(projectRoot, 'package.json'),
    JSON.stringify({
      name: 'target-project',
      private: true,
      devDependencies: {
        '@playwright/test': '^1.58.0',
      },
    }),
  );
  await fs.writeFile(
    path.join(projectRoot, 'src', 'styles', 'globals.css'),
    'body { margin: 0; }\n',
  );
  await fs.writeFile(path.join(projectRoot, 'AGENTS.md'), '# Instructions\n');
  await fs.writeFile(
    path.join(projectRoot, 'playwright.config.ts'),
    'export default {};\n',
  );
  const dna = await referenceDna();
  dna.status = 'accepted';
  const dnaPath = path.join(temporaryRoot, 'accepted-design-dna.json');
  await fs.writeFile(dnaPath, `${JSON.stringify(dna, null, 2)}\n`);
  await installDesignDna({
    dnaPath,
    projectPath: projectRoot,
    cssEntry: 'src/styles/globals.css',
    instructionsReviewed: true,
  });

  const dryRun = await runAudit({ projectPath: projectRoot, dryRun: true });
  assert.equal(dryRun.status, 'ready');
  assert.equal(dryRun.provider.selected, 'existing-playwright');
  assert.deepEqual(dryRun.provider.playwright.configs, [
    'playwright.config.ts',
  ]);

  const initialized = await runAudit({
    projectPath: projectRoot,
    provider: 'in-app-browser',
  });
  assert.equal(initialized.status, 'initialized');
  assert.equal(initialized.provider.executionOwner, 'host-agent');
  assert.deepEqual((await fs.readdir(path.join(projectRoot, 'audit'))).sort(), [
    'evidence.json',
    'findings.json',
    'plan.json',
    'report.md',
  ]);
  const evidence = JSON.parse(
    await fs.readFile(path.join(projectRoot, 'audit', 'evidence.json'), 'utf8'),
  );
  assert.equal(evidence.provider.selected, 'in-app-browser');
  assert.deepEqual(evidence.captures, []);

  await assert.rejects(
    runAudit({ projectPath: projectRoot }),
    (error) => error.code === 'AUDIT_OUTPUT_CONFLICT',
  );

  await assert.rejects(
    runAudit({
      projectPath: projectRoot,
      outputDirectory: 'audit-repair',
      mode: 'repair',
    }),
    (error) => error.code === 'IMPLEMENTATION_AUTHORIZATION_REQUIRED',
  );
  const repair = await runAudit({
    projectPath: projectRoot,
    outputDirectory: 'audit-repair',
    provider: 'managed-playwright',
    browserInstallAuthorized: true,
    mode: 'repair',
    maximumRepairPasses: 3,
    implementationAuthorized: true,
  });
  assert.equal(repair.mode, 'repair');
  assert.equal(repair.provider.status, 'planned');
  assert.ok(repair.artifacts.includes('repair-plan.json'));
  const repairPlan = JSON.parse(
    await fs.readFile(
      path.join(projectRoot, 'audit-repair', 'repair-plan.json'),
      'utf8',
    ),
  );
  assert.equal(repairPlan.maximumPasses, 3);
  assert.equal(repairPlan.designDnaMutationAllowed, false);
});

test('mechanical audit separates observed risks from calibration proposals', async () => {
  const dna = await referenceDna();
  dna.status = 'accepted';
  const result = evaluateAuditEvidence({
    dna,
    evidence: {
      schemaVersion: '0.1.0',
      generatedAt: new Date().toISOString(),
      provider: { selected: 'in-app-browser' },
      layers: { rendered: 'executed', interaction: 'executed' },
      captures: [
        {
          id: 'capture.people.mobile',
          routeId: 'people',
          viewport: { width: 390, height: 844 },
          screenshotPath: 'audit/screenshots/people-mobile.png',
          document: { scrollWidth: 794, clientWidth: 390 },
          elements: [
            {
              id: 'invite-action',
              role: 'action',
              visible: true,
              clipped: true,
              rect: { width: 90, height: 40 },
            },
            {
              id: 'person-avatar',
              role: 'avatar',
              visible: true,
              clipped: false,
              rect: { width: 240, height: 34 },
              flexShrink: 1,
              alignItems: 'stretch',
              justifyContent: 'flex-start',
              textAlign: 'left',
            },
            {
              id: 'person-name',
              role: 'table-primary-text',
              visible: true,
              clipped: false,
              rect: { width: 120, height: 18 },
              fontSize: 12,
            },
            {
              id: 'statistics-section',
              role: 'section',
              visible: true,
              clipped: false,
              rect: { width: 360, height: 120 },
              gapBefore: 8,
              panelPadding: 20,
            },
          ],
        },
      ],
      interactions: [
        {
          id: 'select-person',
          routeId: 'people',
          kind: 'selection',
          expected: 'aria-pressed becomes true',
          actual: 'aria-pressed remained false',
          passed: false,
          ruleRefs: [],
        },
      ],
      consoleErrors: [{ routeId: 'people', message: 'Hydration failed' }],
      accessibilityChecks: [
        {
          id: 'modal-focus-return',
          routeId: 'people',
          expected: 'focus returns to invite trigger',
          actual: 'focus moved to body',
          passed: false,
          ruleRefs: [],
        },
      ],
    },
  });
  assert.equal(result.findings.length, 8);
  assert.equal(result.calibrationCandidates.length, 2);
  assert.ok(
    result.findings.every((finding) => finding.epistemicStatus === 'observed'),
  );
  assert.ok(
    result.calibrationCandidates.every(
      (candidate) =>
        candidate.epistemicStatus === 'proposed' &&
        candidate.acceptanceRequired,
    ),
  );
});
