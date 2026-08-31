import fs from 'node:fs/promises';
import path from 'node:path';

import { DesignomeError } from './errors.mjs';
import {
  atomicWrite,
  jsonText,
  pathExists,
  sha256,
  toPosixPath,
} from './files.mjs';

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
  return {
    schemaVersion: plan.schemaVersion ?? '1.0.0',
    baseUrl: plan.baseUrl,
    projectRoot: plan.projectRoot ?? null,
    routes: plan.routes.map(normalizedRoute),
    perceptual: plan.perceptual ?? null,
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
    requireObject(observation.document, 'capture.document');
    for (const key of [
      'scrollWidth',
      'clientWidth',
      'scrollHeight',
      'clientHeight',
    ]) {
      requireFinite(observation.document[key], `capture.document.${key}`);
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
    const normalized = {
      ...observation,
      accessibleName: observation.accessibleName ?? null,
      accessibleRole: observation.accessibleRole ?? null,
      accessibleState: observation.accessibleState ?? null,
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
    const normalized = {
      ...observation,
      provenance: {
        evaluator: 'host-agent',
        method: 'multimodal-comparison',
        ...(observation.provenance ?? {}),
      },
      sourceCaptureRefs: [...new Set(observation.sourceCaptureRefs ?? [])],
      targetCaptureRefs: [...new Set(observation.targetCaptureRefs ?? [])],
      ruleRefs: [...new Set(observation.ruleRefs ?? [])],
      tokenRefs: [...new Set(observation.tokenRefs ?? [])],
      limitations: [...new Set(observation.limitations ?? [])],
      recordedAt: observation.recordedAt ?? new Date().toISOString(),
    };
    this.perceptualObservations.push(normalized);
    return normalized;
  }

  coverage() {
    const expected = expectedCoverage(this.plan);
    const actualCaptureKeys = new Set(
      this.captures.map((capture) =>
        captureKey(
          capture.routeId,
          capture.viewport,
          capture.scenario,
          capture.direction,
        ),
      ),
    );
    const actualInteractionKeys = new Set(
      this.interactions.map(
        (interaction) => `${interaction.routeId}:${interaction.flowId}`,
      ),
    );
    const missingCaptures = expected.captures.filter(
      (item) =>
        !actualCaptureKeys.has(
          captureKey(
            item.routeId,
            item.viewport,
            item.scenario,
            item.direction,
          ),
        ),
    );
    const missingInteractions = expected.interactions.filter(
      (item) => !actualInteractionKeys.has(`${item.routeId}:${item.flowId}`),
    );
    return {
      complete:
        missingCaptures.length === 0 && missingInteractions.length === 0,
      expected,
      actual: {
        captures: this.captures.map((capture) => ({
          routeId: capture.routeId,
          viewport: capture.viewport,
          scenario: capture.scenario,
          direction: capture.direction,
        })),
        interactions: this.interactions.map((interaction) => ({
          routeId: interaction.routeId,
          flowId: interaction.flowId,
        })),
      },
      missing: {
        captures: missingCaptures,
        interactions: missingInteractions,
      },
    };
  }

  async finalize({
    allowIncomplete = false,
    outputPath = this.outputPath,
  } = {}) {
    this.assertOpen();
    const coverage = this.coverage();
    if (!coverage.complete && !allowIncomplete) {
      throw new DesignomeError('Browser evidence is incomplete', {
        code: 'INCOMPLETE_AUDIT_EVIDENCE',
        details: coverage.missing,
      });
    }
    const receivedAt = new Date().toISOString();
    const planFingerprint = sha256(
      jsonText({
        schemaVersion: this.plan.schemaVersion,
        baseUrl: this.plan.baseUrl,
        routes: this.plan.routes,
      }),
    );
    const evidence = {
      schemaVersion: '1.0.0',
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
    };
    validateAuditEvidence(evidence);
    if (outputPath) {
      await atomicWrite(path.resolve(outputPath), jsonText(evidence));
    }
    this.finalized = true;
    return evidence;
  }
}

export function validateAuditEvidence(evidence) {
  const errors = [];
  if (evidence?.schemaVersion !== '1.0.0') {
    errors.push('schemaVersion must be 1.0.0');
  }
  if (evidence?.adapter?.evidenceSchemaVersion !== '1.0.0') {
    errors.push('adapter.evidenceSchemaVersion must be 1.0.0');
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
    if (typeof capture.id !== 'string' || typeof capture.routeId !== 'string') {
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
      !Array.isArray(observation.limitations)
    ) {
      errors.push(`perceptualObservations[${index}] is invalid`);
    }
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
