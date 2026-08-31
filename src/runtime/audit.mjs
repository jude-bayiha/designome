import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { assertValidDesignDna } from './design-dna.mjs';
import {
  assertLayerStatuses,
  overallLayerStatus,
  transitionProvider,
} from './audit-state.mjs';
import { validateAuditEvidence } from './capture-session.mjs';
import { DesignomeError } from './errors.mjs';
import {
  atomicWrite,
  jsonText,
  pathExists,
  readJson,
  readTextIfExists,
  relativeInside,
  resolveProjectPath,
  sha256,
  toPosixPath,
} from './files.mjs';
import { verifyInstallation } from './install.mjs';
import { migrateAuditConfig, migrateAuditEvidence } from './migrations.mjs';

const defaultConfigPath = '.designome/audit.config.json';
const providerNames = new Set([
  'auto',
  'in-app-browser',
  'existing-playwright',
  'managed-playwright',
  'static',
]);

async function assertProjectRoot(projectPath) {
  const requested = path.resolve(projectPath);
  const resolved = await fs.realpath(requested).catch(() => requested);
  if (
    resolved === path.parse(resolved).root ||
    resolved === path.resolve(os.homedir())
  ) {
    throw new DesignomeError('Refusing to audit a broad filesystem path', {
      code: 'UNSAFE_TARGET_PROJECT',
    });
  }
  if (!(await pathExists(path.join(resolved, 'package.json')))) {
    throw new DesignomeError('Audit target must contain package.json', {
      code: 'INVALID_TARGET_PROJECT',
    });
  }
  return resolved;
}

function validateConfig(config) {
  const errors = [];
  if (config?.schemaVersion !== '1.0.0')
    errors.push('schemaVersion must be 1.0.0 after migration');
  if (typeof config?.baseUrl !== 'string' || config.baseUrl.length === 0)
    errors.push('baseUrl must be a non-empty string');
  if (!Array.isArray(config?.routes) || config.routes.length === 0)
    errors.push('routes must contain at least one route');
  for (const [index, route] of (config?.routes ?? []).entries()) {
    if (typeof route.id !== 'string' || route.id.length === 0)
      errors.push(`routes[${index}].id must be a non-empty string`);
    if (typeof route.path !== 'string' || !route.path.startsWith('/'))
      errors.push(`routes[${index}].path must start with /`);
    if (!Array.isArray(route.viewports) || route.viewports.length === 0)
      errors.push(`routes[${index}].viewports must not be empty`);
    if (!Array.isArray(route.scenarios) || route.scenarios.length === 0)
      errors.push(`routes[${index}].scenarios must not be empty`);
    if (!Array.isArray(route.directions) || route.directions.length === 0)
      errors.push(`routes[${index}].directions must not be empty`);
    for (const [viewportIndex, viewport] of (route.viewports ?? []).entries()) {
      if (
        !Number.isInteger(viewport.width) ||
        viewport.width < 240 ||
        !Number.isInteger(viewport.height) ||
        viewport.height < 240
      ) {
        errors.push(
          `routes[${index}].viewports[${viewportIndex}] must use integer dimensions of at least 240`,
        );
      }
    }
  }
  for (const layer of ['installation', 'mechanical', 'perceptual', 'usage']) {
    if (typeof config?.layers?.[layer] !== 'boolean') {
      errors.push(`layers.${layer} must be a boolean`);
    }
  }
  return errors;
}

async function detectExistingPlaywright(projectRoot, packageJson) {
  const dependencies = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };
  const configCandidates = [
    'playwright.config.js',
    'playwright.config.mjs',
    'playwright.config.cjs',
    'playwright.config.ts',
  ];
  const configs = [];
  for (const candidate of configCandidates) {
    if (await pathExists(path.join(projectRoot, candidate)))
      configs.push(candidate);
  }
  const dependency = dependencies['@playwright/test']
    ? '@playwright/test'
    : dependencies.playwright
      ? 'playwright'
      : null;
  return {
    available: Boolean(dependency || configs.length),
    dependency,
    configs,
  };
}

