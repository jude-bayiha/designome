import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import dnaFixture from '../../examples/design-dna.fidelity.reference.json' with { type: 'json' };
import {
  auditContractVersion,
  designDnaFingerprint,
  fingerprintFromPlan,
} from '../../src/runtime/audit-contract.mjs';
import {
  buildAuditVerification,
  evaluateAuditVerification,
  validateAuditVerificationEvidence,
} from '../../src/runtime/audit-verification.mjs';
import {
  createCaptureSession,
  validateAuditCaptureFiles,
  validateAuditEvidence,
} from '../../src/runtime/capture-session.mjs';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

const route = (viewports = [{ name: 'mobile', width: 390, height: 844 }]) => ({
  id: 'home',
  path: '/',
  viewports,
  flows: [],
  scenarios: ['default'],
  directions: ['ltr'],
});

function cloneDna() {
  return structuredClone(dnaFixture);
}

function contexts(routes) {
  return routes.flatMap((item) =>
    item.viewports.map((viewport) => ({
      routeId: item.id,
      viewport: { width: viewport.width, height: viewport.height },
      scenario: 'default',
      direction: 'ltr',
    })),
  );
}

function candidateConfig(dna, bindings, routes) {
  return {
    schemaVersion: '1.0.0',
    auditContractVersion,
    baseUrl: 'http://127.0.0.1:3000',
    layers: {
      installation: false,
      mechanical: true,
      perceptual: true,
      usage: true,
    },
    routes,
    verification: {
      dnaFingerprint: designDnaFingerprint(dna),
      bindings,
    },
  };
}

function registryFor(dna, routes, configure = () => {}) {
  const emptyConfig = candidateConfig(dna, [], routes);
  const candidates = buildAuditVerification({
    dna,
    config: emptyConfig,
    routes,
  });
  const bindings = configure(candidates.obligations, contexts(routes));
  const config = candidateConfig(dna, bindings, routes);
  const verification = buildAuditVerification({ dna, config, routes });
  const plan = {
    schemaVersion: '1.0.0',
    auditContractVersion,
    designDnaFingerprint: designDnaFingerprint(dna),
    createdAt: '2026-09-13T00:00:00.000Z',
    baseUrl: config.baseUrl,
    startCommand: null,
    projectRoot: '/tmp/designome-fixture',
    configPath: '/tmp/designome-fixture/.designome/audit.config.json',
    outputDirectory: '/tmp/designome-fixture/.designome/audit',
    installation: {},
    routes,
    config,
    verification,
    perceptual: {
      aspects: ['composition'],
      sourceCaptures: dna.sources.map(
        ({ id, path: sourcePath, contentHash }) => ({
          id,
          path: sourcePath,
          contentHash,
        }),
      ),
    },
    provider: { selected: 'in-app-browser' },
    captureAdapter: { contractVersion: '1.0.0' },
  };
  plan.fingerprint = fingerprintFromPlan(plan);
  return { config, verification, plan };
}

function bindRequirements(obligations, targetContexts, { only = null } = {}) {
  return obligations
    .filter(
      (obligation) =>
        obligation.disposition === 'requirement' && (!only || only(obligation)),
    )
    .map((obligation) => ({
      obligationRef: obligation.id,
      layer: obligation.layer,
      method: obligation.method,
      targetContexts,
      sourceRefs:
        obligation.method === 'perceptual' ? [dnaFixture.sources[0].id] : [],
    }));
}

async function capture(session, screenshotPath, id, viewport) {
  await session.recordCapture({
    id,
    routeId: 'home',
    viewport,
    screenshotPath,
    scenario: 'default',
    direction: 'ltr',
    document: {
      scrollWidth: viewport.width,
      clientWidth: viewport.width,
      scrollHeight: viewport.height,
      clientHeight: viewport.height,
    },
    elements: [],
    responsiveChecks: [],
  });
}

async function screenshotFile(t, name = 'capture.png') {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'designome-v2-'));
  t.after(() => fs.rm(directory, { force: true, recursive: true }));
  const filePath = path.join(directory, name);
  await fs.writeFile(filePath, png);
  return filePath;
}

