import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { assertValidDesignDna } from './design-dna.mjs';
import { DesignomeError } from './errors.mjs';
import {
  atomicWrite,
  jsonText,
  pathExists,
  readJson,
  readTextIfExists,
  relativeInside,
  resolveProjectPath,
  toPosixPath,
} from './files.mjs';
import { verifyInstallation } from './install.mjs';

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
  if (config?.schemaVersion !== '0.1.0')
    errors.push('schemaVersion must be 0.1.0');
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
      status: browserInstallAuthorized ? 'planned' : 'authorization-required',
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
    };
  }
  if (selected === 'in-app-browser') {
    return {
      requested: requestedProvider,
      selected,
      status: 'external',
      executionOwner: 'host-agent',
      reason:
        'The host agent must execute browser captures and write evidence; the CLI cannot control the in-app browser.',
      playwright,
    };
  }
  return {
    requested: requestedProvider,
    selected,
    status: 'available',
    executionOwner:
      selected === 'existing-playwright' ? 'target-project' : 'designome',
    reason:
      selected === 'existing-playwright'
        ? 'The target project already exposes Playwright configuration or dependencies.'
        : 'No rendered-browser provider was selected; the audit is static-only.',
    playwright,
  };
}

function reportMarkdown({ dna, plan, findings }) {
  const renderedStatus = ['existing-playwright', 'in-app-browser'].includes(
    plan.provider.selected,
  )
    ? 'pending provider execution'
    : 'not executed';
  return [
    '# Designome audit',
    '',
    `Design DNA: \`${dna.documentId}\` revision ${dna.revision.number}.`,
    '',
    '## Validation layers',
    '',
    '- Managed installation: passed before audit initialization.',
    '- Static implementation: pending agent inspection.',
    `- Rendered browser: ${renderedStatus}.`,
    '- Interaction behavior: not executed.',
    '- Accessibility semantics: not executed.',
    '',
    '## Provider',
    '',
    `Selected \`${plan.provider.selected}\`: ${plan.provider.reason}`,
    '',
    '## Routes',
    '',
    ...plan.routes.map(
      (route) =>
        `- \`${route.path}\` at ${route.viewports.map((viewport) => `${viewport.width}x${viewport.height}`).join(', ')}`,
    ),
    '',
    '## Results',
    '',
    `- Observed findings: ${findings.findings.length}`,
    `- Proposed calibration candidates: ${findings.calibrationCandidates.length}`,
    '',
    'No implementation deviation is reported until evidence is attached to a rule or accepted calibration.',
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

function validateEvidence(evidence) {
  const errors = [];
  if (evidence?.schemaVersion !== '0.1.0')
    errors.push('schemaVersion must be 0.1.0');
  for (const property of [
    'captures',
    'interactions',
    'consoleErrors',
    'accessibilityChecks',
  ]) {
    if (!Array.isArray(evidence?.[property]))
      errors.push(`${property} must be an array`);
  }
  return errors;
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
  const errors = validateEvidence(evidence);
  if (errors.length > 0) {
    throw new DesignomeError('Audit evidence is invalid', {
      code: 'INVALID_AUDIT_EVIDENCE',
      details: errors,
    });
  }
  const factory = findingFactory();
  const findings = [];
  const calibrationCandidates = [];
  for (const capture of evidence.captures) {
    const captureScope = `${capture.routeId} at ${capture.viewport.width}x${capture.viewport.height}`;
    if (capture.document.scrollWidth > capture.document.clientWidth + 1) {
      findings.push(
        factory.finding({
          kind: 'mechanical-risk',
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
        severity: ['navigation', 'modal', 'selection'].includes(
          interaction.kind,
        )
          ? 'high'
          : 'medium',
        scope: `${interaction.routeId}, interaction ${interaction.id}`,
        ruleRef: interaction.ruleRefs?.[0] ?? `interaction.${interaction.kind}`,
        evidence: `Expected ${interaction.expected}; observed ${interaction.actual}.`,
        suggestedCorrection:
          'Restore the observable interaction outcome and its programmatic state.',
        verificationMethod: `Repeat the ${interaction.kind} flow and require the expected state transition.`,
      }),
    );
  }
  for (const error of evidence.consoleErrors) {
    findings.push(
      factory.finding({
        kind: 'mechanical-risk',
        severity: 'high',
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
        severity: 'high',
        scope: `${check.routeId}, accessibility check ${check.id}`,
        ruleRef: check.ruleRefs?.[0] ?? 'mechanical.accessibility-semantics',
        evidence: `Expected ${check.expected}; observed ${check.actual}.`,
        suggestedCorrection:
          'Restore the expected accessible name, state, focus behavior, or semantic relationship.',
        verificationMethod:
          'Repeat the same keyboard or accessibility-tree assertion.',
      }),
    );
  }
  return { findings, calibrationCandidates };
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
  const config = await readJson(resolvedConfig).catch((error) => {
    throw new DesignomeError(`Cannot read audit config: ${configPath}`, {
      code: 'AUDIT_CONFIG_UNREADABLE',
      details: [error.message],
    });
  });
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
    schemaVersion: '0.1.0',
    createdAt,
    projectRoot,
    configPath: toPosixPath(path.relative(projectRoot, resolvedConfig)),
    outputDirectory: outputRelative,
    baseUrl: config.baseUrl,
    startCommand: config.startCommand ?? null,
    provider: providerPlan,
    installation: {
      valid: true,
      managedArtifactCount: installation.managedArtifactCount,
    },
    routes: config.routes,
    layers: {
      managedInstallation: 'required',
      static: 'pending',
      rendered:
        providerPlan.selected === 'static' ? 'not-available' : 'pending',
      interaction: 'pending',
      accessibility: 'pending',
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
  const prepared = await planAudit(options);
  if (options.dryRun) return { status: 'ready', ...prepared.plan };
  const existingOutput = await readTextIfExists(
    path.join(prepared.outputPath, 'findings.json'),
  );
  if (existingOutput !== null && options.overwrite !== true) {
    throw new DesignomeError(
      'Audit output already exists; choose a new directory or explicitly overwrite it',
      { code: 'AUDIT_OUTPUT_CONFLICT' },
    );
  }
  let evidence = {
    schemaVersion: '0.1.0',
    generatedAt: prepared.plan.createdAt,
    provider: prepared.plan.provider,
    layers: prepared.plan.layers,
    captures: [],
    interactions: [],
    consoleErrors: [],
    accessibilityChecks: [],
  };
  if (options.evidencePath) {
    const resolvedEvidencePath = resolveProjectPath(
      prepared.projectRoot,
      options.evidencePath,
      '--evidence',
    );
    evidence = await readJson(resolvedEvidencePath).catch((error) => {
      throw new DesignomeError('Cannot read audit evidence', {
        code: 'AUDIT_EVIDENCE_UNREADABLE',
        details: [error.message],
      });
    });
  }
  const evaluated = evaluateAuditEvidence({ dna: prepared.dna, evidence });
  const findings = {
    schemaVersion: '0.1.0',
    generatedAt: prepared.plan.createdAt,
    designDna: {
      documentId: prepared.dna.documentId,
      revision: prepared.dna.revision.number,
    },
    findings: evaluated.findings,
    calibrationCandidates: evaluated.calibrationCandidates,
  };
  await fs.mkdir(prepared.outputPath, { recursive: true });
  await atomicWrite(
    path.join(prepared.outputPath, 'plan.json'),
    jsonText(prepared.plan),
  );
  await atomicWrite(
    path.join(prepared.outputPath, 'evidence.json'),
    jsonText(evidence),
  );
  await atomicWrite(
    path.join(prepared.outputPath, 'findings.json'),
    jsonText(findings),
  );
  await atomicWrite(
    path.join(prepared.outputPath, 'report.md'),
    reportMarkdown({ dna: prepared.dna, plan: prepared.plan, findings }),
  );
  const artifacts = [
    'plan.json',
    'evidence.json',
    'findings.json',
    'report.md',
  ];
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
    status: 'initialized',
    outputDirectory: prepared.plan.outputDirectory,
    provider: prepared.plan.provider,
    findingCount: findings.findings.length,
    calibrationCandidateCount: findings.calibrationCandidates.length,
    mode,
    artifacts,
  };
}