async function resolveProvider(
  projectRoot,
  requestedProvider,
  packageJson,
  browserInstallAuthorized,
) {
  if (!providerNames.has(requestedProvider)) {
    throw new DesignomeError(`Unknown audit provider: ${requestedProvider}`, {
      code: 'INVALID_AUDIT_PROVIDER',
    });
  }
  const playwright = await detectExistingPlaywright(projectRoot, packageJson);
  const selected =
    requestedProvider === 'auto'
      ? playwright.available
        ? 'existing-playwright'
        : 'static'
      : requestedProvider;
  if (selected === 'existing-playwright' && !playwright.available) {
    throw new DesignomeError(
      'The target project does not expose an existing Playwright installation',
      { code: 'AUDIT_PROVIDER_UNAVAILABLE' },
    );
  }
  if (selected === 'managed-playwright') {
    return {
      requested: requestedProvider,
      selected,
      status: 'provider-unavailable',
      executionOwner: 'designome',
      reason: browserInstallAuthorized
        ? 'Managed Playwright setup is authorized for a separate reviewed step; this audit command does not mutate dependencies.'
        : 'Managed Playwright requires explicit dependency authorization.',
      setupProposal: browserInstallAuthorized
        ? {
            epistemicStatus: 'proposed',
            package: '@playwright/test',
            browser: 'chromium',
          }
        : null,
      playwright,
      transitions: [],
    };
  }
  if (selected === 'in-app-browser') {
    return {
      requested: requestedProvider,
      selected,
      status: 'awaiting-evidence',
      executionOwner: 'host-agent',
      reason:
        'The host agent must execute browser captures and write evidence; the CLI cannot control the in-app browser.',
      playwright,
      transitions: [],
    };
  }
  return {
    requested: requestedProvider,
    selected,
    status: selected === 'static' ? 'not-requested' : 'awaiting-evidence',
    executionOwner:
      selected === 'existing-playwright' ? 'target-project' : 'designome',
    reason:
      selected === 'existing-playwright'
        ? 'The target project already exposes Playwright configuration or dependencies.'
        : 'No rendered-browser provider was selected; the audit is static-only.',
    playwright,
    transitions: [],
  };
}

