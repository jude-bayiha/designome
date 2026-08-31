import { DesignomeError } from './errors.mjs';
import { jsonText, sha256 } from './files.mjs';

function normalizeRoute(route) {
  return {
    ...route,
    scenarios: route.scenarios ?? ['default'],
    directions: route.directions ?? ['ltr'],
  };
}

export function migrateAuditConfig(config) {
  if (config?.schemaVersion === '1.0.0') return config;
  if (config?.schemaVersion !== '0.1.0') {
    throw new DesignomeError('Audit config schema version is incompatible', {
      code: 'INCOMPATIBLE_AUDIT_CONFIG_VERSION',
      details: {
        received: config?.schemaVersion ?? null,
        supported: ['0.1.0', '1.0.0'],
      },
    });
  }
  return {
    ...config,
    schemaVersion: '1.0.0',
    layers: {
      installation: true,
      mechanical: true,
      perceptual: true,
      usage: true,
    },
    routes: config.routes.map(normalizeRoute),
    migratedFrom: '0.1.0',
  };
}

function expectedCoverage(plan) {
  const captures = [];
  const interactions = [];
  for (const rawRoute of plan.routes) {
    const route = normalizeRoute(rawRoute);
    for (const viewport of route.viewports) {
      for (const scenario of route.scenarios) {
        for (const direction of route.directions) {
          captures.push({ routeId: route.id, viewport, scenario, direction });
        }
      }
    }
    for (const flowId of route.flows ?? [])
      interactions.push({ routeId: route.id, flowId });
  }
  return { captures, interactions };
}

function key(item) {
  return `${item.routeId}:${item.viewport.width}x${item.viewport.height}:${item.scenario}:${item.direction}`;
}

function coverageFor(plan, captures, interactions) {
  const expected = expectedCoverage(plan);
  const actualCaptureKeys = new Set(captures.map(key));
  const actualInteractionKeys = new Set(
    interactions.map((item) => `${item.routeId}:${item.flowId}`),
  );
  const missingCaptures = expected.captures.filter(
    (item) => !actualCaptureKeys.has(key(item)),
  );
  const missingInteractions = expected.interactions.filter(
    (item) => !actualInteractionKeys.has(`${item.routeId}:${item.flowId}`),
  );
  return {
    complete: missingCaptures.length === 0 && missingInteractions.length === 0,
    expected,
    actual: {
      captures: captures.map(({ routeId, viewport, scenario, direction }) => ({
        routeId,
        viewport,
        scenario,
        direction,
      })),
      interactions: interactions.map(({ routeId, flowId }) => ({
        routeId,
        flowId,
      })),
    },
    missing: { captures: missingCaptures, interactions: missingInteractions },
  };
}

export function migrateAuditEvidence(evidence, plan) {
  if (evidence?.schemaVersion === '1.0.0') return evidence;
  if (evidence?.schemaVersion !== '0.1.0') {
    throw new DesignomeError('Audit evidence schema version is incompatible', {
      code: 'INCOMPATIBLE_AUDIT_EVIDENCE_VERSION',
      details: {
        received: evidence?.schemaVersion ?? null,
        supported: ['0.1.0', '1.0.0'],
      },
    });
  }
  const receivedAt = evidence.generatedAt ?? new Date().toISOString();
  const captures = (evidence.captures ?? []).map((capture) => ({
    ...capture,
    url: capture.url ?? null,
    scenario: capture.scenario ?? 'default',
    direction: capture.direction ?? 'ltr',
    document: {
      scrollHeight: capture.document?.scrollHeight ?? 0,
      clientHeight: capture.document?.clientHeight ?? 0,
      ...capture.document,
      horizontalOverflow:
        capture.document.scrollWidth > capture.document.clientWidth + 1,
    },
    elements: (capture.elements ?? []).map((element) => ({
      ...element,
      hidden: element.hidden ?? !element.visible,
      tokenRefs: element.tokenRefs ?? [],
      ruleRefs: element.ruleRefs ?? [],
    })),
    responsiveChecks: capture.responsiveChecks ?? [],
    recordedAt: capture.recordedAt ?? receivedAt,
  }));
  const interactions = (evidence.interactions ?? []).map((interaction) => ({
    ...interaction,
    kind: interaction.kind === 'modal' ? 'dialog' : interaction.kind,
    flowId: interaction.flowId ?? interaction.id,
    observed: interaction.observed ?? interaction.actual,
    urlBefore: interaction.urlBefore ?? null,
    urlAfter: interaction.urlAfter ?? null,
    urlChanged: interaction.urlChanged ?? false,
    disclosure: interaction.disclosure ?? null,
    dialog: interaction.dialog ?? null,
    focus: interaction.focus ?? null,
    ruleRefs: interaction.ruleRefs ?? [],
    recordedAt: interaction.recordedAt ?? receivedAt,
  }));
  const normalizedPlan = {
    schemaVersion: plan.schemaVersion,
    baseUrl: plan.baseUrl,
    routes: plan.routes.map(normalizeRoute),
  };
  return {
    schemaVersion: '1.0.0',
    generatedAt: receivedAt,
    adapter: {
      name: '@designome/legacy-evidence-migration',
      version: '1.0.0',
      evidenceSchemaVersion: '1.0.0',
      migratedFrom: '0.1.0',
    },
    plan: {
      schemaVersion: plan.schemaVersion,
      fingerprint: sha256(jsonText(normalizedPlan)),
    },
    provider: {
      name:
        evidence.provider?.selected ??
        evidence.provider?.name ??
        plan.provider.selected,
      kind: 'external',
      executionOwner: evidence.provider?.executionOwner ?? 'host-agent',
      status: 'evidence-received',
      receivedAt,
    },
    coverage: coverageFor(normalizedPlan, captures, interactions),
    captures,
    interactions,
    consoleMessages: (
      evidence.consoleMessages ??
      evidence.consoleErrors ??
      []
    ).map((message) => ({
      ...message,
      level: message.level ?? 'error',
      source: message.source ?? 'browser-console',
      recordedAt: message.recordedAt ?? receivedAt,
    })),
    accessibilityChecks: (evidence.accessibilityChecks ?? []).map((check) => ({
      ...check,
      observed: check.observed ?? check.actual,
      accessibleName: check.accessibleName ?? null,
      accessibleRole: check.accessibleRole ?? null,
      accessibleState: check.accessibleState ?? null,
      ruleRefs: check.ruleRefs ?? [],
      recordedAt: check.recordedAt ?? receivedAt,
    })),
    perceptualObservations: evidence.perceptualObservations ?? [],
  };
}
