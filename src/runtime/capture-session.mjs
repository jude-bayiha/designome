import fs from 'node:fs/promises';
import path from 'node:path';

import { DesignomeError } from './errors.mjs';
import { inspectImageBuffer } from './images.mjs';
import {
  atomicWrite,
  jsonText,
  pathExists,
  sha256,
  toPosixPath,
} from './files.mjs';
import {
  assertAuditContractVersion,
  auditContractVersion,
  fingerprintFromPlan,
  isVerificationAware,
} from './audit-contract.mjs';
import {
  evaluateAuditVerification,
  validateAuditVerificationEvidence,
} from './audit-verification.mjs';

export const captureAdapter = Object.freeze({
  name: '@designome/audit-browser-adapter',
  version: '1.0.0',
  evidenceSchemaVersion: '1.0.0',
});

const directions = new Set(['ltr', 'rtl']);
const consoleLevels = new Set(['warning', 'error']);
const interactionKinds = new Set([
  'navigation',
  'disclosure',
  'filter',
  'search',
  'selection',
  'dialog',
  'panel',
  'focus-return',
  'detail-update',
  'loading',
  'empty',
  'error',
  'recovery',
  'responsive',
  'other',
]);

function sameNativeDimensions(left, right) {
  return (
    left?.format === right?.format &&
    left?.width === right?.width &&
    left?.height === right?.height
  );
}

function requireObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new DesignomeError(`${label} must be an object`, {
      code: 'INVALID_CAPTURE_OBSERVATION',
      details: { field: label },
    });
  }
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DesignomeError(`${label} must be a non-empty string`, {
      code: 'INVALID_CAPTURE_OBSERVATION',
      details: { field: label },
    });
  }
}

function requireBoolean(value, label) {
  if (typeof value !== 'boolean') {
    throw new DesignomeError(`${label} must be a boolean`, {
      code: 'INVALID_CAPTURE_OBSERVATION',
      details: { field: label },
    });
  }
}

function requireFinite(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new DesignomeError(`${label} must be a non-negative number`, {
      code: 'INVALID_CAPTURE_OBSERVATION',
      details: { field: label },
    });
  }
}

function rejectDuplicateReferences(values, label) {
  if (!Array.isArray(values)) return;
  if (new Set(values).size !== values.length) {
    throw new DesignomeError(`${label} contains duplicate references`, {
      code: 'DUPLICATE_VERIFICATION_REFERENCE',
      details: { field: label },
    });
  }
}

function requireArrayIfPresent(value, label) {
  if (value !== undefined && !Array.isArray(value)) {
    throw new DesignomeError(`${label} must be an array`, {
      code: 'INVALID_CAPTURE_OBSERVATION',
      details: { field: label },
    });
  }
}

function requireStringArrayIfPresent(value, label) {
  requireArrayIfPresent(value, label);
  for (const [index, item] of (value ?? []).entries())
    requireString(item, `${label}[${index}]`);
}

function validatePlannedCheckRefs(plan, checkRefs, method, label) {
  for (const checkRef of checkRefs ?? []) {
    const check = plan.verification?.checks?.find(
      (candidate) => candidate.id === checkRef,
    );
    if (!check || check.method !== method) {
      throw new DesignomeError(
        `${label} references an invalid ${method} check`,
        {
          code: 'INVALID_VERIFICATION_CHECK_REF',
          details: { checkRef },
        },
      );
    }
  }
}

function normalizedRoute(route) {
  return {
    ...route,
    scenarios:
      Array.isArray(route.scenarios) && route.scenarios.length > 0
        ? route.scenarios
        : ['default'],
    directions:
      Array.isArray(route.directions) && route.directions.length > 0
        ? route.directions
        : ['ltr'],
  };
}

function captureKey(routeId, viewport, scenario, direction) {
  return `${routeId}:${viewport.width}x${viewport.height}:${scenario}:${direction}`;
}

function expectedCoverage(plan) {
  const captures = [];
  const interactions = [];
  for (const rawRoute of plan.routes ?? []) {
    const route = normalizedRoute(rawRoute);
    for (const viewport of route.viewports ?? []) {
      for (const scenario of route.scenarios) {
        for (const direction of route.directions) {
          captures.push({
            routeId: route.id,
            viewport: { width: viewport.width, height: viewport.height },
            scenario,
            direction,
          });
        }
      }
    }
    for (const flow of route.flows ?? []) {
      interactions.push({ routeId: route.id, flowId: flow });
    }
  }
  return { captures, interactions };
}

