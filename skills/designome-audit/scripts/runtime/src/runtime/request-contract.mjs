import path from 'node:path';

import { DesignomeError } from './errors.mjs';
import { pluginRoot, readJson } from './files.mjs';
import { loadConceptMatrix } from './design-dna.mjs';

const identifierPattern = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u;
const operations = new Set(['extract', 'install', 'audit']);
const interpretationStatuses = new Set(['ready', 'partial', 'blocked']);
const evidenceModes = new Set(['all', 'only', 'prefer', 'exclude']);
const motionModes = new Set(['off', 'observed-only', 'auto']);
const adaptationModes = new Set(['direct', 'adapt']);
const useCaseStatuses = new Set(['usable', 'ambiguous', 'unusable']);
const useCaseSources = new Set(['user', 'inferred', 'unspecified']);
const surfaces = new Set([
  'website',
  'web-app',
  'mobile-app',
  'desktop-app',
  'other',
  'unknown',
]);
const tokenCategories = new Set([
  'color',
  'space',
  'size',
  'typography',
  'radius',
  'border',
  'elevation',
  'opacity',
  'layer',
  'motion',
  'iconography',
  'data-visualization',
  'asset',
  'other',
]);
const ruleCategories = new Set([
  'layout',
  'typography',
  'color',
  'content',
  'component',
  'state',
  'interaction',
  'navigation',
  'form',
  'data-display',
  'visualization',
  'responsive',
  'platform',
  'accessibility',
  'localization',
  'performance',
  'trust',
  'ethics',
  'motion',
  'media',
  'governance',
]);
const rulePrecedences = new Set([
  'complement',
  'existing-first',
  'designome-first',
]);
const stylingStrategies = new Set([
  'auto',
  'css-variables',
  'tailwind-utilities',
  'shadcn-components',
]);
const uiKitPreferences = new Set(['auto', 'none', 'shadcn']);
const auditModes = new Set(['report', 'repair']);
const auditProviders = new Set([
  'auto',
  'in-app-browser',
  'existing-playwright',
  'managed-playwright',
  'static',
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function migrateRequestContract(contract) {
  if (!isObject(contract) || contract.schemaVersion !== '1.0.0') {
    return contract;
  }
  const migrated = structuredClone(contract);
  migrated.schemaVersion = '1.1.0';
  migrated.matrixVersion = '0.3.0';
  if (migrated.operation === 'extract' && isObject(migrated.parameters)) {
    migrated.parameters.focusAxisRefs ??= [];
    migrated.parameters.focusUiDomainRefs ??= [];
    for (const source of migrated.parameters.sources ?? []) {
      if (!isObject(source)) continue;
      source.axisRefs ??= [];
      source.uiDomainRefs ??= [];
    }
  }
  if (migrated.operation === 'audit' && isObject(migrated.parameters)) {
    migrated.parameters.focusAxisRefs ??= [];
    migrated.parameters.focusUiDomainRefs ??= [];
  }
  return migrated;
}

function requireString(value, location, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${location} must be a non-empty string`);
  }
}

function requireBoolean(value, location, errors) {
  if (typeof value !== 'boolean') errors.push(`${location} must be a boolean`);
}

function validateStringList(value, location, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${location} must be an array`);
    return [];
  }
  const seen = new Set();
  for (const [index, item] of value.entries()) {
    requireString(item, `${location}[${index}]`, errors);
    if (typeof item === 'string' && seen.has(item)) {
      errors.push(`${location} contains duplicate value ${item}`);
    }
    seen.add(item);
  }
  return value;
}

function validateEnum(value, allowed, location, errors) {
  if (!allowed.has(value)) {
    errors.push(`${location} must be one of ${[...allowed].join(', ')}`);
  }
}

function validateConceptRefs(value, location, conceptIds, errors) {
  const refs = validateStringList(value, location, errors);
  for (const ref of refs) {
    if (typeof ref === 'string' && !conceptIds.has(ref)) {
      errors.push(`${location} references unknown concept ${ref}`);
    }
  }
  return refs;
}