test('Audit Contract 2.0 creates deterministic source-bound obligations and fingerprints', () => {
  const dna = cloneDna();
  const routes = [route()];
  const first = registryFor(dna, routes);
  const second = registryFor(dna, routes);
  assert.deepEqual(first.verification, second.verification);
  assert.equal(first.plan.fingerprint, second.plan.fingerprint);
  const changed = cloneDna();
  changed.fidelity.qualities[0].claim.statement += ' Changed.';
  assert.notEqual(designDnaFingerprint(changed), designDnaFingerprint(dna));
  assert.notEqual(
    fingerprintFromPlan({
      ...first.plan,
      designDnaFingerprint: designDnaFingerprint(changed),
    }),
    first.plan.fingerprint,
  );
  assert.ok(
    first.verification.obligations.some(
      (item) => item.type === 'fidelity-quality',
    ),
  );
  assert.ok(
    first.verification.obligations.some(
      (item) => item.type === 'fidelity-constraint',
    ),
  );
  assert.ok(first.verification.unresolved.length > 0);
});

test('verification-aware perceptual evidence rejects unestablished verdicts and duplicate contexts', async (t) => {
  const dna = cloneDna();
  const routes = [route()];
  const { plan, verification } = registryFor(
    dna,
    routes,
    (obligations, targetContexts) =>
      bindRequirements(obligations, targetContexts),
  );
  const check = verification.checks.find(
    (item) => item.method === 'perceptual',
  );
  const screenshotPath = await screenshotFile(t);
  const session = createCaptureSession(plan, { provider: 'in-app-browser' });
  await capture(session, screenshotPath, 'capture.home.mobile', {
    width: 390,
    height: 844,
  });
  await assert.rejects(
    session.recordPerceptualObservation({
      id: 'observation.unknown-pass',
      checkRef: check.id,
      aspect: 'composition',
      statement: 'The source behavior is not established.',
      epistemicStatus: 'unknown',
      certainty: 0.2,
      result: 'passed',
      sourceCaptureRefs: [dna.sources[0].id],
      targetCaptureRefs: ['capture.home.mobile'],
      limitations: ['The source claim is unknown.'],
    }),
    (error) => error.code === 'UNESTABLISHED_PERCEPTUAL_VERDICT',
  );
  const observation = {
    id: 'observation.pass',
    checkRef: check.id,
    aspect: 'composition',
    statement: 'The host compared the linked source and target capture.',
    epistemicStatus: 'observed',
    certainty: 0.9,
    result: 'passed',
    sourceCaptureRefs: [dna.sources[0].id],
    targetCaptureRefs: ['capture.home.mobile'],
    limitations: ['Only this target context was reviewed.'],
  };
  await session.recordPerceptualObservation(observation);
  await session.recordPerceptualObservation({
    ...observation,
    id: 'observation.duplicate',
  });
  await assert.rejects(
    session.finalize(),
    (error) => error.code === 'INVALID_AUDIT_VERIFICATION',
  );
  const missingEvidenceSession = createCaptureSession(plan, {
    provider: 'in-app-browser',
  });
  await capture(
    missingEvidenceSession,
    screenshotPath,
    'capture.home.mobile.missing',
    { width: 390, height: 844 },
  );
  await assert.rejects(
    missingEvidenceSession.finalize(),
    (error) => error.code === 'INCOMPLETE_AUDIT_VERIFICATION',
  );
  const incompleteEvidence = await missingEvidenceSession.finalize({
    allowIncomplete: true,
  });
  assert.equal(incompleteEvidence.auditContractVersion, auditContractVersion);
});

test('a complete linked perceptual pass is accepted and an established failure remains reportable', async (t) => {
  const dna = cloneDna();
  const routes = [route()];
  const { plan, verification } = registryFor(
    dna,
    routes,
    (obligations, targetContexts) =>
      bindRequirements(obligations, targetContexts),
  );
  const screenshotPath = await screenshotFile(t);
  const session = createCaptureSession(plan, { provider: 'in-app-browser' });
  await capture(session, screenshotPath, 'capture.home.mobile', {
    width: 390,
    height: 844,
  });
  for (const [index, check] of verification.checks.entries())
    await session.recordPerceptualObservation({
      id: `observation.${index}`,
      checkRef: check.id,
      aspect: 'composition',
      statement: `The host evaluated ${check.obligationRef}.`,
      epistemicStatus: 'observed',
      certainty: 0.9,
      result: 'passed',
      sourceCaptureRefs: [dna.sources[0].id],
      targetCaptureRefs: ['capture.home.mobile'],
      limitations: ['The assertion is scoped to the planned context.'],
    });
  const evidence = await session.finalize();
  validateAuditVerificationEvidence({
    verification,
    evidence,
    sourceRefs: new Set(dna.sources.map((source) => source.id)),
  });
  assert.equal(
    evaluateAuditVerification({ verification, evidence, dna }).status,
    'passed',
  );
  assert.equal(evidence.captures[0].nativeDimensions.format, 'png');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const evidenceSchema = JSON.parse(
    await fs.readFile('schemas/audit-evidence.schema.json', 'utf8'),
  );
  const validateEvidence = ajv.compile(evidenceSchema);
  assert.equal(
    validateEvidence(evidence),
    true,
    JSON.stringify(validateEvidence.errors),
  );
  const planSchema = JSON.parse(
    await fs.readFile('schemas/audit-plan.schema.json', 'utf8'),
  );
  const validatePlan = ajv.compile(planSchema);
  assert.equal(validatePlan(plan), true, JSON.stringify(validatePlan.errors));
});