function coverageForRecords(plan, captures, interactions) {
  const expected = expectedCoverage(plan);
  const captureKeySet = new Set(
    captures.map((capture) =>
      captureKey(
        capture.routeId,
        capture.viewport,
        capture.scenario,
        capture.direction,
      ),
    ),
  );
  const interactionKeySet = new Set(
    interactions.map(
      (interaction) => `${interaction.routeId}:${interaction.flowId}`,
    ),
  );
  const actual = {
    captures: captures.map(({ routeId, viewport, scenario, direction }) => ({
      routeId,
      viewport: { width: viewport.width, height: viewport.height },
      scenario,
      direction,
    })),
    interactions: interactions.map(({ routeId, flowId }) => ({
      routeId,
      flowId,
    })),
  };
  const missing = {
    captures: expected.captures.filter(
      (capture) =>
        !captureKeySet.has(
          captureKey(
            capture.routeId,
            capture.viewport,
            capture.scenario,
            capture.direction,
          ),
        ),
    ),
    interactions: expected.interactions.filter(
      (interaction) =>
        !interactionKeySet.has(`${interaction.routeId}:${interaction.flowId}`),
    ),
  };
  return {
    complete:
      missing.captures.length === 0 && missing.interactions.length === 0,
    expected,
    actual,
    missing,
  };
}

function coverageSignature(coverage) {
  const sortCaptures = (values) =>
    [...values].sort((left, right) =>
      captureKey(
        left.routeId,
        left.viewport,
        left.scenario,
        left.direction,
      ).localeCompare(
        captureKey(
          right.routeId,
          right.viewport,
          right.scenario,
          right.direction,
        ),
      ),
    );
  const sortInteractions = (values) =>
    [...values].sort((left, right) =>
      `${left.routeId}:${left.flowId}`.localeCompare(
        `${right.routeId}:${right.flowId}`,
      ),
    );
  return JSON.stringify({
    complete: coverage.complete,
    expected: {
      captures: sortCaptures(coverage.expected.captures),
      interactions: sortInteractions(coverage.expected.interactions),
    },
    actual: {
      captures: sortCaptures(coverage.actual.captures),
      interactions: sortInteractions(coverage.actual.interactions),
    },
    missing: {
      captures: sortCaptures(coverage.missing.captures),
      interactions: sortInteractions(coverage.missing.interactions),
    },
  });
}

export async function validateAuditCaptureFiles(
  evidence,
  { projectRoot = null } = {},
) {
  const errors = [];
  for (const [index, capture] of (evidence?.captures ?? []).entries()) {
    if (!capture.contentHash && !capture.nativeDimensions) continue;
    const screenshotPath =
      projectRoot && !path.isAbsolute(capture.screenshotPath)
        ? path.resolve(projectRoot, capture.screenshotPath)
        : path.resolve(capture.screenshotPath);
    let bytes;
    try {
      bytes = await fs.readFile(screenshotPath);
    } catch (error) {
      errors.push(
        `captures[${index}] screenshot is unreadable: ${error.message}`,
      );
      continue;
    }
    if (capture.contentHash) {
      const actualHash = `sha256:${sha256(bytes)}`;
      if (capture.contentHash !== actualHash)
        errors.push(`captures[${index}] contentHash does not match its file`);
    }
    if (capture.nativeDimensions) {
      try {
        const actualDimensions = inspectImageBuffer(bytes);
        if (!sameNativeDimensions(actualDimensions, capture.nativeDimensions))
          errors.push(
            `captures[${index}] nativeDimensions do not match its file`,
          );
      } catch (error) {
        errors.push(
          `captures[${index}] image metadata is unavailable: ${error.message}`,
        );
      }
    }
  }
  if (errors.length > 0)
    throw new DesignomeError('Audit capture files are invalid or changed', {
      code: 'AUDIT_CAPTURE_FILE_MISMATCH',
      details: errors,
    });
  return true;
}

function normalizeElement(element, index) {
  requireObject(element, `element[${index}]`);
  requireString(element.id, `element[${index}].id`);
  requireString(element.role, `element[${index}].role`);
  requireBoolean(element.visible, `element[${index}].visible`);
  requireBoolean(element.clipped, `element[${index}].clipped`);
  requireObject(element.rect, `element[${index}].rect`);
  requireFinite(element.rect.width, `element[${index}].rect.width`);
  requireFinite(element.rect.height, `element[${index}].rect.height`);
  const optionalNumbers = [
    'fontSize',
    'lineHeight',
    'flexShrink',
    'gapBefore',
    'panelPadding',
  ];
  for (const key of optionalNumbers) {
    if (element[key] !== undefined) {
      requireFinite(element[key], `element[${index}].${key}`);
    }
  }
  return {
    ...element,
    hidden: element.hidden ?? !element.visible,
    tokenRefs: [...new Set(element.tokenRefs ?? [])],
    ruleRefs: [...new Set(element.ruleRefs ?? [])],
  };
}

function normalizePlan(plan) {
  requireObject(plan, 'plan');
  if (!Array.isArray(plan.routes) || plan.routes.length === 0) {
    throw new DesignomeError('Capture plan must contain routes', {
      code: 'INVALID_CAPTURE_PLAN',
    });
  }
  const contract = plan.auditContractVersion ?? '1.0.0';
  try {
    assertAuditContractVersion(contract);
  } catch (error) {
    throw new DesignomeError(error.message, {
      code: 'INCOMPATIBLE_AUDIT_CONTRACT_VERSION',
    });
  }
  return {
    schemaVersion: plan.schemaVersion ?? '1.0.0',
    auditContractVersion: contract,
    designDnaFingerprint: plan.designDnaFingerprint ?? null,
    baseUrl: plan.baseUrl,
    projectRoot: plan.projectRoot ?? null,
    startCommand: plan.startCommand ?? null,
    config: plan.config ?? null,
    routes: plan.routes.map(normalizedRoute),
    perceptual: plan.perceptual ?? null,
    verification: plan.verification ?? null,
    ...(plan.focus ? { focus: structuredClone(plan.focus) } : {}),
  };
}