function validateCanonicalRefs(value, location, knownIds, label, errors) {
  const refs = validateStringList(value, location, errors);
  for (const ref of refs) {
    if (typeof ref === 'string' && !knownIds.has(ref)) {
      errors.push(`${location} references unknown ${label} ${ref}`);
    }
  }
  return refs;
}

function validateCategoryList(value, location, allowed, errors) {
  const categories = validateStringList(value, location, errors);
  for (const category of categories) {
    if (typeof category === 'string' && !allowed.has(category)) {
      errors.push(`${location} contains unsupported category ${category}`);
    }
  }
  return categories;
}

function validateUseCase(useCase, location, errors) {
  if (!isObject(useCase)) {
    errors.push(`${location} must be an object`);
    return;
  }
  requireString(useCase.raw, `${location}.raw`, errors);
  validateEnum(
    useCase.interpretationStatus,
    useCaseStatuses,
    `${location}.interpretationStatus`,
    errors,
  );
  validateEnum(useCase.source, useCaseSources, `${location}.source`, errors);
  validateEnum(useCase.surface, surfaces, `${location}.surface`, errors);
  if (
    useCase.archetype !== null &&
    (typeof useCase.archetype !== 'string' || useCase.archetype.trim() === '')
  ) {
    errors.push(`${location}.archetype must be null or a non-empty string`);
  }
  if (
    useCase.confidence !== undefined &&
    (typeof useCase.confidence !== 'number' ||
      useCase.confidence < 0 ||
      useCase.confidence > 1)
  ) {
    errors.push(`${location}.confidence must be between 0 and 1`);
  }
  if (useCase.source === 'inferred' && useCase.confidence === undefined) {
    errors.push(`${location}.confidence is required when source is inferred`);
  }
  if (
    useCase.interpretationStatus === 'unusable' &&
    (useCase.surface !== 'unknown' || useCase.archetype !== null)
  ) {
    errors.push(
      `${location} must keep surface unknown and archetype null when unusable`,
    );
  }
}

function validateExtract(parameters, matrix, errors) {
  const axisIds = new Set(matrix.axes.map((axis) => axis.id));
  const conceptIds = new Set(matrix.concepts.map((concept) => concept.id));
  const uiDomainIds = new Set(matrix.uiDomains.map((uiDomain) => uiDomain.id));
  validateEnum(
    parameters.motionMode,
    motionModes,
    'parameters.motionMode',
    errors,
  );
  validateEnum(
    parameters.adaptationMode,
    adaptationModes,
    'parameters.adaptationMode',
    errors,
  );
  if (parameters.targetUseCase !== undefined) {
    validateUseCase(
      parameters.targetUseCase,
      'parameters.targetUseCase',
      errors,
    );
  }
  validateCanonicalRefs(
    parameters.focusAxisRefs,
    'parameters.focusAxisRefs',
    axisIds,
    'axis',
    errors,
  );
  validateCanonicalRefs(
    parameters.focusUiDomainRefs,
    'parameters.focusUiDomainRefs',
    uiDomainIds,
    'UI domain',
    errors,
  );
  if (!Array.isArray(parameters.sources) || parameters.sources.length === 0) {
    errors.push('parameters.sources must contain at least one source');
    return;
  }
  const seenPaths = new Set();
  for (const [index, source] of parameters.sources.entries()) {
    const location = `parameters.sources[${index}]`;
    if (!isObject(source)) {
      errors.push(`${location} must be an object`);
      continue;
    }
    requireString(source.path, `${location}.path`, errors);
    if (typeof source.path === 'string') {
      const resolved = path.resolve(source.path);
      if (seenPaths.has(resolved)) {
        errors.push(
          `parameters.sources contains duplicate path ${source.path}`,
        );
      }
      seenPaths.add(resolved);
    }
    validateEnum(
      source.evidenceMode,
      evidenceModes,
      `${location}.evidenceMode`,
      errors,
    );
    const axes = validateCanonicalRefs(
      source.axisRefs,
      `${location}.axisRefs`,
      axisIds,
      'axis',
      errors,
    );
    const refs = validateConceptRefs(
      source.conceptRefs,
      `${location}.conceptRefs`,
      conceptIds,
      errors,
    );
    const domains = validateCanonicalRefs(
      source.uiDomainRefs,
      `${location}.uiDomainRefs`,
      uiDomainIds,
      'UI domain',
      errors,
    );
    const tokens = validateCategoryList(
      source.tokenCategories,
      `${location}.tokenCategories`,
      tokenCategories,
      errors,
    );
    const rules = validateCategoryList(
      source.ruleCategories,
      `${location}.ruleCategories`,
      ruleCategories,
      errors,
    );
    const selectorCount =
      axes.length + refs.length + domains.length + tokens.length + rules.length;
    if (source.evidenceMode === 'all' && selectorCount > 0) {
      errors.push(
        `${location} selectors must be empty when evidenceMode is all`,
      );
    }
    if (
      ['only', 'prefer', 'exclude'].includes(source.evidenceMode) &&
      selectorCount === 0
    ) {
      errors.push(
        `${location} must select at least one axis, concept, UI domain, token, or rule category when evidenceMode is ${source.evidenceMode}`,
      );
    }
  }
}