test('measurement checks stay isolated by capture context and preserve accepted constraint semantics', async (t) => {
  const dna = cloneDna();
  dna.fidelity.constraints[0].acceptance = {
    status: 'accepted',
    basis: 'Reviewed for this test fixture.',
  };
  for (const component of dna.componentPatterns)
    for (const state of component.states ?? [])
      for (const key of ['appearance'])
        if (state.assertions?.[key])
          state.assertions[key].epistemicStatus = 'proposed';
  dna.fidelity.qualities[0].claim.epistemicStatus = 'proposed';
  const routes = [
    route([
      { name: 'mobile', width: 390, height: 844 },
      { name: 'desktop', width: 1280, height: 900 },
    ]),
  ];
  const { plan, verification } = registryFor(
    dna,
    routes,
    (obligations, targetContexts) =>
      bindRequirements(obligations, targetContexts, {
        only: (obligation) => obligation.type === 'fidelity-constraint',
      }),
  );
  const measurementChecks = verification.checks.filter(
    (item) => item.method === 'measurement',
  );
  assert.equal(measurementChecks.length, 2);
  const screenshotPath = await screenshotFile(t);
  const session = createCaptureSession(plan, { provider: 'in-app-browser' });
  await capture(session, screenshotPath, 'capture.home.mobile', {
    width: 390,
    height: 844,
  });
  await capture(session, screenshotPath, 'capture.home.desktop', {
    width: 1280,
    height: 900,
  });
  for (const check of measurementChecks) {
    const captureRef =
      check.targetContexts[0].viewport.width === 390
        ? 'capture.home.mobile'
        : 'capture.home.desktop';
    await session.recordFidelityMeasurement({
      id: `${captureRef}.value`,
      checkRef: check.id,
      captureRef,
      target: 'metric-value',
      property: 'font-size',
      unit: 'px',
      value: 28,
    });
    await session.recordFidelityMeasurement({
      id: `${captureRef}.label`,
      checkRef: check.id,
      captureRef,
      target: 'metric-label',
      property: 'font-size',
      unit: 'px',
      value: 14,
    });
  }
  const evidence = await session.finalize();
  const evaluation = evaluateAuditVerification({ verification, evidence, dna });
  assert.equal(evaluation.status, 'passed');
  const failed = structuredClone(evidence);
  failed.fidelityMeasurements.find(
    (item) => item.target === 'metric-value',
  ).value = 40;
  validateAuditEvidence(failed, { plan });
  await validateAuditCaptureFiles(failed, { projectRoot: plan.projectRoot });
  assert.equal(
    evaluateAuditVerification({
      verification,
      evidence: failed,
      dna,
    }).checks.every((check) => check.result === 'passed'),
    false,
  );
});

test('coverage and capture hashes cannot be supplied independently of recorded files', async (t) => {
  const dna = cloneDna();
  const routes = [route()];
  const { plan, verification } = registryFor(dna, routes);
  const screenshotPath = await screenshotFile(t);
  const session = createCaptureSession(plan, { provider: 'in-app-browser' });
  await capture(session, screenshotPath, 'capture.home.mobile', {
    width: 390,
    height: 844,
  });
  const evidence = await session.finalize({ allowIncomplete: true });
  const tamperedCoverage = structuredClone(evidence);
  tamperedCoverage.captures = [];
  tamperedCoverage.coverage.complete = true;
  tamperedCoverage.coverage.missing.captures = [];
  assert.throws(
    () => validateAuditEvidence(tamperedCoverage, { plan }),
    (error) =>
      error.code === 'INVALID_AUDIT_EVIDENCE' &&
      error.details.some((detail) =>
        detail.includes('coverage does not match'),
      ),
  );
  await fs.appendFile(screenshotPath, Buffer.from('changed'));
  await assert.rejects(
    validateAuditCaptureFiles(evidence),
    (error) => error.code === 'AUDIT_CAPTURE_FILE_MISMATCH',
  );
  assert.equal(verification.auditContractVersion, auditContractVersion);
});