export class CaptureSession {
  constructor(plan, options = {}) {
    this.plan = normalizePlan(plan);
    this.outputPath = options.outputPath
      ? path.resolve(options.outputPath)
      : null;
    this.providerName =
      options.provider ?? plan.provider?.selected ?? 'external';
    this.verificationAware = isVerificationAware(this.plan);
    this.executionOwner =
      options.executionOwner ??
      (this.providerName === 'existing-playwright'
        ? 'target-project'
        : 'host-agent');
    this.captures = [];
    this.interactions = [];
    this.consoleMessages = [];
    this.accessibilityChecks = [];
    this.perceptualObservations = [];
    this.fidelityMeasurements = [];
    this.finalized = false;
  }

  route(routeId) {
    const route = this.plan.routes.find(
      (candidate) => candidate.id === routeId,
    );
    if (!route) {
      throw new DesignomeError(
        `Route ${routeId} is not present in the capture plan`,
        {
          code: 'CAPTURE_ROUTE_NOT_PLANNED',
          details: { routeId },
        },
      );
    }
    return route;
  }

  assertOpen() {
    if (this.finalized) {
      throw new DesignomeError('Capture session is already finalized', {
        code: 'CAPTURE_SESSION_FINALIZED',
      });
    }
  }

  async recordCapture(observation) {
    this.assertOpen();
    requireObject(observation, 'capture');
    requireString(observation.id, 'capture.id');
    const route = this.route(observation.routeId);
    requireObject(observation.viewport, 'capture.viewport');
    const plannedViewport = route.viewports.some(
      (viewport) =>
        viewport.width === observation.viewport.width &&
        viewport.height === observation.viewport.height,
    );
    if (!plannedViewport) {
      throw new DesignomeError('Capture viewport is not present in the plan', {
        code: 'CAPTURE_VIEWPORT_NOT_PLANNED',
        details: { routeId: route.id, viewport: observation.viewport },
      });
    }
    const scenario = observation.scenario ?? 'default';
    if (!route.scenarios.includes(scenario)) {
      throw new DesignomeError('Capture scenario is not present in the plan', {
        code: 'CAPTURE_SCENARIO_NOT_PLANNED',
        details: { routeId: route.id, scenario },
      });
    }
    const direction = observation.direction ?? 'ltr';
    if (!directions.has(direction) || !route.directions.includes(direction)) {
      throw new DesignomeError('Capture direction is not present in the plan', {
        code: 'CAPTURE_DIRECTION_NOT_PLANNED',
        details: { routeId: route.id, direction },
      });
    }
    requireString(observation.screenshotPath, 'capture.screenshotPath');
    const screenshotPath =
      this.plan.projectRoot && !path.isAbsolute(observation.screenshotPath)
        ? path.resolve(this.plan.projectRoot, observation.screenshotPath)
        : path.resolve(observation.screenshotPath);
    if (!(await pathExists(screenshotPath))) {
      throw new DesignomeError('Capture screenshot does not exist', {
        code: 'CAPTURE_SCREENSHOT_MISSING',
        details: { checkedPath: screenshotPath },
      });
    }
    const existingCapture = this.captures.find(
      (capture) =>
        capture.id === observation.id ||
        captureKey(
          capture.routeId,
          capture.viewport,
          capture.scenario,
          capture.direction,
        ) === captureKey(route.id, observation.viewport, scenario, direction),
    );
    if (existingCapture) {
      throw new DesignomeError(
        'A capture with the same ID or context is already recorded',
        {
          code: 'DUPLICATE_CAPTURE_EVIDENCE',
          details: {
            id: observation.id,
            routeId: route.id,
            scenario,
            direction,
          },
        },
      );
    }
    requireObject(observation.document, 'capture.document');
    for (const key of [
      'scrollWidth',
      'clientWidth',
      'scrollHeight',
      'clientHeight',
    ]) {
      requireFinite(observation.document[key], `capture.document.${key}`);
    }
    const screenshotBytes = await fs.readFile(screenshotPath);
    const contentHash = `sha256:${sha256(screenshotBytes)}`;
    let nativeDimensions = null;
    try {
      nativeDimensions = inspectImageBuffer(screenshotBytes);
    } catch {
      if (this.verificationAware) {
        throw new DesignomeError(
          'Audit Contract 2.0 captures must use a supported image file',
          {
            code: 'CAPTURE_IMAGE_METADATA_UNAVAILABLE',
            details: { checkedPath: screenshotPath },
          },
        );
      }
    }
    if (
      observation.contentHash !== undefined &&
      observation.contentHash !== contentHash
    ) {
      throw new DesignomeError('Capture content hash does not match the file', {
        code: 'CAPTURE_HASH_MISMATCH',
        details: { id: observation.id },
      });
    }
    if (
      observation.nativeDimensions !== undefined &&
      !sameNativeDimensions(observation.nativeDimensions, nativeDimensions)
    ) {
      throw new DesignomeError(
        'Capture native dimensions do not match the file',
        {
          code: 'CAPTURE_DIMENSIONS_MISMATCH',
          details: { id: observation.id },
        },
      );
    }
    const normalized = {
      id: observation.id,
      routeId: route.id,
      url: observation.url ?? new URL(route.path, this.plan.baseUrl).toString(),
      viewport: {
        width: observation.viewport.width,
        height: observation.viewport.height,
      },
      scenario,
      direction,
      screenshotPath: this.plan.projectRoot
        ? toPosixPath(path.relative(this.plan.projectRoot, screenshotPath))
        : screenshotPath,
      document: {
        ...observation.document,
        horizontalOverflow:
          observation.document.scrollWidth >
          observation.document.clientWidth + 1,
      },
      elements: (observation.elements ?? []).map(normalizeElement),
      responsiveChecks: observation.responsiveChecks ?? [],
      contentHash,
      ...(nativeDimensions ? { nativeDimensions } : {}),
      recordedAt: observation.recordedAt ?? new Date().toISOString(),
    };
    this.captures.push(normalized);
    return normalized;
  }