function validateInstall(parameters, errors) {
  requireString(parameters.projectPath, 'parameters.projectPath', errors);
  requireString(parameters.dnaPath, 'parameters.dnaPath', errors);
  requireBoolean(
    parameters.writesAuthorized,
    'parameters.writesAuthorized',
    errors,
  );
  if (!isObject(parameters.options)) {
    errors.push('parameters.options must be an object');
    return;
  }
  if (parameters.options.cssEntry !== null) {
    requireString(
      parameters.options.cssEntry,
      'parameters.options.cssEntry',
      errors,
    );
  }
  requireString(parameters.options.scope, 'parameters.options.scope', errors);
  requireString(
    parameters.options.documentationDirectory,
    'parameters.options.documentationDirectory',
    errors,
  );
  validateEnum(
    parameters.options.rulePrecedence,
    rulePrecedences,
    'parameters.options.rulePrecedence',
    errors,
  );
  validateEnum(
    parameters.options.stylingStrategy,
    stylingStrategies,
    'parameters.options.stylingStrategy',
    errors,
  );
  validateEnum(
    parameters.options.uiKitPreference,
    uiKitPreferences,
    'parameters.options.uiKitPreference',
    errors,
  );
  validateStringList(
    parameters.options.existingRulePaths,
    'parameters.options.existingRulePaths',
    errors,
  );
}

function validateAudit(parameters, matrix, errors) {
  const axisIds = new Set(matrix.axes.map((axis) => axis.id));
  const conceptIds = new Set(matrix.concepts.map((concept) => concept.id));
  const uiDomainIds = new Set(matrix.uiDomains.map((uiDomain) => uiDomain.id));
  requireString(parameters.projectPath, 'parameters.projectPath', errors);
  if (parameters.dnaPath !== null && parameters.dnaPath !== undefined) {
    requireString(parameters.dnaPath, 'parameters.dnaPath', errors);
  }
  validateEnum(parameters.mode, auditModes, 'parameters.mode', errors);
  validateEnum(
    parameters.provider,
    auditProviders,
    'parameters.provider',
    errors,
  );
  validateCanonicalRefs(
    parameters.focusAxisRefs,
    'parameters.focusAxisRefs',
    axisIds,
    'axis',
    errors,
  );
  validateConceptRefs(
    parameters.focusConceptRefs,
    'parameters.focusConceptRefs',
    conceptIds,
    errors,
  );
  validateCanonicalRefs(
    parameters.focusUiDomainRefs,
    'parameters.focusUiDomainRefs',
    uiDomainIds,
    'UI domain',
    errors,
  );
  requireBoolean(
    parameters.implementationAuthorized,
    'parameters.implementationAuthorized',
    errors,
  );
  requireBoolean(
    parameters.browserInstallAuthorized,
    'parameters.browserInstallAuthorized',
    errors,
  );
  if (parameters.mode === 'repair' && !parameters.implementationAuthorized) {
    errors.push(
      'parameters.implementationAuthorized must be true when mode is repair',
    );
  }
  if (
    parameters.provider === 'managed-playwright' &&
    !parameters.browserInstallAuthorized
  ) {
    errors.push(
      'parameters.browserInstallAuthorized must be true when provider is managed-playwright',
    );
  }
}

