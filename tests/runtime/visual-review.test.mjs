import assert from 'node:assert/strict';
import test from 'node:test';
import { visualReviewComplete } from '../../src/runtime/visual-review.mjs';
import { evaluateAuditVerification } from '../../src/runtime/audit-verification.mjs';

const observation = {
  id: 'review',
  checkRef: 'check',
  aspect: 'density',
  epistemicStatus: 'inferred',
  certainty: 0.7,
  result: 'passed',
  statement: 'Compare table occupancy.',
  sourceCaptureRefs: ['source'],
  targetCaptureRefs: ['target'],
  limitations: ['Model review; no objective aesthetic certification.'],
  comparison: {
    sourceImagesOpened: true,
    targetImagesOpened: true,
    reviewerId: 'reviewer',
    reviewMode: 'same-context',
    regions: [
      {
        sourceRef: 'source',
        targetCaptureRef: 'target',
        sourceRegion: 'Table rows',
        targetRegion: 'Sample table',
        ruleBasis: 'Dense row rhythm',
        observation: 'Row pitch compared relative to label height.',
        measurements: [],
        limitations: ['Source pixel scale is estimated.'],
      },
    ],
  },
};
const context = {
  routeId: 'board',
  viewport: { width: 1024, height: 768 },
  scenario: 'default',
  direction: 'ltr',
};
const verification = {
  auditContractVersion: '2.0.0',
  visualReviewContractVersion: '1.0.0',
  obligations: [
    {
      id: 'obligation',
      method: 'perceptual',
      layer: 'perceptual',
      disposition: 'requirement',
    },
  ],
  checks: [
    {
      id: 'check',
      obligationRef: 'obligation',
      method: 'perceptual',
      layer: 'perceptual',
      targetContexts: [context],
      sourceRefs: ['source'],
    },
  ],
  unresolved: [],
  exclusions: [],
};

test('visual evidence requires opened images, region links, rule basis and explicit review provenance', () => {
  assert.equal(visualReviewComplete(observation), true);
  for (const field of [
    'sourceImagesOpened',
    'targetImagesOpened',
    'reviewerId',
    'reviewMode',
    'regions',
  ]) {
    const incomplete = structuredClone(observation);
    delete incomplete.comparison[field];
    assert.equal(visualReviewComplete(incomplete), false, field);
  }
  const wrong = structuredClone(observation);
  wrong.comparison.regions[0].targetCaptureRef = 'other';
  assert.equal(visualReviewComplete(wrong), false);
});

test('bare passed or failed model declarations remain incomplete; documented regional review is still host judgment', () => {
  const evaluate = (o) =>
    evaluateAuditVerification({
      verification,
      evidence: {
        captures: [{ id: 'target', ...context }],
        perceptualObservations: [o],
      },
      sourceRefs: new Set(['source']),
    });
  const incomplete = structuredClone(observation);
  delete incomplete.comparison;
  assert.equal(evaluate(incomplete).status, 'incomplete');
  incomplete.result = 'failed';
  assert.equal(evaluate(incomplete).status, 'incomplete');
  assert.equal(evaluate(observation).status, 'passed');
  const failed = structuredClone(observation);
  failed.result = 'failed';
  assert.equal(evaluate(failed).status, 'failed');
});

test('regional review cannot silently compare a changed original source file', async (t) => {
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const { sha256 } = await import('../../src/runtime/files.mjs');
  const { validateAuditCaptureFiles } =
    await import('../../src/runtime/capture-session.mjs');
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'designome-source-review-'),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const sourcePath = path.join(directory, 'source.png');
  const bytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
    'base64',
  );
  await fs.writeFile(sourcePath, bytes);
  const options = {
    sourceCaptures: [
      {
        id: 'source',
        path: sourcePath,
        contentHash: 'sha256:' + sha256(bytes),
      },
    ],
  };
  const evidence = { captures: [], perceptualObservations: [observation] };
  assert.equal(await validateAuditCaptureFiles(evidence, options), true);
  await fs.appendFile(sourcePath, 'changed');
  await assert.rejects(validateAuditCaptureFiles(evidence, options), {
    code: 'AUDIT_CAPTURE_FILE_MISMATCH',
  });
});