  async recordInteraction(observation) {
    this.assertOpen();
    requireObject(observation, 'interaction');
    requireString(observation.id, 'interaction.id');
    this.route(observation.routeId);
    if (!interactionKinds.has(observation.kind)) {
      throw new DesignomeError('Interaction kind is unsupported', {
        code: 'INVALID_CAPTURE_OBSERVATION',
        details: { kind: observation.kind },
      });
    }
    requireString(observation.expected, 'interaction.expected');
    requireString(observation.observed, 'interaction.observed');
    requireBoolean(observation.passed, 'interaction.passed');
    if (this.verificationAware) {
      requireArrayIfPresent(observation.checkRefs, 'interaction.checkRefs');
      rejectDuplicateReferences(observation.checkRefs, 'interaction.checkRefs');
      validatePlannedCheckRefs(
        this.plan,
        observation.checkRefs,
        'interaction',
        'Interaction',
      );
      if ((observation.checkRefs ?? []).length > 0)
        requireString(observation.captureRef, 'interaction.captureRef');
    }
    const normalized = {
      ...observation,
      flowId: observation.flowId ?? observation.id,
      urlBefore: observation.urlBefore ?? null,
      urlAfter: observation.urlAfter ?? null,
      urlChanged:
        observation.urlChanged ??
        (observation.urlBefore !== undefined &&
          observation.urlAfter !== undefined &&
          observation.urlBefore !== observation.urlAfter),
      disclosure: observation.disclosure ?? null,
      dialog: observation.dialog ?? null,
      focus: observation.focus ?? null,
      ...(observation.captureRef ? { captureRef: observation.captureRef } : {}),
      checkRefs: [...new Set(observation.checkRefs ?? [])],
      ruleRefs: [...new Set(observation.ruleRefs ?? [])],
      recordedAt: observation.recordedAt ?? new Date().toISOString(),
    };
    this.interactions.push(normalized);
    return normalized;
  }

  async recordConsoleMessage(observation) {
    this.assertOpen();
    requireObject(observation, 'consoleMessage');
    this.route(observation.routeId);
    if (!consoleLevels.has(observation.level)) {
      throw new DesignomeError(
        'Only browser warnings and errors are audit evidence',
        {
          code: 'INVALID_CAPTURE_OBSERVATION',
          details: { level: observation.level },
        },
      );
    }
    requireString(observation.message, 'consoleMessage.message');
    const normalized = {
      ...observation,
      source: observation.source ?? 'browser-console',
      recordedAt: observation.recordedAt ?? new Date().toISOString(),
    };
    this.consoleMessages.push(normalized);
    return normalized;
  }

  async recordAccessibilityCheck(observation) {
    this.assertOpen();
    requireObject(observation, 'accessibilityCheck');
    requireString(observation.id, 'accessibilityCheck.id');
    this.route(observation.routeId);
    requireString(observation.expected, 'accessibilityCheck.expected');
    requireString(observation.observed, 'accessibilityCheck.observed');
    requireBoolean(observation.passed, 'accessibilityCheck.passed');
    if (this.verificationAware) {
      requireArrayIfPresent(
        observation.checkRefs,
        'accessibilityCheck.checkRefs',
      );
      rejectDuplicateReferences(
        observation.checkRefs,
        'accessibilityCheck.checkRefs',
      );
      validatePlannedCheckRefs(
        this.plan,
        observation.checkRefs,
        'accessibility',
        'Accessibility check',
      );
      if ((observation.checkRefs ?? []).length > 0)
        requireString(observation.captureRef, 'accessibilityCheck.captureRef');
    }
    const normalized = {
      ...observation,
      accessibleName: observation.accessibleName ?? null,
      accessibleRole: observation.accessibleRole ?? null,
      accessibleState: observation.accessibleState ?? null,
      ...(observation.captureRef ? { captureRef: observation.captureRef } : {}),
      checkRefs: [...new Set(observation.checkRefs ?? [])],
      ruleRefs: [...new Set(observation.ruleRefs ?? [])],
      recordedAt: observation.recordedAt ?? new Date().toISOString(),
    };
    this.accessibilityChecks.push(normalized);
    return normalized;
  }