function reportMarkdown(report) {
  const layerLabels = {
    installation: 'Installation',
    mechanical: 'Mechanical audit',
    perceptual: 'Host-agent perceptual audit',
    usage: 'Usage audit',
  };
  return [
    '# Designome audit',
    '',
    `Design DNA: \`${report.designDna.documentId}\` revision ${report.designDna.revision}.`,
    `Overall status: **${report.overallStatus}**.`,
    '',
    '## Canonical provider state',
    '',
    `- Provider: \`${report.provider.name}\``,
    `- Status: **${report.provider.status}**`,
    `- Evidence received: ${report.provider.receivedAt ?? 'no'}`,
    `- Covered routes: ${report.provider.coveredRoutes.length > 0 ? report.provider.coveredRoutes.map((route) => `\`${route}\``).join(', ') : 'none'}`,
    `- Covered viewports: ${report.provider.coveredViewports.length > 0 ? report.provider.coveredViewports.join(', ') : 'none'}`,
    '',
    '## Independent audit layers',
    '',
    ...Object.entries(report.layers).map(
      ([layer, value]) =>
        `- ${layerLabels[layer]}: **${value.status}** — ${value.summary}`,
    ),
    '',
    '## Evidence boundaries',
    '',
    `- Automatically verified: ${report.evidenceBoundaries.automatic.join('; ') || 'nothing'}.`,
    `- Observed in a browser: ${report.evidenceBoundaries.browser.join('; ') || 'nothing'}.`,
    `- Evaluated by the host agent: ${report.evidenceBoundaries.hostAgent.join('; ') || 'nothing'}.`,
    `- Not verified: ${report.evidenceBoundaries.unverified.join('; ') || 'nothing'}.`,
    '',
    '## Results',
    '',
    `- Certain observed findings: ${report.results.observedFindingCount}`,
    `- Proposed calibration candidates requiring human validation: ${report.results.proposalCount}`,
    `- Missing captures: ${report.coverage.missing.captures.length}`,
    `- Missing interactions: ${report.coverage.missing.interactions.length}`,
    '',
    ...report.limitations.map((limitation) => `- Limitation: ${limitation}`),
    '',
  ].join('\n');
}

function findingFactory() {
  let findingIndex = 0;
  let calibrationIndex = 0;
  return {
    finding(values) {
      findingIndex += 1;
      return {
        id: `finding.${String(findingIndex).padStart(3, '0')}`,
        epistemicStatus: 'observed',
        certainty: 1,
        ...values,
      };
    },
    calibration(values) {
      calibrationIndex += 1;
      return {
        id: `calibration.${String(calibrationIndex).padStart(3, '0')}`,
        epistemicStatus: 'proposed',
        acceptanceRequired: true,
        ...values,
      };
    },
  };
}

function tokenExpectation(dna, tokenRef) {
  const token = dna.tokens.find((candidate) => candidate.id === tokenRef);
  if (!token || token.category !== 'typography') return null;
  if (token.value.kind === 'exact' && Number.isFinite(token.value.value)) {
    return { token, minimum: token.value.value, maximum: token.value.value };
  }
  if (token.value.kind === 'range') {
    return {
      token,
      minimum: token.value.minimum,
      maximum: token.value.maximum,
    };
  }
  return null;
}

export function evaluateAuditEvidence({ dna, evidence }) {
  validateAuditEvidence(evidence);
  const factory = findingFactory();
  const findings = [];
  const calibrationCandidates = [];
  for (const capture of evidence.captures) {
    const captureScope = `${capture.routeId} at ${capture.viewport.width}x${capture.viewport.height}`;
    if (capture.document.scrollWidth > capture.document.clientWidth + 1) {
      findings.push(
        factory.finding({
          kind: 'mechanical-risk',
          layer: 'mechanical',
          severity: 'high',
          scope: captureScope,
          ruleRef: 'mechanical.global-horizontal-overflow',
          evidence: `Document scroll width ${capture.document.scrollWidth}px exceeds client width ${capture.document.clientWidth}px.`,
          suggestedCorrection:
            'Remove global overflow and keep intentional overflow inside an explicit local scroller.',
          verificationMethod:
            'Repeat the capture and require document scrollWidth to equal clientWidth within one pixel.',
        }),
      );
    }
    for (const element of capture.elements) {
      const scope = `${captureScope}, element ${element.id}`;
      if (
        ['action', 'label', 'status'].includes(element.role) &&
        (!element.visible || element.clipped)
      ) {
        findings.push(
          factory.finding({
            kind: 'mechanical-risk',
            layer: 'mechanical',
            severity: element.role === 'action' ? 'high' : 'medium',
            scope,
            ruleRef: 'mechanical.essential-content-clipping',
            evidence: `${element.role} is ${element.visible ? 'visible but clipped' : 'not visible'}.`,
            suggestedCorrection:
              'Preserve the essential control or content through wrapping, reflow, or an intentional local overflow strategy.',
            verificationMethod:
              'Recapture the same viewport and require the element to be visible and unclipped.',
          }),
        );
      }
      if (element.role === 'avatar') {
        const ratio =
          element.rect.height === 0
            ? Number.POSITIVE_INFINITY
            : element.rect.width / element.rect.height;
        if (Math.abs(1 - ratio) > 0.05) {
          findings.push(
            factory.finding({
              kind: 'mechanical-risk',
              layer: 'mechanical',
              severity: 'medium',
              scope,
              ruleRef: 'mechanical.avatar-stable-geometry',
              evidence: `Avatar measures ${element.rect.width}x${element.rect.height}px.`,
              suggestedCorrection:
                'Use stable square geometry and prevent flex or grid stretching.',
              verificationMethod:
                'Recapture and require the avatar width-to-height ratio to remain within five percent of one.',
            }),
          );
        }
        if (element.flexShrink !== undefined && element.flexShrink !== 0) {
          findings.push(
            factory.finding({
              kind: 'mechanical-risk',
              layer: 'mechanical',
              severity: 'medium',
              scope,
              ruleRef: 'mechanical.avatar-flex-shrink',
              evidence: `Computed flex-shrink is ${element.flexShrink}.`,
              suggestedCorrection:
                'Prevent the avatar from shrinking inside flexible rows.',
              verificationMethod:
                'Require computed flex-shrink zero at every configured viewport.',
            }),
          );
        }
        const centeringValues = [
          element.alignItems,
          element.justifyContent,
          element.textAlign,
        ].filter((value) => value !== undefined);
        if (
          centeringValues.length > 0 &&
          centeringValues.some((value) => value !== 'center')
        ) {
          findings.push(
            factory.finding({
              kind: 'mechanical-risk',
              layer: 'mechanical',
              severity: 'low',
              scope,
              ruleRef: 'mechanical.avatar-optical-centering',
              evidence: `Computed centering values are ${centeringValues.join(', ')}.`,
              suggestedCorrection:
                'Center fallback initials on both axes and use a stable line height.',
              verificationMethod:
                'Require centered alignment and visually inspect one-to-three-initial fallbacks.',
            }),
          );
        }
      }
      if (Number.isFinite(element.fontSize)) {
        for (const tokenRef of element.tokenRefs ?? []) {
          const expectation = tokenExpectation(dna, tokenRef);
          if (
            !expectation ||
            (element.fontSize >= expectation.minimum &&
              element.fontSize <= expectation.maximum)
          ) {
            continue;
          }
          const evidenceText = `Computed font size ${element.fontSize}px is outside ${tokenRef} bounds ${expectation.minimum}-${expectation.maximum}px.`;
          if (
            ['observed', 'inferred'].includes(
              expectation.token.claim.epistemicStatus,
            )
          ) {
            findings.push(
              factory.finding({
                kind: 'design-deviation',
                layer: 'mechanical',
                severity: 'medium',
                scope,
                ruleRef: tokenRef,
                evidence: evidenceText,
                suggestedCorrection:
                  'Use the accepted typography bounds for this semantic role.',
                verificationMethod:
                  'Repeat the computed-style audit after the scoped typography change.',
              }),
            );
          } else {
            calibrationCandidates.push(
              factory.calibration({
                layer: 'mechanical',
                scope,
                evidence: evidenceText,
                proposal: `Review and explicitly accept or reject ${tokenRef} as an enforceable typography bound.`,
              }),
            );
          }
        }
        const proposedFloor =
          element.role === 'table-primary-text'
            ? 13
            : ['table-metadata', 'status'].includes(element.role)
              ? 11
              : null;
        if (
          proposedFloor !== null &&
          element.fontSize < proposedFloor &&
          (element.tokenRefs ?? []).length === 0
        ) {
          calibrationCandidates.push(
            factory.calibration({
              scope,
              layer: 'mechanical',
              evidence: `${element.role} computed font size is ${element.fontSize}px.`,
              proposal: `Consider an accepted readability floor of ${proposedFloor}px for ${element.role}.`,
            }),
          );
        }
      }
      if (
        element.role === 'section' &&
        Number.isFinite(element.gapBefore) &&
        Number.isFinite(element.panelPadding) &&
        element.gapBefore < element.panelPadding
      ) {
        calibrationCandidates.push(
          factory.calibration({
            scope,
            layer: 'mechanical',
            evidence: `Major gap ${element.gapBefore}px is smaller than panel padding ${element.panelPadding}px.`,
            proposal:
              'Consider accepting a relationship that major section gaps are at least as large as internal panel padding.',
          }),
        );
      }
    }
  }
  for (const interaction of evidence.interactions) {
    if (interaction.passed) continue;
    findings.push(
      factory.finding({
        kind: 'mechanical-risk',
        layer: 'usage',
        severity: ['navigation', 'dialog', 'selection'].includes(
          interaction.kind,
        )
          ? 'high'
          : 'medium',
        scope: `${interaction.routeId}, interaction ${interaction.id}`,
        ruleRef: interaction.ruleRefs?.[0] ?? `interaction.${interaction.kind}`,
        evidence: `Expected ${interaction.expected}; observed ${interaction.observed}.`,
        suggestedCorrection:
          'Restore the observable interaction outcome and its programmatic state.',
        verificationMethod: `Repeat the ${interaction.kind} flow and require the expected state transition.`,
      }),
    );
  }
  for (const error of evidence.consoleMessages) {
    findings.push(
      factory.finding({
        kind: 'mechanical-risk',
        layer: 'mechanical',
        severity: error.level === 'error' ? 'high' : 'medium',
        scope: `${error.routeId}, browser console`,
        ruleRef: 'mechanical.console-error-free',
        evidence: error.message,
        suggestedCorrection:
          'Resolve the runtime error without suppressing unrelated diagnostics.',
        verificationMethod:
          'Reload the route and repeat configured flows with no console or page errors.',
      }),
    );
  }
  for (const check of evidence.accessibilityChecks) {
    if (check.passed) continue;
    findings.push(
      factory.finding({
        kind: 'mechanical-risk',
        layer: 'usage',
        severity: 'high',
        scope: `${check.routeId}, accessibility check ${check.id}`,
        ruleRef: check.ruleRefs?.[0] ?? 'mechanical.accessibility-semantics',
        evidence: `Expected ${check.expected}; observed ${check.observed}.`,
        suggestedCorrection:
          'Restore the expected accessible name, state, focus behavior, or semantic relationship.',
        verificationMethod:
          'Repeat the same keyboard or accessibility-tree assertion.',
      }),
    );
  }
  for (const observation of evidence.perceptualObservations) {
    if (
      observation.result === 'failed' &&
      ['observed', 'inferred'].includes(observation.epistemicStatus)
    ) {
      findings.push(
        factory.finding({
          kind: 'perceptual-deviation',
          layer: 'perceptual',
          severity: observation.severity ?? 'medium',
          scope: observation.scope ?? observation.aspect,
          ruleRef:
            observation.ruleRefs?.[0] ?? `perceptual.${observation.aspect}`,
          evidence: observation.statement,
          certainty: observation.certainty,
          epistemicStatus: observation.epistemicStatus,
          provenance: observation.provenance,
          limitations: observation.limitations,
          suggestedCorrection:
            observation.suggestedCorrection ??
            'Review the target implementation against the referenced source capture and accepted Design DNA.',
          verificationMethod:
            'Ask the host agent to repeat the multimodal comparison with the affected captures.',
        }),
      );
    }
    if (observation.epistemicStatus === 'proposed') {
      calibrationCandidates.push(
        factory.calibration({
          layer: 'perceptual',
          scope: observation.scope ?? observation.aspect,
          evidence: observation.statement,
          proposal:
            observation.suggestedCorrection ??
            'Review this host-agent proposal before changing the accepted Design DNA.',
        }),
      );
    }
  }
  return { findings, calibrationCandidates };
}

const perceptualAspects = [
  'visual-hierarchy',
  'density',
  'composition',
  'proportions',
  'spatial-rhythm',
  'contrast-and-palette',
  'surface-shape',
  'component-fidelity',
  'cross-screen-coherence',
];

function expectedCoverage(plan) {
  const captures = [];
  const interactions = [];
  for (const route of plan.routes) {
    for (const viewport of route.viewports) {
      for (const scenario of route.scenarios) {
        for (const direction of route.directions) {
          captures.push({ routeId: route.id, viewport, scenario, direction });
        }
      }
    }
    for (const flowId of route.flows)
      interactions.push({ routeId: route.id, flowId });
  }
  return { captures, interactions };
}

function emptyCoverage(plan) {
  const expected = expectedCoverage(plan);
  return {
    complete: false,
    expected,
    actual: { captures: [], interactions: [] },
    missing: {
      captures: expected.captures,
      interactions: expected.interactions,
    },
  };
}

function requestedLayer(config, layer) {
  return config.layers[layer] === true;
}

function initialLayerStates(config, provider) {
  const unavailable = ['not-requested', 'provider-unavailable'].includes(
    provider.status,
  );
  return {
    installation: requestedLayer(config, 'installation')
      ? 'passed'
      : 'not-requested',
    mechanical: requestedLayer(config, 'mechanical')
      ? unavailable
        ? 'unavailable'
        : 'incomplete'
      : 'not-requested',
    perceptual: requestedLayer(config, 'perceptual')
      ? unavailable
        ? 'unavailable'
        : 'incomplete'
      : 'not-requested',
    usage: requestedLayer(config, 'usage')
      ? unavailable
        ? 'unavailable'
        : 'incomplete'
      : 'not-requested',
  };
}

function evaluatedLayerStates({ config, evidence, findings }) {
  const failures = new Set(findings.map((finding) => finding.layer));
  const states = {
    installation: requestedLayer(config, 'installation')
      ? 'passed'
      : 'not-requested',
    mechanical: 'not-requested',
    perceptual: 'not-requested',
    usage: 'not-requested',
  };
  if (requestedLayer(config, 'mechanical')) {
    states.mechanical = failures.has('mechanical')
      ? 'failed'
      : evidence.captures.length === 0 ||
          evidence.coverage.missing.captures.length > 0
        ? 'incomplete'
        : 'passed';
  }
  if (requestedLayer(config, 'usage')) {
    const noFlowsConfigured =
      evidence.coverage.expected.interactions.length === 0;
    states.usage = failures.has('usage')
      ? 'failed'
      : noFlowsConfigured || evidence.coverage.missing.interactions.length > 0
        ? 'incomplete'
        : 'passed';
  }
  if (requestedLayer(config, 'perceptual')) {
    const observedAspects = new Set(
      evidence.perceptualObservations.map((observation) => observation.aspect),
    );
    const missingAspects = perceptualAspects.filter(
      (aspect) => !observedAspects.has(aspect),
    );
    states.perceptual = failures.has('perceptual')
      ? 'failed'
      : missingAspects.length > 0 ||
          evidence.perceptualObservations.some(
            (observation) => observation.result === 'incomplete',
          )
        ? 'incomplete'
        : 'passed';
  }
  assertLayerStatuses(states);
  return states;
}

function canonicalLayerReport(statuses, evidence) {
  return {
    installation: {
      status: statuses.installation,
      evidenceOwner: 'designome-runtime',
      summary:
        statuses.installation === 'passed'
          ? 'Accepted Design DNA, manifest, ownership and checksums were verified deterministically.'
          : 'Installation verification was not requested.',
    },
    mechanical: {
      status: statuses.mechanical,
      evidenceOwner: 'designome-runtime-from-browser-measurements',
      summary:
        evidence === null
          ? 'Browser measurements have not been received.'
          : `${evidence.captures.length} rendered capture(s) were evaluated for measurable constraints.`,
    },
    perceptual: {
      status: statuses.perceptual,
      evidenceOwner: 'host-agent',
      summary:
        evidence === null
          ? 'Host-agent perceptual observations have not been received.'
          : `${evidence.perceptualObservations.length} host-agent perceptual observation(s) were recorded; this layer is not deterministic.`,
    },
    usage: {
      status: statuses.usage,
      evidenceOwner: 'host-agent-browser',
      summary:
        evidence === null
          ? 'Interaction and accessibility evidence has not been received.'
          : `${evidence.interactions.length} interaction(s) and ${evidence.accessibilityChecks.length} accessibility check(s) were evaluated.`,
    },
  };
}

function buildCanonicalReport({ dna, plan, provider, evidence, findings }) {
  const coverage = evidence?.coverage ?? emptyCoverage(plan);
  const statuses = evidence
    ? evaluatedLayerStates({
        config: plan.config,
        evidence,
        findings: findings.findings,
      })
    : initialLayerStates(plan.config, provider);
  const overallStatus = overallLayerStatus(statuses);
  const coveredRoutes = [
    ...new Set(coverage.actual.captures.map((capture) => capture.routeId)),
  ].sort();
  const coveredViewports = [
    ...new Set(
      coverage.actual.captures.map(
        (capture) => `${capture.viewport.width}x${capture.viewport.height}`,
      ),
    ),
  ].sort();
  const limitations = [];
  if (coverage.missing.captures.length > 0) {
    limitations.push(
      'Configured route, viewport, scenario, or direction captures are missing.',
    );
  }
  if (coverage.missing.interactions.length > 0) {
    limitations.push('Configured interaction flows are missing.');
  }
  if (statuses.perceptual === 'incomplete') {
    limitations.push(
      'The host-agent perceptual plan was not completely evaluated.',
    );
  }
  if (provider.status === 'provider-unavailable') {
    limitations.push(
      'The selected browser provider was unavailable and no execution was simulated.',
    );
  }
  return {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    designDna: {
      documentId: dna.documentId,
      revision: dna.revision.number,
    },
    overallStatus,
    provider: {
      name: provider.selected,
      status: provider.status,
      executionOwner: provider.executionOwner,
      receivedAt: provider.receivedAt ?? null,
      transitions: provider.transitions ?? [],
      coveredRoutes,
      coveredViewports,
    },
    layers: canonicalLayerReport(statuses, evidence),
    coverage,
    evidenceBoundaries: {
      automatic:
        statuses.installation === 'passed'
          ? ['installation integrity', 'manifest ownership and checksums']
          : [],
      browser: evidence
        ? [
            'rendered captures and document geometry',
            'recorded interactions and accessibility observations',
          ]
        : [],
      hostAgent:
        evidence?.perceptualObservations.length > 0
          ? [
              'perceptual comparison with explicit provenance, certainty, and limitations',
            ]
          : [],
      unverified: Object.entries(statuses)
        .filter(([, status]) =>
          ['incomplete', 'unavailable', 'not-requested'].includes(status),
        )
        .map(([layer, status]) => `${layer}: ${status}`),
    },
    results: {
      observedFindingCount: findings.findings.filter(
        (finding) => finding.epistemicStatus !== 'proposed',
      ).length,
      proposalCount: findings.calibrationCandidates.length,
    },
    limitations,
  };
}

export async function planAudit({
  projectPath,
  configPath = defaultConfigPath,
  outputDirectory,
  provider = 'auto',
  browserInstallAuthorized = false,
}) {
  const projectRoot = await assertProjectRoot(projectPath);
  const resolvedConfig = resolveProjectPath(
    projectRoot,
    configPath,
    '--config',
  );
  const rawConfig = await readJson(resolvedConfig).catch((error) => {
    throw new DesignomeError(`Cannot read audit config: ${configPath}`, {
      code: 'AUDIT_CONFIG_UNREADABLE',
      details: [error.message],
    });
  });
  const config = migrateAuditConfig(rawConfig);
  const configErrors = validateConfig(config);
  if (configErrors.length > 0) {
    throw new DesignomeError('Audit config is invalid', {
      code: 'INVALID_AUDIT_CONFIG',
      details: configErrors,
    });
  }
  const dnaPath = path.join(projectRoot, '.designome', 'design-dna.json');
  const dna = await readJson(dnaPath).catch((error) => {
    throw new DesignomeError('Installed Design DNA is unavailable', {
      code: 'DESIGN_DNA_UNREADABLE',
      details: [error.message],
    });
  });
  await assertValidDesignDna(dna, { requireAccepted: true });
  const installation = await verifyInstallation({ projectPath: projectRoot });
  if (!installation.valid) {
    throw new DesignomeError('Installed Designome artifacts are invalid', {
      code: 'INVALID_INSTALLATION',
      details: installation.errors,
    });
  }
  const packageJson = await readJson(path.join(projectRoot, 'package.json'));
  const providerPlan = await resolveProvider(
    projectRoot,
    provider,
    packageJson,
    browserInstallAuthorized,
  );
  const configuredOutput = outputDirectory ?? config.outputDirectory ?? 'audit';
  const resolvedOutput = resolveProjectPath(
    projectRoot,
    configuredOutput,
    '--output',
  );
  const outputRelative = toPosixPath(
    relativeInside(projectRoot, resolvedOutput, '--output'),
  );
  const createdAt = new Date().toISOString();
  const plan = {
    schemaVersion: '1.0.0',
    createdAt,
    projectRoot,
    configPath: toPosixPath(path.relative(projectRoot, resolvedConfig)),
    outputDirectory: outputRelative,
    baseUrl: config.baseUrl,
    startCommand: config.startCommand ?? null,
    provider: providerPlan,
    config: {
      schemaVersion: config.schemaVersion,
      layers: config.layers,
      migratedFrom: config.migratedFrom ?? null,
    },
    installation: {
      valid: true,
      managedArtifactCount: installation.managedArtifactCount,
    },
    routes: config.routes,
    perceptual: {
      executionOwner: 'host-agent',
      deterministic: false,
      aspects: perceptualAspects,
      sourceCaptures: dna.sources.map((source) => ({
        id: source.id,
        path: source.path,
        contentHash: source.contentHash ?? null,
      })),
      targetCaptures: config.routes.flatMap((route) =>
        route.viewports.flatMap((viewport) =>
          route.scenarios.flatMap((scenario) =>
            route.directions.map((direction) => ({
              routeId: route.id,
              viewport,
              scenario,
              direction,
            })),
          ),
        ),
      ),
      rules: dna.rules.map((rule) => ({
        id: rule.id,
        epistemicStatus: rule.claim.epistemicStatus,
      })),
      tokens: dna.tokens.map((token) => ({
        id: token.id,
        epistemicStatus: token.claim.epistemicStatus,
      })),
      requiredObservationFields: [
        'aspect',
        'statement',
        'epistemicStatus',
        'certainty',
        'provenance',
        'limitations',
        'result',
      ],
    },
    captureAdapter: {
      packageExport: 'designome/audit',
      factory: 'createCaptureSession',
      evidenceSchemaVersion: '1.0.0',
      manualEvidenceAssemblyRequired: false,
    },
  };
  return { projectRoot, outputPath: resolvedOutput, dna, plan };
}

export async function runAudit(options) {
  const mode = options.mode ?? 'report';
  if (!['report', 'repair'].includes(mode)) {
    throw new DesignomeError('Audit mode must be report or repair', {
      code: 'INVALID_AUDIT_MODE',
    });
  }
  const maximumRepairPasses = Number(options.maximumRepairPasses ?? 2);
  if (
    !Number.isInteger(maximumRepairPasses) ||
    maximumRepairPasses < 1 ||
    maximumRepairPasses > 3
  ) {
    throw new DesignomeError('Repair passes must be an integer from 1 to 3', {
      code: 'INVALID_REPAIR_PASSES',
    });
  }
  if (mode === 'repair' && options.implementationAuthorized !== true) {
    throw new DesignomeError(
      'Repair mode requires explicit implementation authorization',
      { code: 'IMPLEMENTATION_AUTHORIZATION_REQUIRED' },
    );
  }
  if (mode === 'repair' && !options.evidencePath) {
    throw new DesignomeError(
      'Repair mode requires evaluated browser evidence',
      {
        code: 'REPAIR_EVIDENCE_REQUIRED',
      },
    );
  }
  const prepared = await planAudit(options);
  if (options.dryRun) return { status: 'ready', ...prepared.plan };
  const existingOutput = await readTextIfExists(
    path.join(prepared.outputPath, 'report.json'),
  );
  if (existingOutput !== null && options.overwrite !== true) {
    throw new DesignomeError(
      'Audit output already exists; choose a new directory or explicitly overwrite it',
      { code: 'AUDIT_OUTPUT_CONFLICT' },
    );
  }
  let evidence = null;
  let providerState = prepared.plan.provider;
  if (options.evidencePath) {
    const resolvedEvidencePath = resolveProjectPath(
      prepared.projectRoot,
      options.evidencePath,
      '--evidence',
    );
    const rawEvidence = await readJson(resolvedEvidencePath).catch((error) => {
      throw new DesignomeError('Cannot read audit evidence', {
        code: 'AUDIT_EVIDENCE_UNREADABLE',
        details: [error.message],
      });
    });
    evidence = migrateAuditEvidence(rawEvidence, prepared.plan);
    validateAuditEvidence(evidence);
    if (providerState.status === 'not-requested') {
      throw new DesignomeError(
        'Evidence cannot be attached to a not-requested provider',
        {
          code: 'AUDIT_PROVIDER_NOT_REQUESTED',
          details: { provider: providerState.selected },
        },
      );
    }
    if (evidence.provider.name !== providerState.selected) {
      throw new DesignomeError(
        'Audit evidence provider does not match the selected provider',
        {
          code: 'AUDIT_EVIDENCE_PROVIDER_MISMATCH',
          details: {
            selectedProvider: providerState.selected,
            evidenceProvider: evidence.provider.name,
          },
        },
      );
    }
    const expectedFingerprint = sha256(
      jsonText({
        schemaVersion: prepared.plan.schemaVersion,
        baseUrl: prepared.plan.baseUrl,
        routes: prepared.plan.routes,
      }),
    );
    if (evidence.plan.fingerprint !== expectedFingerprint) {
      throw new DesignomeError(
        'Audit evidence was captured for a different plan',
        {
          code: 'AUDIT_EVIDENCE_PLAN_MISMATCH',
          details: {
            expectedFingerprint,
            evidenceFingerprint: evidence.plan.fingerprint,
          },
        },
      );
    }
    providerState = transitionProvider(
      providerState,
      'evidence-received',
      evidence.provider.receivedAt,
    );
    providerState = {
      ...providerState,
      receivedAt: evidence.provider.receivedAt,
    };
    providerState = transitionProvider(providerState, 'running');
  }
  const evaluated = evidence
    ? evaluateAuditEvidence({ dna: prepared.dna, evidence })
    : { findings: [], calibrationCandidates: [] };
  const findings = {
    schemaVersion: '1.0.0',
    generatedAt: prepared.plan.createdAt,
    designDna: {
      documentId: prepared.dna.documentId,
      revision: prepared.dna.revision.number,
    },
    findings: evaluated.findings,
    calibrationCandidates: evaluated.calibrationCandidates,
  };
  if (evidence) {
    const provisionalReport = buildCanonicalReport({
      dna: prepared.dna,
      plan: prepared.plan,
      provider: providerState,
      evidence,
      findings,
    });
    const finalProviderStatus =
      provisionalReport.overallStatus === 'failed'
        ? 'failed'
        : provisionalReport.overallStatus === 'incomplete'
          ? 'incomplete'
          : 'passed';
    providerState = transitionProvider(providerState, finalProviderStatus);
  }
  const report = buildCanonicalReport({
    dna: prepared.dna,
    plan: prepared.plan,
    provider: providerState,
    evidence,
    findings,
  });
  await fs.mkdir(prepared.outputPath, { recursive: true });
  await atomicWrite(
    path.join(prepared.outputPath, 'plan.json'),
    jsonText(prepared.plan),
  );
  if (evidence) {
    await atomicWrite(
      path.join(prepared.outputPath, 'evidence.json'),
      jsonText(evidence),
    );
  }
  await atomicWrite(
    path.join(prepared.outputPath, 'findings.json'),
    jsonText(findings),
  );
  await atomicWrite(
    path.join(prepared.outputPath, 'report.json'),
    jsonText(report),
  );
  await atomicWrite(
    path.join(prepared.outputPath, 'report.md'),
    reportMarkdown(report),
  );
  const artifacts = ['plan.json', 'findings.json', 'report.json', 'report.md'];
  if (evidence) artifacts.splice(1, 0, 'evidence.json');
  if (mode === 'repair') {
    const repairPlan = {
      schemaVersion: '0.1.0',
      generatedAt: prepared.plan.createdAt,
      mode: 'repair',
      implementationAuthorized: true,
      maximumPasses: maximumRepairPasses,
      findingRefs: findings.findings.map((finding) => finding.id),
      excludedCalibrationCandidates: findings.calibrationCandidates.map(
        (candidate) => candidate.id,
      ),
      loop: [
        'capture and measure',
        'evaluate findings',
        'apply the smallest implementation-only patch',
        'run target-project checks',
        'recapture the affected routes and interactions',
      ],
      stopConditions: [
        'all scoped observed findings pass',
        'maximum pass count reached',
        'a new authorization or product decision is required',
      ],
      designDnaMutationAllowed: false,
    };
    await atomicWrite(
      path.join(prepared.outputPath, 'repair-plan.json'),
      jsonText(repairPlan),
    );
    artifacts.push('repair-plan.json');
  }
  return {
    status: providerState.status,
    overallStatus: report.overallStatus,
    outputDirectory: prepared.plan.outputDirectory,
    provider: providerState,
    layers: Object.fromEntries(
      Object.entries(report.layers).map(([layer, value]) => [
        layer,
        value.status,
      ]),
    ),
    findingCount: findings.findings.length,
    calibrationCandidateCount: findings.calibrationCandidates.length,
    mode,
    artifacts,
  };
}
