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
    path.join(rootDirectory, 'concepts', 'concept-matrix.v0.3.json'),
  );
}

async function validateLegacyDesignDna(
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

function validateRichClaim(claim, location, context, errors) {
  validateClaim(claim, location, context, errors);
  if (!isObject(claim)) return;
  validateReferences(
    claim.uiDomainRefs,
    context.uiDomainIds,
    location + '.uiDomainRefs',
    errors,
  );
}

function validateEpistemicEvidence(
  item,
  location,
  statusProperty,
  evidenceIds,
  errors,
) {
  if (!isObject(item)) return;
  const status = item[statusProperty];
  if (!statuses.has(status)) {
    errors.push(location + '.' + statusProperty + ' is invalid');
  }
  const evidenceRefs = validateReferences(
    item.evidenceRefs,
    evidenceIds,
    location + '.evidenceRefs',
    errors,
  );
  if (
    (status === 'observed' || status === 'inferred') &&
    evidenceRefs.length === 0
  ) {
    errors.push(
      location + '.evidenceRefs is required for ' + status + ' evidence status',
    );
  }
}

async function validateV03DesignDna(
  dna,
  { requireAccepted = false, rootDirectory = pluginRoot } = {},
) {
  const errors = [];
  if (!isObject(dna)) return ['Design DNA must be a JSON object'];
  if (dna.schemaVersion !== '0.3.0')
    errors.push('schemaVersion must equal 0.3.0');
  if (dna.conceptMatrixVersion !== '0.3.0')
    errors.push('conceptMatrixVersion must equal 0.3.0');

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
  } else {
    if (!Number.isInteger(dna.revision.number) || dna.revision.number < 1) {
      errors.push('revision.number must be a positive integer');
    }
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
  const componentIds = collectUniqueIds(
    components,
    'componentPatterns',
    errors,
  );
  collectUniqueIds(unknowns, 'unknowns', errors);

  const matrix = await loadConceptMatrix(rootDirectory);
  const axisIds = new Set(matrix.axes.map((axis) => axis.id));
  const conceptIds = new Set(matrix.concepts.map((concept) => concept.id));
  const uiDomainIds = new Set(matrix.uiDomains.map((domain) => domain.id));
  const facetIds = new Set(
    matrix.axes.flatMap((axis) => axis.facets.map((facet) => facet.id)),
  );
  const tokenCategoryIds = new Set(matrix.tokenCategories);
  const ruleCategoryIds = new Set(matrix.ruleCategories);
  const artifactIds = new Set([...tokenIds, ...ruleIds, ...componentIds]);
  const context = { conceptIds, evidenceIds, uiDomainIds };
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const conceptsById = new Map(
    matrix.concepts.map((concept) => [concept.id, concept]),
  );
  const uiDomainsById = new Map(
    matrix.uiDomains.map((domain) => [domain.id, domain]),
  );
  const surfaceValues = new Set([
    'website',
    'web-app',
    'mobile-app',
    'desktop-app',
    'other',
    'unknown',
  ]);
  const evidenceModes = new Set(['all', 'only', 'prefer', 'exclude']);

  function validateClaimSourceRouting(
    claim,
    location,
    {
      axisRefs = [],
      uiDomainRefs = claim?.uiDomainRefs ?? [],
      tokenCategory = null,
      ruleCategory = null,
    } = {},
  ) {
    if (!isObject(claim) || !Array.isArray(claim.evidenceRefs)) return;
    const subjectAxes = new Set(axisRefs);
    for (const conceptRef of claim.conceptRefs ?? []) {
      for (const axisRef of conceptsById.get(conceptRef)?.axisRefs ?? []) {
        subjectAxes.add(axisRef);
      }
    }
    for (const uiDomainRef of uiDomainRefs) {
      for (const axisRef of uiDomainsById.get(uiDomainRef)?.axisRefs ?? []) {
        subjectAxes.add(axisRef);
      }
    }
    const sourceRefs = new Set(
      claim.evidenceRefs
        .map((evidenceRef) => evidenceById.get(evidenceRef)?.sourceRef)
        .filter(Boolean),
    );
    for (const sourceRef of sourceRefs) {
      const directive = sourcesById.get(sourceRef)?.directive;
      if (
        !isObject(directive) ||
        ['all', 'prefer'].includes(directive.evidenceMode)
      ) {
        continue;
      }
      const axisMatches = (directive.axisRefs ?? []).some((ref) =>
        subjectAxes.has(ref),
      );
      const conceptMatches = (directive.conceptRefs ?? []).some((ref) =>
        (claim.conceptRefs ?? []).includes(ref),
      );
      const uiDomainMatches = (directive.uiDomainRefs ?? []).some((ref) =>
        uiDomainRefs.includes(ref),
      );
      const tokenCategoryMatches =
        tokenCategory !== null &&
        (directive.tokenCategories ?? []).includes(tokenCategory);
      const ruleCategoryMatches =
        ruleCategory !== null &&
        (directive.ruleCategories ?? []).includes(ruleCategory);
      const matches =
        axisMatches ||
        conceptMatches ||
        uiDomainMatches ||
        tokenCategoryMatches ||
        ruleCategoryMatches;
      if (directive.evidenceMode === 'only' && !matches) {
        errors.push(
          location +
            '.evidenceRefs uses ' +
            sourceRef +
            ' outside its only directive',
        );
      }
      if (
        directive.evidenceMode === 'only' &&
        uiDomainMatches &&
        uiDomainRefs.some(
          (ref) => !(directive.uiDomainRefs ?? []).includes(ref),
        )
      ) {
        errors.push(
          location +
            '.uiDomainRefs leaks ' +
            sourceRef +
            ' evidence outside its only UI domains',
        );
      }
      if (directive.evidenceMode === 'exclude' && matches) {
        errors.push(
          location +
            '.evidenceRefs uses ' +
            sourceRef +
            ' for a subject excluded by its directive',
        );
      }
    }
  }

  for (const [index, source] of sources.entries()) {
    if (!isObject(source)) continue;
    const location = 'sources[' + index + ']';
    if (source.kind !== 'screenshot') {
      errors.push(location + '.kind must be screenshot');
    }
    requireString(source.label, location + '.label', errors);
    requireString(source.path, location + '.path', errors);
    validateStringList(source.limitations, location + '.limitations', errors);
    if (
      source.contentHash !== undefined &&
      (typeof source.contentHash !== 'string' ||
        !contentHashPattern.test(source.contentHash))
    ) {
      errors.push(location + '.contentHash must be a SHA-256 reference');
    }
    if (
      !isObject(source.dimensions) ||
      !Number.isInteger(source.dimensions.width) ||
      source.dimensions.width < 1 ||
      !Number.isInteger(source.dimensions.height) ||
      source.dimensions.height < 1
    ) {
      errors.push(location + '.dimensions must contain positive integers');
    }
    if (!isObject(source.classification)) {
      errors.push(location + '.classification must be an object');
    } else {
      if (!surfaceValues.has(source.classification.surface))
        errors.push(location + '.classification.surface is invalid');
      if (!statuses.has(source.classification.epistemicStatus))
        errors.push(location + '.classification.epistemicStatus is invalid');
      if (
        typeof source.classification.confidence !== 'number' ||
        source.classification.confidence < 0 ||
        source.classification.confidence > 1
      ) {
        errors.push(
          location + '.classification.confidence must be between 0 and 1',
        );
      }
      requireString(
        source.classification.basis,
        location + '.classification.basis',
        errors,
      );
    }
    validateReferences(
      source.detectedUiDomainRefs,
      uiDomainIds,
      location + '.detectedUiDomainRefs',
      errors,
    );
    if (!isObject(source.directive)) {
      errors.push(location + '.directive must be an object');
    } else {
      if (!evidenceModes.has(source.directive.evidenceMode))
        errors.push(location + '.directive.evidenceMode is invalid');
      const axes = validateReferences(
        source.directive.axisRefs,
        axisIds,
        location + '.directive.axisRefs',
        errors,
      );
      const concepts = validateReferences(
        source.directive.conceptRefs,
        conceptIds,
        location + '.directive.conceptRefs',
        errors,
      );
      const domains = validateReferences(
        source.directive.uiDomainRefs,
        uiDomainIds,
        location + '.directive.uiDomainRefs',
        errors,
      );
      const tokenSelectors = validateReferences(
        source.directive.tokenCategories,
        tokenCategoryIds,
        location + '.directive.tokenCategories',
        errors,
      );
      const ruleSelectors = validateReferences(
        source.directive.ruleCategories,
        ruleCategoryIds,
        location + '.directive.ruleCategories',
        errors,
      );
      const selectorCount =
        axes.length +
        concepts.length +
        domains.length +
        tokenSelectors.length +
        ruleSelectors.length;
      if (source.directive.evidenceMode === 'all' && selectorCount > 0) {
        errors.push(
          location + '.directive selectors must be empty in all mode',
        );
      }
      if (
        ['only', 'prefer', 'exclude'].includes(source.directive.evidenceMode) &&
        selectorCount === 0
      ) {
        errors.push(
          location +
            '.directive requires at least one selector outside all mode',
        );
      }
    }
  }

  for (const [index, item] of evidence.entries()) {
    if (!isObject(item)) continue;
    const location = 'evidence[' + index + ']';
    if (!sourceIds.has(item.sourceRef)) {
      errors.push(
        location +
          '.sourceRef references unknown source ' +
          String(item.sourceRef),
      );
    }
    requireString(item.region, location + '.region', errors);
    requireString(item.visibleSummary, location + '.visibleSummary', errors);
    validateReferences(
      item.conceptRefs,
      conceptIds,
      location + '.conceptRefs',
      errors,
      { minimum: 1 },
    );
    validateReferences(
      item.uiDomainRefs,
      uiDomainIds,
      location + '.uiDomainRefs',
      errors,
    );
    validateStringList(item.limitations, location + '.limitations', errors);
  }

  for (const [index, token] of tokens.entries()) {
    if (!isObject(token)) continue;
    const location = 'tokens[' + index + ']';
    requireString(token.name, location + '.name', errors);
    if (!tokenCategoryIds.has(token.category))
      errors.push(location + '.category is invalid');
    requireString(token.role, location + '.role', errors);
    validateStringList(token.appliesTo, location + '.appliesTo', errors);
    validateDesignValue(token.value, location + '.value', errors);
    const relationships = requireArray(
      token.relationships,
      location + '.relationships',
      errors,
    );
    for (const [relationshipIndex, relationship] of relationships.entries()) {
      const relationshipLocation =
        location + '.relationships[' + relationshipIndex + ']';
      if (!isObject(relationship)) {
        errors.push(relationshipLocation + ' must be an object');
        continue;
      }
      if (
        ![
          'scale',
          'alias',
          'pair',
          'contrast',
          'derived',
          'mode',
          'exception',
        ].includes(relationship.kind)
      ) {
        errors.push(relationshipLocation + '.kind is invalid');
      }
      requireString(
        relationship.expression,
        relationshipLocation + '.expression',
        errors,
      );
      if (
        relationship.targetRef !== undefined &&
        !tokenIds.has(relationship.targetRef)
      ) {
        errors.push(
          relationshipLocation +
            '.targetRef references unknown token ' +
            String(relationship.targetRef),
        );
      }
    }
    validateRichClaim(token.claim, location + '.claim', context, errors);
    validateClaimSourceRouting(token.claim, location + '.claim', {
      tokenCategory: token.category,
    });
  }

  for (const [index, rule] of rules.entries()) {
    if (!isObject(rule)) continue;
    const location = 'rules[' + index + ']';
    requireString(rule.name, location + '.name', errors);
    if (!ruleCategoryIds.has(rule.category))
      errors.push(location + '.category is invalid');
    if (!ruleStrengths.has(rule.strength))
      errors.push(location + '.strength is invalid');
    validateStringList(rule.appliesTo, location + '.appliesTo', errors);
    requireString(rule.rationale, location + '.rationale', errors);
    validateStringList(rule.requirements, location + '.requirements', errors);
    validateStringList(rule.failureModes, location + '.failureModes', errors);
    validateStringList(
      rule.validationCases,
      location + '.validationCases',
      errors,
    );
    validateReferences(
      rule.dependsOn,
      artifactIds,
      location + '.dependsOn',
      errors,
    );
    validateRichClaim(rule.claim, location + '.claim', context, errors);
    validateClaimSourceRouting(rule.claim, location + '.claim', {
      ruleCategory: rule.category,
    });
  }

  for (const [index, component] of components.entries()) {
    if (!isObject(component)) continue;
    const location = 'componentPatterns[' + index + ']';
    requireString(component.name, location + '.name', errors);
    requireString(component.purpose, location + '.purpose', errors);
    validateReferences(
      component.uiDomainRefs,
      uiDomainIds,
      location + '.uiDomainRefs',
      errors,
      { minimum: 1 },
    );
    const anatomy = requireArray(
      component.anatomy,
      location + '.anatomy',
      errors,
    );
    if (anatomy.length === 0)
      errors.push(location + '.anatomy must contain at least one part');
    const partIds = new Set();
    for (const [partIndex, part] of anatomy.entries()) {
      const partLocation = location + '.anatomy[' + partIndex + ']';
      if (!isObject(part)) {
        errors.push(partLocation + ' must be an object');
        continue;
      }
      validateIdentifier(part.id, partLocation + '.id', errors);
      if (partIds.has(part.id))
        errors.push(location + '.anatomy contains duplicate id ' + part.id);
      partIds.add(part.id);
      requireString(part.name, partLocation + '.name', errors);
      if (
        !['required', 'optional', 'conditional', 'repeatable'].includes(
          part.requirement,
        )
      ) {
        errors.push(partLocation + '.requirement is invalid');
      }
      requireString(part.purpose, partLocation + '.purpose', errors);
      validateStringList(
        part.contentConstraints,
        partLocation + '.contentConstraints',
        errors,
      );
      validateReferences(
        part.tokenRefs,
        tokenIds,
        partLocation + '.tokenRefs',
        errors,
      );
    }
    const variants = requireArray(
      component.variants,
      location + '.variants',
      errors,
    );
    for (const [variantIndex, variant] of variants.entries()) {
      const variantLocation = location + '.variants[' + variantIndex + ']';
      if (!isObject(variant)) {
        errors.push(variantLocation + ' must be an object');
        continue;
      }
      requireString(variant.name, variantLocation + '.name', errors);
      requireString(variant.purpose, variantLocation + '.purpose', errors);
      validateStringList(
        variant.conditions,
        variantLocation + '.conditions',
        errors,
      );
      validateStringList(
        variant.differences,
        variantLocation + '.differences',
        errors,
      );
      validateEpistemicEvidence(
        variant,
        variantLocation,
        'epistemicStatus',
        evidenceIds,
        errors,
      );
      validateClaimSourceRouting(
        {
          ...component.claim,
          evidenceRefs: variant.evidenceRefs,
        },
        variantLocation,
        { uiDomainRefs: component.uiDomainRefs },
      );
    }
    const componentStates = requireArray(
      component.states,
      location + '.states',
      errors,
    );
    if (componentStates.length === 0)
      errors.push(location + '.states must contain at least one state');
    for (const [stateIndex, state] of componentStates.entries()) {
      const stateLocation = location + '.states[' + stateIndex + ']';
      if (!isObject(state)) {
        errors.push(stateLocation + ' must be an object');
        continue;
      }
      requireString(state.name, stateLocation + '.name', errors);
      requireString(state.trigger, stateLocation + '.trigger', errors);
      requireString(state.behavior, stateLocation + '.behavior', errors);
      requireString(state.feedback, stateLocation + '.feedback', errors);
      requireString(state.exit, stateLocation + '.exit', errors);
      requireString(
        state.programmaticState,
        stateLocation + '.programmaticState',
        errors,
      );
      validateStringList(
        state.validationCases,
        stateLocation + '.validationCases',
        errors,
      );
      validateEpistemicEvidence(
        state,
        stateLocation,
        'epistemicStatus',
        evidenceIds,
        errors,
      );
      validateClaimSourceRouting(
        {
          ...component.claim,
          evidenceRefs: state.evidenceRefs,
        },
        stateLocation,
        { uiDomainRefs: component.uiDomainRefs },
      );
    }
    for (const property of [
      'compositionRules',
      'contentConstraints',
      'adaptationRules',
      'accessibilityRequirements',
      'antiPatterns',
    ]) {
      validateStringList(
        component[property],
        location + '.' + property,
        errors,
      );
    }
    validateReferences(
      component.ruleRefs,
      ruleIds,
      location + '.ruleRefs',
      errors,
    );
    validateReferences(
      component.tokenRefs,
      tokenIds,
      location + '.tokenRefs',
      errors,
    );
    validateRichClaim(component.claim, location + '.claim', context, errors);
    validateClaimSourceRouting(component.claim, location + '.claim', {
      uiDomainRefs: component.uiDomainRefs,
    });
  }

  const coverageStatuses = new Set([
    'complete',
    'partial',
    'unknown',
    'not-applicable',
  ]);
  if (!isObject(dna.coverage)) {
    errors.push('coverage must be an object');
  } else {
    const axisCoverage = requireArray(
      dna.coverage.axes,
      'coverage.axes',
      errors,
    );
    const axisCoverageRefs = new Set();
    if (axisCoverage.length !== matrix.axes.length) {
      errors.push(
        'coverage.axes must contain exactly ' +
          matrix.axes.length +
          ' axis records',
      );
    }
    for (const [axisIndex, coverage] of axisCoverage.entries()) {
      const location = 'coverage.axes[' + axisIndex + ']';
      if (!isObject(coverage)) {
        errors.push(location + ' must be an object');
        continue;
      }
      if (!axisIds.has(coverage.axisRef))
        errors.push(location + '.axisRef is unknown');
      if (axisCoverageRefs.has(coverage.axisRef))
        errors.push(
          'coverage.axes contains duplicate axis ' + coverage.axisRef,
        );
      axisCoverageRefs.add(coverage.axisRef);
      if (!coverageStatuses.has(coverage.coverageStatus))
        errors.push(location + '.coverageStatus is invalid');
      const expectedAxis = matrix.axes.find(
        (axis) => axis.id === coverage.axisRef,
      );
      const facets = requireArray(
        coverage.facets,
        location + '.facets',
        errors,
      );
      const facetRefs = new Set();
      if (expectedAxis && facets.length !== expectedAxis.facets.length) {
        errors.push(
          location +
            '.facets must contain exactly ' +
            expectedAxis.facets.length +
            ' records',
        );
      }
      for (const [facetIndex, facet] of facets.entries()) {
        const facetLocation = location + '.facets[' + facetIndex + ']';
        if (!isObject(facet)) {
          errors.push(facetLocation + ' must be an object');
          continue;
        }
        if (!facetIds.has(facet.facetRef))
          errors.push(facetLocation + '.facetRef is unknown');
        if (
          expectedAxis &&
          !expectedAxis.facets.some(
            (candidate) => candidate.id === facet.facetRef,
          )
        ) {
          errors.push(
            facetLocation + '.facetRef does not belong to ' + coverage.axisRef,
          );
        }
        if (facetRefs.has(facet.facetRef))
          errors.push(
            location + '.facets contains duplicate ' + facet.facetRef,
          );
        facetRefs.add(facet.facetRef);
        if (!coverageStatuses.has(facet.coverageStatus))
          errors.push(facetLocation + '.coverageStatus is invalid');
        requireString(facet.summary, facetLocation + '.summary', errors);
        validateReferences(
          facet.artifactRefs,
          artifactIds,
          facetLocation + '.artifactRefs',
          errors,
        );
        validateStringList(facet.gaps, facetLocation + '.gaps', errors);
        validateEpistemicEvidence(
          facet,
          facetLocation,
          'epistemicStatus',
          evidenceIds,
          errors,
        );
        if (!isObject(facet.validation)) {
          errors.push(facetLocation + '.validation must be an object');
        } else {
          requireString(
            facet.validation.method,
            facetLocation + '.validation.method',
            errors,
          );
          if (!validationStatuses.has(facet.validation.status))
            errors.push(facetLocation + '.validation.status is invalid');
        }
      }
      if (
        coverage.coverageStatus === 'complete' &&
        facets.some((facet) => facet.coverageStatus !== 'complete')
      ) {
        errors.push(
          location +
            '.coverageStatus cannot be complete while a facet is incomplete',
        );
      }
    }
    for (const axisId of axisIds) {
      if (!axisCoverageRefs.has(axisId))
        errors.push('coverage.axes is missing ' + axisId);
    }

    const domainCoverage = requireArray(
      dna.coverage.uiDomains,
      'coverage.uiDomains',
      errors,
    );
    const domainCoverageRefs = new Set();
    if (domainCoverage.length !== matrix.uiDomains.length) {
      errors.push(
        'coverage.uiDomains must contain exactly ' +
          matrix.uiDomains.length +
          ' domain records',
      );
    }
    for (const [domainIndex, coverage] of domainCoverage.entries()) {
      const location = 'coverage.uiDomains[' + domainIndex + ']';
      if (!isObject(coverage)) {
        errors.push(location + ' must be an object');
        continue;
      }
      if (!uiDomainIds.has(coverage.domainRef))
        errors.push(location + '.domainRef is unknown');
      if (domainCoverageRefs.has(coverage.domainRef))
        errors.push(
          'coverage.uiDomains contains duplicate domain ' + coverage.domainRef,
        );
      domainCoverageRefs.add(coverage.domainRef);
      if (
        !['detected', 'requested', 'not-detected', 'unknown'].includes(
          coverage.applicability,
        )
      ) {
        errors.push(location + '.applicability is invalid');
      }
      if (!coverageStatuses.has(coverage.coverageStatus))
        errors.push(location + '.coverageStatus is invalid');
      requireString(coverage.summary, location + '.summary', errors);
      validateReferences(
        coverage.artifactRefs,
        artifactIds,
        location + '.artifactRefs',
        errors,
      );
      validateStringList(coverage.gaps, location + '.gaps', errors);
      validateEpistemicEvidence(
        coverage,
        location,
        'epistemicStatus',
        evidenceIds,
        errors,
      );
      if (!isObject(coverage.validation)) {
        errors.push(location + '.validation must be an object');
      } else {
        requireString(
          coverage.validation.method,
          location + '.validation.method',
          errors,
        );
        if (!validationStatuses.has(coverage.validation.status))
          errors.push(location + '.validation.status is invalid');
      }
    }
    for (const domainId of uiDomainIds) {
      if (!domainCoverageRefs.has(domainId))
        errors.push('coverage.uiDomains is missing ' + domainId);
    }
  }

  for (const [index, unknown] of unknowns.entries()) {
    if (!isObject(unknown)) continue;
    const location = 'unknowns[' + index + ']';
    requireString(unknown.question, location + '.question', errors);
    if (!unknownImpacts.has(unknown.impact))
      errors.push(location + '.impact is invalid');
    requireString(unknown.resolutionPlan, location + '.resolutionPlan', errors);
    validateStringList(
      unknown.missingEvidence,
      location + '.missingEvidence',
      errors,
    );
    validateReferences(
      unknown.axisRefs,
      axisIds,
      location + '.axisRefs',
      errors,
    );
    validateReferences(
      unknown.conceptRefs,
      conceptIds,
      location + '.conceptRefs',
      errors,
      { minimum: 1 },
    );
    validateReferences(
      unknown.uiDomainRefs,
      uiDomainIds,
      location + '.uiDomainRefs',
      errors,
    );
  }

  if (!isObject(dna.motion) || !motionModes.has(dna.motion.mode)) {
    errors.push('motion.mode must be off, observed-only, or auto');
  } else {
    validateReferences(dna.motion.rules, ruleIds, 'motion.rules', errors);
  }

  return errors;
}

export async function validateDesignDna(dna, options = {}) {
  if (!isObject(dna)) return ['Design DNA must be a JSON object'];
  if (dna.schemaVersion === '0.2.0') {
    return validateLegacyDesignDna(dna, options);
  }
  if (dna.schemaVersion === '0.3.0') {
    return validateV03DesignDna(dna, options);
  }
  return ['schemaVersion must equal 0.3.0 or supported legacy 0.2.0'];
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