  async recordPerceptualObservation(observation) {
    this.assertOpen();
    requireObject(observation, 'perceptualObservation');
    requireString(observation.id, 'perceptualObservation.id');
    requireString(observation.aspect, 'perceptualObservation.aspect');
    if (
      Array.isArray(this.plan.perceptual?.aspects) &&
      !this.plan.perceptual.aspects.includes(observation.aspect)
    ) {
      throw new DesignomeError(
        'Perceptual aspect is not present in the audit plan',
        {
          code: 'PERCEPTUAL_ASPECT_NOT_PLANNED',
          details: { aspect: observation.aspect },
        },
      );
    }
    requireString(observation.statement, 'perceptualObservation.statement');
    if (
      !['observed', 'inferred', 'proposed', 'unknown'].includes(
        observation.epistemicStatus,
      )
    ) {
      throw new DesignomeError(
        'Perceptual observation has an invalid epistemic status',
        {
          code: 'INVALID_CAPTURE_OBSERVATION',
          details: { epistemicStatus: observation.epistemicStatus },
        },
      );
    }
    if (!['passed', 'failed', 'incomplete'].includes(observation.result)) {
      throw new DesignomeError('Perceptual observation result is invalid', {
        code: 'INVALID_CAPTURE_OBSERVATION',
        details: { result: observation.result },
      });
    }
    if (
      !Number.isFinite(observation.certainty) ||
      observation.certainty < 0 ||
      observation.certainty > 1
    ) {
      throw new DesignomeError(
        'Perceptual certainty must be between zero and one',
        {
          code: 'INVALID_CAPTURE_OBSERVATION',
          details: { certainty: observation.certainty },
        },
      );
    }
    if (this.verificationAware) {
      for (const field of [
        'sourceCaptureRefs',
        'targetCaptureRefs',
        'ruleRefs',
        'tokenRefs',
        'limitations',
      ])
        requireStringArrayIfPresent(
          observation[field],
          `perceptualObservation.${field}`,
        );
      rejectDuplicateReferences(
        observation.sourceCaptureRefs,
        'perceptualObservation.sourceCaptureRefs',
      );
      rejectDuplicateReferences(
        observation.targetCaptureRefs,
        'perceptualObservation.targetCaptureRefs',
      );
      const check = this.plan.verification?.checks?.find(
        (candidate) => candidate.id === observation.checkRef,
      );
      if (!check || check.method !== 'perceptual') {
        throw new DesignomeError(
          'Audit Contract 2.0 perceptual observations require a planned checkRef',
          {
            code: 'INVALID_VERIFICATION_CHECK_REF',
            details: { checkRef: observation.checkRef ?? null },
          },
        );
      }
      if (
        ['unknown', 'proposed'].includes(observation.epistemicStatus) &&
        observation.result !== 'incomplete'
      ) {
        throw new DesignomeError(
          'Unestablished perceptual evidence cannot be marked passed or failed',
          { code: 'UNESTABLISHED_PERCEPTUAL_VERDICT' },
        );
      }
      if (
        ['passed', 'failed'].includes(observation.result) &&
        (!Array.isArray(observation.sourceCaptureRefs) ||
          observation.sourceCaptureRefs.length === 0 ||
          !Array.isArray(observation.targetCaptureRefs) ||
          observation.targetCaptureRefs.length === 0)
      ) {
        throw new DesignomeError(
          'Established perceptual verdicts require source and target capture references',
          { code: 'PERCEPTUAL_REFERENCES_REQUIRED' },
        );
      }
    }
    const normalized = {
      ...observation,
      provenance: {
        evaluator: 'host-agent',
        method: 'multimodal-comparison',
        ...(observation.provenance ?? {}),
      },
      sourceCaptureRefs: [...new Set(observation.sourceCaptureRefs ?? [])],
      targetCaptureRefs: [...new Set(observation.targetCaptureRefs ?? [])],
      ...(observation.checkRef ? { checkRef: observation.checkRef } : {}),
      ruleRefs: [...new Set(observation.ruleRefs ?? [])],
      tokenRefs: [...new Set(observation.tokenRefs ?? [])],
      limitations: [...new Set(observation.limitations ?? [])],
      recordedAt: observation.recordedAt ?? new Date().toISOString(),
    };
    this.perceptualObservations.push(normalized);
    return normalized;
  }

