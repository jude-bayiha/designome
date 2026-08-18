import path from 'node:path';

import { DesignomeError } from './errors.mjs';
import { pluginRoot, readJson } from './files.mjs';

const statuses = new Set(['observed', 'inferred', 'proposed', 'unknown']);
const documentStatuses = new Set(['draft', 'accepted', 'superseded']);
const motionModes = new Set(['off', 'observed-only', 'auto']);
const tokenCategories = new Set([
  'color',
  'space',
  'size',
  'typography',
  'radius',
  'border',
  'elevation',
  'motion',
  'other',
]);
const ruleCategories = new Set([
  'layout',
  'content',
  'state',
  'interaction',
  'responsive',
  'accessibility',
  'performance',
  'trust',
  'motion',
  'governance',
]);
const ruleStrengths = new Set(['required', 'recommended', 'avoid']);
const unknownImpacts = new Set(['low', 'medium', 'high']);
const validationStatuses = new Set([
  'pending',
  'passed',
  'failed',
  'not-applicable',
]);
const identifierPattern = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u;
const contentHashPattern = /^sha256:[a-f0-9]{64}$/u;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireString(value, location, errors) {
  if (typeof value !== 'string' || value.trim() === '')
    errors.push(`${location} must be a non-empty string`);
}

function requireArray(value, location, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${location} must be an array`);
    return [];
  }
  return value;
}

function validateStringList(value, location, errors) {
  const values = requireArray(value, location, errors);
  const seen = new Set();
  for (const [index, item] of values.entries()) {
    requireString(item, `${location}[${index}]`, errors);
    if (typeof item === 'string') {
      if (seen.has(item))
        errors.push(`${location} contains duplicate value ${item}`);
      seen.add(item);
    }
  }
  return values;
}

function validateIdentifier(value, location, errors) {
  requireString(value, location, errors);
  if (typeof value === 'string' && !identifierPattern.test(value)) {
    errors.push(`${location} is not a valid Designome identifier`);
  }
}

function validateDesignValue(value, location, errors) {
  if (!isObject(value)) {
    errors.push(`${location} must be an object`);
    return;
  }

  if (!['exact', 'range', 'relationship', 'unknown'].includes(value.kind)) {
    errors.push(
      `${location}.kind must be exact, range, relationship, or unknown`,
    );
    return;
  }

  if (value.kind === 'exact') {
    if (
      !['string', 'number', 'boolean'].includes(typeof value.value) ||
      (typeof value.value === 'number' && !Number.isFinite(value.value))
    ) {
      errors.push(`${location}.value must be a string, number, or boolean`);
    }
  } else if (value.kind === 'range') {
    if (!Number.isFinite(value.minimum)) {
      errors.push(`${location}.minimum must be a finite number`);
    }
    if (!Number.isFinite(value.maximum)) {
      errors.push(`${location}.maximum must be a finite number`);
    }
    if (
      Number.isFinite(value.minimum) &&
      Number.isFinite(value.maximum) &&
      value.minimum > value.maximum
    ) {
      errors.push(`${location}.minimum must not exceed maximum`);
    }
    if (value.preferred !== undefined) {
      if (!Number.isFinite(value.preferred)) {
        errors.push(`${location}.preferred must be a finite number`);
      } else if (
        Number.isFinite(value.minimum) &&
        Number.isFinite(value.maximum) &&
        (value.preferred < value.minimum || value.preferred > value.maximum)
      ) {
        errors.push(`${location}.preferred must be within the range`);
      }
      if (!['bounded', 'audit-only'].includes(value.strategy)) {
        errors.push(
          `${location}.strategy must be bounded or audit-only when preferred is present`,
        );
      }
    } else if (
      value.strategy !== undefined &&
      !['bounded', 'audit-only'].includes(value.strategy)
    ) {
      errors.push(`${location}.strategy must be bounded or audit-only`);
    }
    requireString(value.unit, `${location}.unit`, errors);
  } else if (value.kind === 'relationship') {
    requireString(value.expression, `${location}.expression`, errors);
  } else {
    requireString(value.reason, `${location}.reason`, errors);
  }
}

function collectUniqueIds(items, location, errors) {
  const ids = new Set();
  for (const [index, item] of items.entries()) {
    if (!isObject(item)) {
      errors.push(`${location}[${index}] must be an object`);
      continue;
    }
    validateIdentifier(item.id, `${location}[${index}].id`, errors);
    if (typeof item.id === 'string') {
      if (ids.has(item.id))
        errors.push(`${location} contains duplicate id ${item.id}`);
      ids.add(item.id);
    }
  }
  return ids;
}

function validateReferences(
  values,
  known,
  location,
  errors,
  { minimum = 0 } = {},
) {
  const refs = requireArray(values, location, errors);
  if (refs.length < minimum)
    errors.push(`${location} must contain at least ${minimum} item(s)`);
  const seen = new Set();
  for (const ref of refs) {
    if (typeof ref !== 'string' || !known.has(ref))
      errors.push(`${location} references unknown id ${String(ref)}`);
    if (seen.has(ref)) {
      errors.push(`${location} contains duplicate reference ${String(ref)}`);
    }
    seen.add(ref);
  }
  return refs;
}

function validateClaim(claim, location, context, errors) {
  if (!isObject(claim)) {
    errors.push(`${location} must be an object`);
    return;
  }

  requireString(claim.statement, `${location}.statement`, errors);
  if (!statuses.has(claim.epistemicStatus)) {
    errors.push(
      `${location}.epistemicStatus must be observed, inferred, proposed, or unknown`,
    );
  }

  validateReferences(
    claim.conceptRefs,
    context.conceptIds,
    `${location}.conceptRefs`,
    errors,
    {
      minimum: 1,
    },
  );
  const evidenceRefs = validateReferences(
    claim.evidenceRefs,
    context.evidenceIds,
    `${location}.evidenceRefs`,
    errors,
  );
  if (
    (claim.epistemicStatus === 'observed' ||
      claim.epistemicStatus === 'inferred') &&
    evidenceRefs.length === 0
  ) {
    errors.push(
      `${location}.evidenceRefs is required for ${claim.epistemicStatus} claims`,
    );
  }

  validateStringList(claim.scope, `${location}.scope`, errors);
  validateStringList(claim.exceptions, `${location}.exceptions`, errors);

  if (!isObject(claim.confidence)) {
    errors.push(`${location}.confidence must be an object`);
  } else {
    if (
      typeof claim.confidence.score !== 'number' ||
      claim.confidence.score < 0 ||
      claim.confidence.score > 1
    ) {
      errors.push(`${location}.confidence.score must be between 0 and 1`);
    }
    requireString(
      claim.confidence.basis,
      `${location}.confidence.basis`,
      errors,
    );
  }

  if (!isObject(claim.validation)) {
    errors.push(`${location}.validation must be an object`);
  } else {
    requireString(
      claim.validation.method,
      `${location}.validation.method`,
      errors,
    );
    if (!validationStatuses.has(claim.validation.status)) {
      errors.push(`${location}.validation.status is invalid`);
    }
  }
}

export async function loadConceptMatrix(rootDirectory = pluginRoot) {
  return readJson(
    path.join(rootDirectory, 'concepts', 'concept-matrix.v0.2.json'),
  );
}

export async function validateDesignDna(
  dna,
  { requireAccepted = false, rootDirectory = pluginRoot } = {},
) {
  const errors = [];
  if (!isObject(dna)) return ['Design DNA must be a JSON object'];

  if (dna.schemaVersion !== '0.2.0')
    errors.push('schemaVersion must equal 0.2.0');
  if (dna.conceptMatrixVersion !== '0.2.0')
    errors.push('conceptMatrixVersion must equal 0.2.0');
  validateIdentifier(dna.documentId, 'documentId', errors);
  requireString(dna.name, 'name', errors);
  requireString(dna.createdAt, 'createdAt', errors);
  if (
    typeof dna.createdAt === 'string' &&
    Number.isNaN(Date.parse(dna.createdAt))
  ) {
    errors.push('createdAt must be a valid date-time');
  }
  if (!documentStatuses.has(dna.status))
    errors.push('status must be draft, accepted, or superseded');
  if (requireAccepted && dna.status !== 'accepted')
    errors.push('status must be accepted for this operation');

  if (!isObject(dna.revision)) {
    errors.push('revision must be an object');
  } else if (
    !Number.isInteger(dna.revision.number) ||
    dna.revision.number < 1
  ) {
    errors.push('revision.number must be a positive integer');
  } else {
    requireString(dna.revision.changeSummary, 'revision.changeSummary', errors);
    if (dna.revision.previousDocumentId !== undefined) {
      validateIdentifier(
        dna.revision.previousDocumentId,
        'revision.previousDocumentId',
        errors,
      );
    }
  }

  const sources = requireArray(dna.sources, 'sources', errors);
  const evidence = requireArray(dna.evidence, 'evidence', errors);
  const tokens = requireArray(dna.tokens, 'tokens', errors);
  const rules = requireArray(dna.rules, 'rules', errors);
  const components = requireArray(
    dna.componentPatterns,
    'componentPatterns',
    errors,
  );
  const unknowns = requireArray(dna.unknowns, 'unknowns', errors);
  if (sources.length === 0)
    errors.push('sources must contain at least one item');
  if (evidence.length === 0)
    errors.push('evidence must contain at least one item');

  const sourceIds = collectUniqueIds(sources, 'sources', errors);
  const evidenceIds = collectUniqueIds(evidence, 'evidence', errors);
  const tokenIds = collectUniqueIds(tokens, 'tokens', errors);
  const ruleIds = collectUniqueIds(rules, 'rules', errors);
  collectUniqueIds(components, 'componentPatterns', errors);
  collectUniqueIds(unknowns, 'unknowns', errors);

  const matrix = await loadConceptMatrix(rootDirectory);
  const conceptIds = new Set(matrix.concepts.map((concept) => concept.id));
  const context = { conceptIds, evidenceIds };

  for (const [index, source] of sources.entries()) {
    if (!isObject(source)) continue;
    if (source.kind !== 'screenshot') {
      errors.push(`sources[${index}].kind must be screenshot`);
    }
    requireString(source.label, `sources[${index}].label`, errors);
    requireString(source.path, `sources[${index}].path`, errors);
    validateStringList(
      source.limitations,
      `sources[${index}].limitations`,
      errors,
    );
    if (
      source.contentHash !== undefined &&
      (typeof source.contentHash !== 'string' ||
        !contentHashPattern.test(source.contentHash))
    ) {
      errors.push(`sources[${index}].contentHash must be a SHA-256 reference`);
    }
    if (
      !isObject(source.dimensions) ||
      !Number.isInteger(source.dimensions.width) ||
      source.dimensions.width < 1 ||
      !Number.isInteger(source.dimensions.height) ||
      source.dimensions.height < 1
    ) {
      errors.push(
        `sources[${index}].dimensions must contain positive integers`,
      );
    }
  }

  for (const [index, item] of evidence.entries()) {
    if (isObject(item)) {
      if (!sourceIds.has(item.sourceRef)) {
        errors.push(
          `evidence[${index}].sourceRef references unknown source ${String(item.sourceRef)}`,
        );
      }
      requireString(item.region, `evidence[${index}].region`, errors);
      requireString(
        item.visibleSummary,
        `evidence[${index}].visibleSummary`,
        errors,
      );
      validateStringList(
        item.limitations,
        `evidence[${index}].limitations`,
        errors,
      );
    }
  }

  for (const [index, token] of tokens.entries()) {
    if (isObject(token)) {
      requireString(token.name, `tokens[${index}].name`, errors);
      if (!tokenCategories.has(token.category)) {
        errors.push(`tokens[${index}].category is invalid`);
      }
      validateClaim(token.claim, `tokens[${index}].claim`, context, errors);
      validateDesignValue(token.value, `tokens[${index}].value`, errors);
    }
  }

  for (const [index, rule] of rules.entries()) {
    if (isObject(rule)) {
      requireString(rule.name, `rules[${index}].name`, errors);
      if (!ruleCategories.has(rule.category)) {
        errors.push(`rules[${index}].category is invalid`);
      }
      if (!ruleStrengths.has(rule.strength)) {
        errors.push(`rules[${index}].strength is invalid`);
      }
      validateClaim(rule.claim, `rules[${index}].claim`, context, errors);
      validateStringList(
        rule.requirements,
        `rules[${index}].requirements`,
        errors,
      );
      validateStringList(
        rule.validationCases,
        `rules[${index}].validationCases`,
        errors,
      );
    }
  }

  for (const [index, component] of components.entries()) {
    if (!isObject(component)) continue;
    requireString(component.name, `componentPatterns[${index}].name`, errors);
    validateStringList(
      component.anatomy,
      `componentPatterns[${index}].anatomy`,
      errors,
    );
    validateStringList(
      component.variants,
      `componentPatterns[${index}].variants`,
      errors,
    );
    const componentStates = requireArray(
      component.states,
      `componentPatterns[${index}].states`,
      errors,
    );
    for (const [stateIndex, state] of componentStates.entries()) {
      const stateLocation = `componentPatterns[${index}].states[${stateIndex}]`;
      if (!isObject(state)) {
        errors.push(`${stateLocation} must be an object`);
        continue;
      }
      requireString(state.name, `${stateLocation}.name`, errors);
      if (!statuses.has(state.status)) {
        errors.push(`${stateLocation}.status is invalid`);
      }
      requireString(state.behavior, `${stateLocation}.behavior`, errors);
    }
    validateClaim(
      component.claim,
      `componentPatterns[${index}].claim`,
      context,
      errors,
    );
    validateReferences(
      component.ruleRefs,
      ruleIds,
      `componentPatterns[${index}].ruleRefs`,
      errors,
    );
    validateReferences(
      component.tokenRefs,
      tokenIds,
      `componentPatterns[${index}].tokenRefs`,
      errors,
    );
  }

  for (const [index, unknown] of unknowns.entries()) {
    if (!isObject(unknown)) continue;
    requireString(unknown.question, `unknowns[${index}].question`, errors);
    if (!unknownImpacts.has(unknown.impact)) {
      errors.push(`unknowns[${index}].impact is invalid`);
    }
    requireString(
      unknown.resolutionPlan,
      `unknowns[${index}].resolutionPlan`,
      errors,
    );
    validateReferences(
      unknown.conceptRefs,
      conceptIds,
      `unknowns[${index}].conceptRefs`,
      errors,
      {
        minimum: 1,
      },
    );
  }

  if (!isObject(dna.motion) || !motionModes.has(dna.motion.mode)) {
    errors.push('motion.mode must be off, observed-only, or auto');
  } else {
    validateReferences(dna.motion.rules, ruleIds, 'motion.rules', errors);
  }

  return errors;
}

export async function assertValidDesignDna(dna, options = {}) {
  const errors = await validateDesignDna(dna, options);
  if (errors.length > 0) {
    throw new DesignomeError('Design DNA validation failed', {
      code: 'INVALID_DESIGN_DNA',
      details: errors,
    });
  }
}