export async function validateRequestContract(
  inputContract,
  { rootDirectory = pluginRoot } = {},
) {
  const contract = migrateRequestContract(inputContract);
  const errors = [];
  if (!isObject(contract)) return ['Request contract must be a JSON object'];
  if (contract.schemaVersion !== '1.1.0') {
    errors.push('schemaVersion must equal 1.1.0');
  }
  requireString(contract.requestId, 'requestId', errors);
  if (
    typeof contract.requestId === 'string' &&
    !identifierPattern.test(contract.requestId)
  ) {
    errors.push('requestId is not a valid Designome identifier');
  }
  validateEnum(contract.operation, operations, 'operation', errors);
  requireString(contract.normalizedAt, 'normalizedAt', errors);
  if (
    typeof contract.normalizedAt === 'string' &&
    Number.isNaN(Date.parse(contract.normalizedAt))
  ) {
    errors.push('normalizedAt must be a valid date-time');
  }
  requireString(contract.summary, 'summary', errors);
  validateStringList(contract.constraints, 'constraints', errors);
  if (!isObject(contract.interpretation)) {
    errors.push('interpretation must be an object');
  } else {
    validateEnum(
      contract.interpretation.status,
      interpretationStatuses,
      'interpretation.status',
      errors,
    );
    const ambiguities = validateStringList(
      contract.interpretation.ambiguities,
      'interpretation.ambiguities',
      errors,
    );
    validateStringList(
      contract.interpretation.ignoredFragments,
      'interpretation.ignoredFragments',
      errors,
    );
    if (
      contract.interpretation.status === 'blocked' &&
      ambiguities.length === 0
    ) {
      errors.push('interpretation.ambiguities must explain a blocked request');
    }
    if (
      contract.interpretation.status === 'partial' &&
      ambiguities.length === 0
    ) {
      errors.push('interpretation.ambiguities must explain a partial request');
    }
  }
  if (!isObject(contract.parameters)) {
    errors.push('parameters must be an object');
    return errors;
  }
  if (contract.parameters.kind !== contract.operation) {
    errors.push('parameters.kind must match operation');
  }
  const matrix = await loadConceptMatrix(rootDirectory);
  if (contract.matrixVersion !== matrix.matrixVersion) {
    errors.push(
      `matrixVersion must equal the active matrix version ${matrix.matrixVersion}`,
    );
  }
  if (contract.operation === 'extract') {
    validateExtract(contract.parameters, matrix, errors);
  } else if (contract.operation === 'install') {
    validateInstall(contract.parameters, errors);
  } else if (contract.operation === 'audit') {
    validateAudit(contract.parameters, matrix, errors);
  }
  return errors;
}

export async function assertValidRequestContract(contract, options = {}) {
  const migrated = migrateRequestContract(contract);
  const errors = await validateRequestContract(migrated, options);
  if (errors.length > 0) {
    throw new DesignomeError('Request contract validation failed', {
      code: 'INVALID_REQUEST_CONTRACT',
      details: errors,
    });
  }
  return migrated;
}

export async function loadRequestContract(
  contractPath,
  {
    expectedOperation = null,
    requireExecutable = false,
    rootDirectory = pluginRoot,
  } = {},
) {
  const absolutePath = path.resolve(contractPath);
  const contract = migrateRequestContract(await readJson(absolutePath));
  await assertValidRequestContract(contract, { rootDirectory });
  if (expectedOperation && contract.operation !== expectedOperation) {
    throw new DesignomeError(
      `Request contract operation must be ${expectedOperation}`,
      {
        code: 'REQUEST_OPERATION_MISMATCH',
        details: { expectedOperation, observedOperation: contract.operation },
      },
    );
  }
  if (requireExecutable && contract.interpretation.status === 'blocked') {
    throw new DesignomeError(
      'Request contract is blocked by unresolved intent',
      {
        code: 'REQUEST_CONTRACT_BLOCKED',
        details: contract.interpretation.ambiguities,
      },
    );
  }
  return { absolutePath, contract };
}