  async recordFidelityMeasurement(measurement) {
    this.assertOpen();
    requireObject(measurement, 'fidelityMeasurement');
    requireString(measurement.id, 'fidelityMeasurement.id');
    requireString(measurement.checkRef, 'fidelityMeasurement.checkRef');
    requireString(measurement.captureRef, 'fidelityMeasurement.captureRef');
    requireString(measurement.target, 'fidelityMeasurement.target');
    requireString(measurement.property, 'fidelityMeasurement.property');
    requireString(measurement.unit, 'fidelityMeasurement.unit');
    if (
      !['string', 'number', 'boolean'].includes(typeof measurement.value) ||
      (typeof measurement.value === 'number' &&
        !Number.isFinite(measurement.value))
    ) {
      throw new DesignomeError('Fidelity measurement value is invalid', {
        code: 'INVALID_FIDELITY_MEASUREMENT',
      });
    }
    if (this.verificationAware) {
      requireStringArrayIfPresent(
        measurement.limitations,
        'fidelityMeasurement.limitations',
      );
      if (measurement.provenance !== undefined)
        requireObject(measurement.provenance, 'fidelityMeasurement.provenance');
      const check = this.plan.verification?.checks?.find(
        (candidate) => candidate.id === measurement.checkRef,
      );
      if (!check || check.method !== 'measurement')
        throw new DesignomeError(
          'Fidelity measurements require a planned measurement checkRef',
          { code: 'INVALID_VERIFICATION_CHECK_REF' },
        );
    }
    const key = `${measurement.captureRef}:${measurement.target}:${measurement.property}`;
    if (
      this.fidelityMeasurements.some(
        (candidate) =>
          `${candidate.captureRef}:${candidate.target}:${candidate.property}` ===
          key,
      )
    )
      throw new DesignomeError('Duplicate fidelity measurement', {
        code: 'DUPLICATE_FIDELITY_MEASUREMENT',
        details: { key },
      });
    const normalized = {
      ...measurement,
      provenance: measurement.provenance ?? {
        evaluator: 'host-agent-browser',
      },
      limitations: [...new Set(measurement.limitations ?? [])],
      recordedAt: measurement.recordedAt ?? new Date().toISOString(),
    };
    this.fidelityMeasurements.push(normalized);
    return normalized;
  }

  coverage() {
    return coverageForRecords(this.plan, this.captures, this.interactions);
  }

  async finalize({
    allowIncomplete = false,
    outputPath = this.outputPath,
  } = {}) {
    this.assertOpen();
    const coverage = coverageForRecords(
      this.plan,
      this.captures,
      this.interactions,
    );
    if (!coverage.complete && !allowIncomplete) {
      throw new DesignomeError('Browser evidence is incomplete', {
        code: 'INCOMPLETE_AUDIT_EVIDENCE',
        details: coverage.missing,
      });
    }
    const receivedAt = new Date().toISOString();
    const planFingerprint = this.verificationAware
      ? fingerprintFromPlan(this.plan)
      : sha256(
          jsonText({
            schemaVersion: this.plan.schemaVersion,
            baseUrl: this.plan.baseUrl,
            routes: this.plan.routes,
            ...(this.plan.focus ? { focus: this.plan.focus } : {}),
          }),
        );
    const evidence = {
      schemaVersion: '1.0.0',
      ...(this.verificationAware
        ? {
            auditContractVersion,
            designDnaFingerprint: this.plan.designDnaFingerprint,
          }
        : {}),
      generatedAt: receivedAt,
      adapter: captureAdapter,
      plan: {
        schemaVersion: this.plan.schemaVersion,
        fingerprint: planFingerprint,
      },
      provider: {
        name: this.providerName,
        kind:
          this.executionOwner === 'target-project'
            ? 'target-project'
            : 'external',
        executionOwner: this.executionOwner,
        status: 'evidence-received',
        receivedAt,
      },
      coverage,
      captures: this.captures,
      interactions: this.interactions,
      consoleMessages: this.consoleMessages,
      accessibilityChecks: this.accessibilityChecks,
      perceptualObservations: this.perceptualObservations,
      fidelityMeasurements: this.fidelityMeasurements,
    };
    validateAuditEvidence(evidence, { plan: this.plan });
    await validateAuditCaptureFiles(evidence, {
      projectRoot: this.plan.projectRoot,
    });
    if (this.verificationAware) {
      validateAuditVerificationEvidence({
        verification: this.plan.verification,
        evidence,
        sourceRefs: new Set(
          (this.plan.perceptual?.sourceCaptures ?? []).map(
            (source) => source.id,
          ),
        ),
      });
      const verificationEvaluation = evaluateAuditVerification({
        verification: this.plan.verification,
        evidence,
        sourceRefs: new Set(
          (this.plan.perceptual?.sourceCaptures ?? []).map(
            (source) => source.id,
          ),
        ),
      });
      if (verificationEvaluation.status === 'incomplete' && !allowIncomplete)
        throw new DesignomeError('Audit verification evidence is incomplete', {
          code: 'INCOMPLETE_AUDIT_VERIFICATION',
          details: verificationEvaluation.unresolved,
        });
    }
    if (outputPath) {
      await atomicWrite(path.resolve(outputPath), jsonText(evidence));
    }
    this.finalized = true;
    return evidence;
  }
}