test('unknown or proposed perceptual evidence may document a gap but cannot establish a verdict', async (t) => {
  const dna = cloneDna();
  const routes = [route()];
  const { plan, verification } = registryFor(
    dna,
    routes,
    (obligations, targetContexts) =>
      bindRequirements(obligations, targetContexts, {
        only: (obligation) => obligation.method === 'perceptual',
      }),
  );
  const check = verification.checks.find(
    (item) => item.method === 'perceptual',
  );
  assert.ok(check);
  const session = createCaptureSession(plan, { provider: 'in-app-browser' });
  await session.recordPerceptualObservation({
    id: 'observation.unknown-incomplete',
    checkRef: check.id,
    aspect: 'composition',
    statement: 'The source evidence is unavailable for this comparison.',
    epistemicStatus: 'unknown',
    certainty: 0,
    result: 'incomplete',
    sourceCaptureRefs: [],
    targetCaptureRefs: [],
    limitations: ['The private source capture was not provided.'],
  });
  const evidence = await session.finalize({ allowIncomplete: true });
  assert.equal(
    evaluateAuditVerification({ verification, evidence, dna }).checks.find(
      (item) => item.checkRef === check.id,
    ).result,
    'incomplete',
  );
  await assert.rejects(
    session.recordPerceptualObservation({
      id: 'observation.after-finalize',
      checkRef: check.id,
      aspect: 'composition',
      statement: 'This should not be recorded after finalization.',
      epistemicStatus: 'proposed',
      certainty: 0,
      result: 'incomplete',
      limitations: ['Session is already finalized.'],
    }),
    (error) => error.code === 'CAPTURE_SESSION_FINALIZED',
  );
  const proposed = structuredClone(evidence);
  proposed.perceptualObservations[0].epistemicStatus = 'proposed';
  proposed.perceptualObservations[0].result = 'passed';
  assert.throws(
    () =>
      validateAuditVerificationEvidence({
        verification,
        evidence: proposed,
        sourceRefs: new Set(dna.sources.map((source) => source.id)),
      }),
    (error) => error.code === 'INVALID_AUDIT_VERIFICATION',
  );
});

test('explicit exclusions remove only their contexts and keep pending or rejected constraints out of checks', () => {
  const dna = cloneDna();
  dna.fidelity.constraints[0].acceptance = {
    status: 'rejected',
    basis: 'Rejected for this audit scope after review.',
  };
  const routes = [route()];
  const targetContext = contexts(routes)[0];
  const empty = candidateConfig(dna, [], routes);
  const candidates = buildAuditVerification({ dna, config: empty, routes });
  const requirement = candidates.obligations.find(
    (item) => item.disposition === 'requirement',
  );
  assert.ok(requirement);
  const config = {
    ...empty,
    verification: {
      ...empty.verification,
      exclusions: [
        {
          obligationRef: requirement.id,
          targetContexts: [targetContext],
          reason: 'The route is outside this focused audit.',
          references: ['scope.reviewed'],
        },
      ],
    },
  };
  const verification = buildAuditVerification({ dna, config, routes });
  assert.equal(
    verification.unresolved.some(
      (item) => item.obligationRef === requirement.id,
    ),
    false,
  );
  assert.equal(
    verification.checks.some((item) => item.obligationRef === requirement.id),
    false,
  );
  assert.equal(verification.exclusions.length, 1);
  assert.ok(
    verification.obligations.some(
      (item) =>
        item.type === 'fidelity-constraint' && item.disposition === 'excluded',
    ),
  );
});

