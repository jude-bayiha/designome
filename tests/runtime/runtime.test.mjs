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
    '{"name":"target-project","private":true}\n',
  );
  await fs.writeFile(
    path.join(cssDirectory, 'globals.css'),
    '@charset "UTF-8";\n\nbody { margin: 0; }\n',
  );
  await fs.writeFile(
    path.join(projectRoot, 'AGENTS.md'),
    '# Target project instructions\n',
  );

  const dna = await referenceDna();
  dna.status = 'accepted';
  dna.tokens[0].value = { kind: 'exact', value: '#225ea8' };
  const dnaPath = path.join(temporaryRoot, 'accepted-design-dna.json');
  await fs.writeFile(dnaPath, `${JSON.stringify(dna, null, 2)}\n`);

  const dryRun = await installDesignDna({
    dnaPath,
    projectPath: projectRoot,
    cssEntry: 'src/styles/globals.css',
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

  const agents = await fs.readFile(path.join(projectRoot, 'AGENTS.md'), 'utf8');
  assert.equal(agents.match(/designome:guidance:start/gu)?.length, 1);

  const second = await installDesignDna({
    dnaPath,
    projectPath: projectRoot,
    cssEntry: 'src/styles/globals.css',
    instructionsReviewed: true,
  });
  assert.equal(second.status, 'installed');
  assert.equal(
    second.actions.filter((action) =>
      ['create', 'update', 'conflict'].includes(action.action),
    ).length,
    0,
  );

  const overridesPath = path.join(cssDirectory, 'designome.overrides.css');
  await fs.appendFile(
    overridesPath,
    '\n.custom-rule { color: rebeccapurple; }\n',
  );
  const afterOverride = await installDesignDna({
    dnaPath,
    projectPath: projectRoot,
    cssEntry: 'src/styles/globals.css',
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
});