export function validateAuditEvidence(evidence, { plan = null } = {}) {
  const errors = [];
  if (evidence?.schemaVersion !== '1.0.0') {
    errors.push('schemaVersion must be 1.0.0');
  }
  if (evidence?.adapter?.evidenceSchemaVersion !== '1.0.0') {
    errors.push('adapter.evidenceSchemaVersion must be 1.0.0');
  }
  if (
    evidence?.auditContractVersion !== undefined &&
    !['1.0.0', auditContractVersion].includes(evidence.auditContractVersion)
  ) {
    errors.push('auditContractVersion must be 1.0.0 or 2.0.0');
  }
  if (
    evidence?.designDnaFingerprint !== undefined &&
    !/^[a-f0-9]{64}$/u.test(evidence.designDnaFingerprint)
  ) {
    errors.push('designDnaFingerprint must be a SHA-256 fingerprint');
  }
  if (evidence?.provider?.status !== 'evidence-received') {
    errors.push('provider.status must be evidence-received');
  }
  if (!evidence?.provider?.receivedAt) {
    errors.push('provider.receivedAt is required');
  }
  for (const property of [
    'captures',
    'interactions',
    'consoleMessages',
    'accessibilityChecks',
    'perceptualObservations',
  ]) {
    if (!Array.isArray(evidence?.[property])) {
      errors.push(`${property} must be an array`);
    }
  }
  if (
    evidence?.auditContractVersion === auditContractVersion &&
    !Array.isArray(evidence?.fidelityMeasurements)
  ) {
    errors.push('fidelityMeasurements must be an array for Audit Contract 2.0');
  }
  if (!evidence?.coverage || typeof evidence.coverage.complete !== 'boolean') {
    errors.push('coverage.complete must be a boolean');
  }
  for (const section of ['expected', 'actual', 'missing']) {
    if (!Array.isArray(evidence?.coverage?.[section]?.captures)) {
      errors.push(`coverage.${section}.captures must be an array`);
    }
    if (!Array.isArray(evidence?.coverage?.[section]?.interactions)) {
      errors.push(`coverage.${section}.interactions must be an array`);
    }
  }
  for (const [index, capture] of (evidence?.captures ?? []).entries()) {
    if (
      typeof capture.id !== 'string' ||
      typeof capture.routeId !== 'string' ||
      typeof capture.screenshotPath !== 'string'
    ) {
      errors.push(`captures[${index}] requires string id and routeId`);
    }
    if (
      !Number.isFinite(capture.viewport?.width) ||
      !Number.isFinite(capture.viewport?.height)
    ) {
      errors.push(
        `captures[${index}].viewport requires numeric width and height`,
      );
    }
    for (const property of [
      'scrollWidth',
      'clientWidth',
      'scrollHeight',
      'clientHeight',
    ]) {
      if (!Number.isFinite(capture.document?.[property])) {
        errors.push(`captures[${index}].document.${property} must be numeric`);
      }
    }
    if (!Array.isArray(capture.elements)) {
      errors.push(`captures[${index}].elements must be an array`);
    }
    if (
      capture.contentHash !== undefined &&
      !/^sha256:[a-f0-9]{64}$/u.test(capture.contentHash)
    ) {
      errors.push(`captures[${index}].contentHash must be a SHA-256 hash`);
    }
    if (
      capture.nativeDimensions !== undefined &&
      (!Number.isInteger(capture.nativeDimensions.width) ||
        capture.nativeDimensions.width < 1 ||
        !Number.isInteger(capture.nativeDimensions.height) ||
        capture.nativeDimensions.height < 1 ||
        !['png', 'jpeg', 'gif', 'webp'].includes(
          capture.nativeDimensions.format,
        ))
    ) {
      errors.push(`captures[${index}].nativeDimensions is invalid`);
    }
    if (evidence?.auditContractVersion === auditContractVersion) {
      if (!capture.contentHash)
        errors.push(
          `captures[${index}].contentHash is required for Audit Contract 2.0`,
        );
      if (!capture.nativeDimensions)
        errors.push(
          `captures[${index}].nativeDimensions is required for Audit Contract 2.0`,
        );
    }
  }
  for (const [index, interaction] of (evidence?.interactions ?? []).entries()) {
    for (const property of [
      'id',
      'routeId',
      'flowId',
      'kind',
      'expected',
      'observed',
    ]) {
      if (typeof interaction[property] !== 'string') {
        errors.push(`interactions[${index}].${property} must be a string`);
      }
    }
    if (typeof interaction.passed !== 'boolean') {
      errors.push(`interactions[${index}].passed must be a boolean`);
    }
    if (
      interaction.checkRefs !== undefined &&
      (!Array.isArray(interaction.checkRefs) ||
        interaction.checkRefs.some((ref) => typeof ref !== 'string'))
    ) {
      errors.push(
        `interactions[${index}].checkRefs must be an array of strings`,
      );
    }
  }
  for (const [index, message] of (evidence?.consoleMessages ?? []).entries()) {
    if (
      !consoleLevels.has(message.level) ||
      typeof message.routeId !== 'string' ||
      typeof message.message !== 'string'
    ) {
      errors.push(`consoleMessages[${index}] is invalid`);
    }
  }
  for (const [index, check] of (
    evidence?.accessibilityChecks ?? []
  ).entries()) {
    if (
      typeof check.id !== 'string' ||
      typeof check.routeId !== 'string' ||
      typeof check.expected !== 'string' ||
      typeof check.observed !== 'string' ||
      typeof check.passed !== 'boolean'
    ) {
      errors.push(`accessibilityChecks[${index}] is invalid`);
    }
    if (
      check.checkRefs !== undefined &&
      (!Array.isArray(check.checkRefs) ||
        check.checkRefs.some((ref) => typeof ref !== 'string'))
    ) {
      errors.push(
        `accessibilityChecks[${index}].checkRefs must be an array of strings`,
      );
    }
  }
  for (const [index, measurement] of (
    evidence?.fidelityMeasurements ?? []
  ).entries()) {
    if (
      typeof measurement.id !== 'string' ||
      typeof measurement.checkRef !== 'string' ||
      typeof measurement.captureRef !== 'string' ||
      typeof measurement.target !== 'string' ||
      typeof measurement.property !== 'string' ||
      typeof measurement.unit !== 'string' ||
      !['string', 'number', 'boolean'].includes(typeof measurement.value) ||
      (typeof measurement.value === 'number' &&
        !Number.isFinite(measurement.value)) ||
      !Array.isArray(measurement.limitations) ||
      measurement.limitations.some((item) => typeof item !== 'string') ||
      !measurement.provenance ||
      typeof measurement.provenance !== 'object' ||
      Array.isArray(measurement.provenance)
    ) {
      errors.push(`fidelityMeasurements[${index}] is invalid`);
    }
  }
  for (const [index, observation] of (
    evidence?.perceptualObservations ?? []
  ).entries()) {
    if (
      typeof observation.id !== 'string' ||
      typeof observation.aspect !== 'string' ||
      typeof observation.statement !== 'string' ||
      !['observed', 'inferred', 'proposed', 'unknown'].includes(
        observation.epistemicStatus,
      ) ||
      !['passed', 'failed', 'incomplete'].includes(observation.result) ||
      !Number.isFinite(observation.certainty) ||
      observation.certainty < 0 ||
      observation.certainty > 1 ||
      observation.provenance?.evaluator !== 'host-agent' ||
      !Array.isArray(observation.limitations) ||
      observation.limitations.some((item) => typeof item !== 'string')
    ) {
      errors.push(`perceptualObservations[${index}] is invalid`);
    }
    if (
      observation.checkRef !== undefined &&
      (typeof observation.checkRef !== 'string' ||
        observation.checkRef.trim() === '')
    ) {
      errors.push(`perceptualObservations[${index}].checkRef must be a string`);
    }
  }
  if (
    plan &&
    evidence.coverage &&
    Array.isArray(evidence.captures) &&
    Array.isArray(evidence.interactions) &&
    ['expected', 'actual', 'missing'].every(
      (section) =>
        Array.isArray(evidence.coverage[section]?.captures) &&
        Array.isArray(evidence.coverage[section]?.interactions),
    )
  ) {
    const expectedCoverage = coverageForRecords(
      plan,
      evidence.captures,
      evidence.interactions,
    );
    const plannedCaptureKeys = new Set(
      expectedCoverage.expected.captures.map((capture) =>
        captureKey(
          capture.routeId,
          capture.viewport,
          capture.scenario,
          capture.direction,
        ),
      ),
    );
    const plannedInteractionKeys = new Set(
      expectedCoverage.expected.interactions.map(
        (interaction) => `${interaction.routeId}:${interaction.flowId}`,
      ),
    );
    const seenCaptureIds = new Set();
    const seenCaptureContexts = new Set();
    for (const [index, capture] of evidence.captures.entries()) {
      const key = captureKey(
        capture.routeId,
        capture.viewport,
        capture.scenario,
        capture.direction,
      );
      if (!plannedCaptureKeys.has(key))
        errors.push(`captures[${index}] is outside the audit plan`);
      if (seenCaptureIds.has(capture.id))
        errors.push(`captures[${index}] duplicates capture ID ${capture.id}`);
      seenCaptureIds.add(capture.id);
      if (seenCaptureContexts.has(key))
        errors.push(`captures[${index}] duplicates target context ${key}`);
      seenCaptureContexts.add(key);
    }
    for (const [index, interaction] of evidence.interactions.entries()) {
      const key = `${interaction.routeId}:${interaction.flowId}`;
      if (!plannedInteractionKeys.has(key))
        errors.push(`interactions[${index}] is outside the audit plan`);
    }
    if (
      coverageSignature(evidence.coverage) !==
      coverageSignature(expectedCoverage)
    )
      errors.push(
        'coverage does not match the recorded captures and interactions',
      );
  }
  if (errors.length > 0) {
    throw new DesignomeError('Audit evidence is invalid or incompatible', {
      code:
        evidence?.schemaVersion && evidence.schemaVersion !== '1.0.0'
          ? 'INCOMPATIBLE_AUDIT_EVIDENCE_VERSION'
          : 'INVALID_AUDIT_EVIDENCE',
      details: errors,
    });
  }
  return evidence;
}

export function createCaptureSession(plan, options = {}) {
  return new CaptureSession(plan, options);
}

export async function loadCaptureEvidence(filePath) {
  const evidence = JSON.parse(await fs.readFile(filePath, 'utf8'));
  return validateAuditEvidence(evidence);
}