test('invalid target contexts, source references, and measurement values fail with contract errors', async (t) => {
  const dna = cloneDna();
  dna.fidelity.constraints[0].acceptance = {
    status: 'accepted',
    basis: 'Accepted for validation.',
  };
  const routes = [route()];
  const { plan, verification } = registryFor(
    dna,
    routes,
    (obligations, targetContexts) =>
      bindRequirements(obligations, targetContexts, {
        only: (obligation) => obligation.type === 'fidelity-constraint',
      }),
  );
  const check = verification.checks[0];
  const screenshotPath = await screenshotFile(t);
  const session = createCaptureSession(plan, { provider: 'in-app-browser' });
  await capture(session, screenshotPath, 'capture.home.mobile', {
    width: 390,
    height: 844,
  });
  await assert.rejects(
    session.recordFidelityMeasurement({
      id: 'measurement.infinity',
      checkRef: check.id,
      captureRef: 'capture.home.mobile',
      target: 'metric-value',
      property: 'font-size',
      unit: 'px',
      value: Number.POSITIVE_INFINITY,
    }),
    (error) => error.code === 'INVALID_FIDELITY_MEASUREMENT',
  );
  const invalid = structuredClone(plan);
  invalid.config.verification.bindings[0].targetContexts[0].viewport.width = 401;
  assert.throws(
    () => buildAuditVerification({ dna, config: invalid.config, routes }),
    (error) => error.code === 'INVALID_AUDIT_VERIFICATION',
  );
  const evidence = await session.finalize({ allowIncomplete: true });
  evidence.perceptualObservations.push({
    id: 'observation.invalid-source',
    checkRef: 'check.missing',
    aspect: 'composition',
    statement: 'Invalid source reference.',
    epistemicStatus: 'observed',
    certainty: 1,
    result: 'failed',
    sourceCaptureRefs: ['source.missing'],
    targetCaptureRefs: ['capture.home.mobile'],
    provenance: { evaluator: 'host-agent', method: 'multimodal-comparison' },
    ruleRefs: [],
    tokenRefs: [],
    limitations: [],
    recordedAt: new Date().toISOString(),
  });
  assert.throws(
    () =>
      validateAuditVerificationEvidence({
        verification,
        evidence,
        sourceRefs: new Set(dna.sources.map((source) => source.id)),
      }),
    (error) => error.code === 'INVALID_AUDIT_VERIFICATION',
  );
});

test('direct evidence cannot add unplanned contexts and obsolete bindings fail closed', async (t) => {
  const dna = cloneDna();
  const routes = [route()];
  const { plan } = registryFor(dna, routes, (obligations, targetContexts) =>
    bindRequirements(obligations, targetContexts, {
      only: (obligation) => obligation.type === 'fidelity-constraint',
    }),
  );
  const screenshotPath = await screenshotFile(t);
  const session = createCaptureSession(plan, { provider: 'in-app-browser' });
  await capture(session, screenshotPath, 'capture.home.mobile', {
    width: 390,
    height: 844,
  });
  const evidence = await session.finalize({ allowIncomplete: true });
  evidence.captures.push({
    ...evidence.captures[0],
    id: 'capture.home.unplanned',
    viewport: { width: 401, height: 844 },
  });
  assert.throws(
    () => validateAuditEvidence(evidence, { plan }),
    (error) =>
      error.code === 'INVALID_AUDIT_EVIDENCE' &&
      error.details.some((detail) => detail.includes('outside the audit plan')),
  );

  const proposedDna = cloneDna();
  proposedDna.fidelity.qualities[0].claim.epistemicStatus = 'proposed';
  const candidateConfig = candidateConfigForTest(proposedDna, routes);
  const candidates = buildAuditVerification({
    dna: proposedDna,
    config: candidateConfig,
    routes,
  });
  const diagnostic = candidates.obligations.find(
    (obligation) => obligation.type === 'fidelity-quality',
  );
  assert.equal(diagnostic.disposition, 'diagnostic');
  const invalidBindingConfig = {
    ...candidateConfig,
    verification: {
      ...candidateConfig.verification,
      bindings: [
        {
          obligationRef: diagnostic.id,
          layer: diagnostic.layer,
          method: diagnostic.method,
          targetContexts: contexts(routes),
          sourceRefs: [proposedDna.sources[0].id],
        },
      ],
    },
  };
  assert.throws(
    () =>
      buildAuditVerification({
        dna: proposedDna,
        config: invalidBindingConfig,
        routes,
      }),
    (error) => error.code === 'INVALID_AUDIT_VERIFICATION',
  );
});

function candidateConfigForTest(dna, routes) {
  return candidateConfig(dna, [], routes);
}
