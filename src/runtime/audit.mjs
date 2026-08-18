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

async function resolveProvider(projectRoot, requestedProvider, packageJson) {
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
      status: 'unavailable',
      executionOwner: 'designome',
      reason:
        'Managed Playwright requires explicit dependency authorization and is not enabled by this runtime slice.',
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

function reportMarkdown({ dna, plan }) {
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
    'No implementation deviation is reported until evidence is attached to a rule or accepted calibration.',
    '',
  ].join('\n');
}

export async function planAudit({
  projectPath,
  configPath = defaultConfigPath,
  outputDirectory,
  provider = 'auto',
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
  const findings = {
    schemaVersion: '0.1.0',
    generatedAt: prepared.plan.createdAt,
    designDna: {
      documentId: prepared.dna.documentId,
      revision: prepared.dna.revision.number,
    },
    findings: [],
    calibrationCandidates: [],
  };
  const evidence = {
    schemaVersion: '0.1.0',
    generatedAt: prepared.plan.createdAt,
    provider: prepared.plan.provider,
    layers: prepared.plan.layers,
    captures: [],
    interactions: [],
    accessibilityChecks: [],
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
    reportMarkdown({ dna: prepared.dna, plan: prepared.plan }),
  );
  return {
    status: 'initialized',
    outputDirectory: prepared.plan.outputDirectory,
    provider: prepared.plan.provider,
    artifacts: ['plan.json', 'evidence.json', 'findings.json', 'report.md'],
  };
}
