import { DesignomeError } from './errors.mjs';
import {
  auditContextKey,
  auditContractVersion,
  captureContext,
  contextsForRoutes,
  designDnaFingerprint,
  normalizeContext,
  semanticFingerprint,
} from './audit-contract.mjs';
import { evaluateFidelityConstraints } from './fidelity.mjs';

const methods = new Set([
  'measurement',
  'perceptual',
  'interaction',
  'accessibility',
]);

const layers = new Set(['mechanical', 'perceptual', 'usage']);
const establishedStatuses = new Set(['observed', 'inferred']);
const allStatuses = new Set(['observed', 'inferred', 'proposed', 'unknown']);

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeOrFail(value, label) {
  try {
    return normalizeContext(value);
  } catch (error) {
    fail(`${label} has an invalid route, viewport, scenario, or direction`, [
      error.message,
    ]);
  }
}

function captureContextOrFail(capture, label) {
  try {
    return captureContext(capture);
  } catch (error) {
    fail(`${label} has an invalid capture context`, [error.message]);
  }
}

function identifierPart(value) {
  return String(value)
    .replace(/^\//u, '')
    .replace(/[^a-zA-Z0-9]+/gu, '.')
    .replace(/^\.+|\.+$/gu, '')
    .toLowerCase();
}

function uniqueContexts(contexts, label) {
  const normalized = contexts.map((context, index) =>
    normalizeOrFail(context, `${label}[${index}]`),
  );
  const keys = normalized.map(auditContextKey);
  if (new Set(keys).size !== keys.length)
    fail(`${label} contains duplicate target contexts`);
  return normalized;
}

function obligationId(artifactRef, claimPath) {
  return `obligation.${identifierPart(artifactRef)}.${identifierPart(claimPath)}`;
}

function layerForCategory(category) {
  if (
    ['accessibility', 'interaction', 'navigation', 'form', 'state'].includes(
      category,
    )
  )
    return 'usage';
  if (['performance'].includes(category)) return 'mechanical';
  return 'perceptual';
}

function layerForComponentField(field) {
  return field === 'accessibilityRequirements' ? 'usage' : 'perceptual';
}

function methodForLayer(layer) {
  if (layer === 'usage') return 'interaction';
  if (layer === 'mechanical') return 'measurement';
  return 'perceptual';
}

function dispositionForClaim(claim, acceptance = null) {
  const status = claim?.epistemicStatus;
  if (acceptance?.status === 'accepted') return 'requirement';
  if (acceptance?.status === 'rejected') return 'excluded';
  if (acceptance?.status === 'pending') return 'calibration';
  if (establishedStatuses.has(status)) return 'requirement';
  return 'diagnostic';
}

function makeObligation({
  id,
  artifactRef,
  claimPath,
  claim,
  layer,
  method,
  priority = 'important',
  type,
  acceptance = null,
  metadata = {},
}) {
  const epistemicStatus = claim?.epistemicStatus ?? 'unknown';
  return {
    id: id ?? obligationId(artifactRef, claimPath),
    type,
    artifactRef,
    claimPath,
    statement: claim?.statement ?? '',
    epistemicStatus,
    confidence: claim?.confidence ?? null,
    priority,
    exceptions: list(claim?.exceptions),
    evidenceRefs: list(claim?.evidenceRefs),
    uiDomainRefs: list(claim?.uiDomainRefs),
    layer,
    method,
    disposition: dispositionForClaim(claim, acceptance),
    acceptance: acceptance ?? null,
    ...metadata,
  };
}

function pushAssertionObligations(obligations, owner, field, context) {
  const assertions = owner?.assertions?.[field];
  if (!Array.isArray(assertions)) return;
  assertions.forEach((claim, index) => {
    if (!object(claim) || !allStatuses.has(claim.epistemicStatus)) return;
    const layer = context.layerForField
      ? context.layerForField(field)
      : context.layer;
    obligations.push(
      makeObligation({
        artifactRef: context.artifactRef,
        claimPath: `${context.basePath}/assertions/${field}/${index}`,
        claim,
        layer,
        method: context.methodForField
          ? context.methodForField(field)
          : (context.method ?? methodForLayer(layer)),
        priority: context.priority,
        type: context.type ?? 'assertion',
        metadata: { legacyField: field, legacyIndex: index },
      }),
    );
  });
}

/**
 * Build stable, source-bound checks from accepted DNA. This function is pure:
 * it does not inspect the target project or decide whether a screenshot looks
 * correct.
 */
export function buildAuditObligations(dna) {
  const obligations = [];
  for (const [ruleIndex, rule] of list(dna?.rules).entries()) {
    const claim = rule.claim;
    if (!object(claim)) continue;
    const basePath = `/rules/${ruleIndex}`;
    if (
      rule.strength === 'required' &&
      list(rule.assertions?.requirements).length
    ) {
      pushAssertionObligations(obligations, rule, 'requirements', {
        artifactRef: rule.id,
        basePath,
        layer: layerForCategory(rule.category),
        method: methodForLayer(layerForCategory(rule.category)),
        type: 'rule-assertion',
        priority: 'important',
      });
    } else if (rule.strength === 'required') {
      obligations.push(
        makeObligation({
          artifactRef: rule.id,
          claimPath: `${basePath}/claim`,
          claim,
          layer: layerForCategory(rule.category),
          method: methodForLayer(layerForCategory(rule.category)),
          type: 'legacy-rule-claim',
          metadata: {
            limitation:
              'This legacy rule has no independent assertion list; verification is only as granular as the rule claim.',
          },
        }),
      );
    }
  }

  for (const [componentIndex, component] of list(
    dna?.componentPatterns,
  ).entries()) {
    const basePath = `/componentPatterns/${componentIndex}`;
    const fields = [
      'compositionRules',
      'contentConstraints',
      'adaptationRules',
      'accessibilityRequirements',
      'antiPatterns',
    ];
    for (const field of fields) {
      pushAssertionObligations(obligations, component, field, {
        artifactRef: component.id,
        basePath,
        layerForField: layerForComponentField,
        methodForField: (name) =>
          name === 'accessibilityRequirements' ? 'accessibility' : 'perceptual',
        type: 'component-assertion',
      });
    }
    for (const [partIndex, part] of list(component.anatomy).entries()) {
      pushAssertionObligations(obligations, part, 'contentConstraints', {
        artifactRef: component.id,
        basePath: `${basePath}/anatomy/${partIndex}`,
        layer: 'perceptual',
        method: 'perceptual',
        type: 'part-assertion',
      });
    }
    for (const [variantIndex, variant] of list(component.variants).entries()) {
      for (const field of ['conditions', 'differences']) {
        pushAssertionObligations(obligations, variant, field, {
          artifactRef: component.id,
          basePath: `${basePath}/variants/${variantIndex}`,
          layer: 'perceptual',
          method: 'perceptual',
          type: 'variant-assertion',
        });
      }
    }
    for (const [stateIndex, state] of list(component.states).entries()) {
      for (const field of [
        'appearance',
        'trigger',
        'behavior',
        'feedback',
        'exit',
        'programmaticState',
      ]) {
        const claim = state.assertions?.[field];
        if (!object(claim) || !allStatuses.has(claim.epistemicStatus)) continue;
        const layer = field === 'appearance' ? 'perceptual' : 'usage';
        obligations.push(
          makeObligation({
            artifactRef: component.id,
            claimPath: `${basePath}/states/${stateIndex}/assertions/${field}`,
            claim,
            layer,
            method: field === 'appearance' ? 'perceptual' : 'interaction',
            type: 'state-assertion',
            metadata: { stateName: state.name, stateField: field },
          }),
        );
      }
    }
  }

  for (const [qualityIndex, quality] of list(
    dna?.fidelity?.qualities,
  ).entries()) {
    obligations.push(
      makeObligation({
        artifactRef: quality.id,
        claimPath: `/fidelity/qualities/${qualityIndex}/claim`,
        claim: quality.claim,
        layer: 'perceptual',
        method: 'perceptual',
        type: 'fidelity-quality',
        priority: quality.priority,
        metadata: { failureModes: list(quality.failureModes) },
      }),
    );
  }

  for (const [constraintIndex, constraint] of list(
    dna?.fidelity?.constraints,
  ).entries()) {
    obligations.push(
      makeObligation({
        artifactRef: constraint.id,
        claimPath: `/fidelity/constraints/${constraintIndex}/claim`,
        claim: constraint.claim,
        layer: 'mechanical',
        method: 'measurement',
        type: 'fidelity-constraint',
        acceptance: constraint.acceptance,
        metadata: {
          constraintRef: constraint.id,
          measurement: constraint.measurement,
        },
      }),
    );
  }
  return obligations;
}

function fail(message, details = []) {
  throw new DesignomeError(message, {
    code: 'INVALID_AUDIT_VERIFICATION',
    details,
  });
}

function sourceIds(dna) {
  return new Set(list(dna?.sources).map((source) => source.id));
}

function contextMap(routes) {
  try {
    const contexts = contextsForRoutes(routes);
    const keys = contexts.map(auditContextKey);
    if (new Set(keys).size !== keys.length)
      fail('Audit verification routes contain duplicate target contexts');
    return new Map(
      contexts.map((context) => [auditContextKey(context), context]),
    );
  } catch (error) {
    if (error instanceof DesignomeError) throw error;
    fail('Audit verification routes contain an invalid target context', [
      error.message,
    ]);
  }
}

function normalizeBinding(binding, obligation, contexts, sources) {
  if (!object(binding)) fail('Audit verification binding must be an object');
  if (binding.obligationRef !== obligation.id)
    fail(
      `Binding references an unexpected obligation ${String(binding.obligationRef)}`,
    );
  if (!layers.has(binding.layer) || !methods.has(binding.method))
    fail(`Binding ${obligation.id} has an invalid layer or method`);
  if (
    binding.layer !== obligation.layer ||
    binding.method !== obligation.method
  )
    fail(
      `Binding ${obligation.id} must use its planned ${obligation.layer}/${obligation.method} method`,
    );
  const targetContexts = uniqueContexts(
    list(binding.targetContexts).map((context) => {
      const normalized = normalizeOrFail(
        context,
        `Binding ${obligation.id} target context`,
      );
      const key = auditContextKey(normalized);
      if (!contexts.has(key))
        fail(`Binding ${obligation.id} references an unplanned context`);
      return normalized;
    }),
    `Binding ${obligation.id}`,
  );
  if (targetContexts.length === 0)
    fail(`Binding ${obligation.id} must name at least one target context`);
  if (!Array.isArray(binding.sourceRefs))
    fail(`Binding ${obligation.id} must provide sourceRefs as an array`);
  const sourceRefs = list(binding.sourceRefs);
  if (
    sourceRefs.some((sourceRef) => !sources.has(sourceRef)) ||
    new Set(sourceRefs).size !== sourceRefs.length
  )
    fail(`Binding ${obligation.id} references an unknown or duplicate source`);
  if (binding.method === 'perceptual' && sourceRefs.length === 0)
    fail(`Perceptual binding ${obligation.id} must name source captures`);
  const implementationRefs = list(binding.implementationRefs);
  if (
    implementationRefs.some((reference) => !text(reference)) ||
    new Set(implementationRefs).size !== implementationRefs.length
  )
    fail(
      `Binding ${obligation.id} has invalid or duplicate implementationRefs`,
    );
  const exclusionKeys = new Set();
  const exclusions = list(binding.excludedContexts).map((exclusion) => {
    if (
      !object(exclusion) ||
      !text(exclusion.reason) ||
      !list(exclusion.references).length ||
      list(exclusion.references).some((reference) => !text(reference)) ||
      new Set(exclusion.references).size !== exclusion.references.length
    )
      fail(`Binding ${obligation.id} has an unjustified context exclusion`);
    const context = normalizeOrFail(
      exclusion.context,
      `Binding ${obligation.id} exclusion`,
    );
    if (!contexts.has(auditContextKey(context)))
      fail(`Binding ${obligation.id} excludes an unplanned context`);
    const contextKey = auditContextKey(context);
    if (exclusionKeys.has(contextKey))
      fail(`Binding ${obligation.id} contains a duplicate excluded context`);
    exclusionKeys.add(contextKey);
    return {
      context,
      reason: exclusion.reason,
      references: [...new Set(exclusion.references)],
    };
  });
  return {
    obligationRef: obligation.id,
    layer: binding.layer,
    method: binding.method,
    targetContexts,
    sourceRefs,
    excludedContexts: exclusions,
    implementationRefs,
  };
}

function obligationById(obligations) {
  return new Map(obligations.map((obligation) => [obligation.id, obligation]));
}

/**
 * Expand host-provided bindings into one deterministic check per obligation
 * and exact target context. Unbound established claims are deliberately
 * reported as unresolved instead of being treated as globally applicable.
 */
export function buildAuditVerification({ dna, config, routes, aspects = [] }) {
  if (config?.auditContractVersion !== auditContractVersion) return null;
  const expectedDnaFingerprint = designDnaFingerprint(dna);
  const verification = config.verification;
  if (!object(verification))
    fail('Audit Contract 2.0 requires a verification object');
  if (verification.dnaFingerprint !== expectedDnaFingerprint)
    fail('Audit verification DNA fingerprint does not match installed DNA');
  const obligations = buildAuditObligations(dna);
  for (const aspect of aspects) {
    if (!text(aspect)) continue;
    obligations.push(
      makeObligation({
        id: `obligation.perceptual-aspect.${identifierPart(aspect)}`,
        artifactRef: `perceptual.${aspect}`,
        claimPath: `/perceptual/aspects/${aspect}`,
        claim: {
          statement: `Review ${aspect} in each explicitly bound target context.`,
          epistemicStatus: 'unknown',
        },
        layer: 'perceptual',
        method: 'perceptual',
        priority: 'supporting',
        type: 'perceptual-aspect',
        metadata: { aspect },
      }),
    );
  }
  if (
    new Set(obligations.map((obligation) => obligation.id)).size !==
    obligations.length
  )
    fail('Audit obligation IDs must be unique');
  const obligationMap = obligationById(obligations);
  const contexts = contextMap(routes);
  const sources = sourceIds(dna);
  const rawBindings = list(verification.bindings);
  const bound = new Map();
  const normalizedBindings = [];
  for (const rawBinding of rawBindings) {
    const obligation = obligationMap.get(rawBinding?.obligationRef);
    if (!obligation)
      fail(
        `Binding references unknown obligation ${String(rawBinding?.obligationRef)}`,
      );
    if (obligation.disposition !== 'requirement')
      fail(
        `Binding ${obligation.id} is obsolete because its disposition is ${obligation.disposition}`,
      );
    if (bound.has(obligation.id))
      fail(`Duplicate binding for ${obligation.id}`);
    const binding = normalizeBinding(rawBinding, obligation, contexts, sources);
    bound.set(obligation.id, binding);
    normalizedBindings.push(binding);
  }
  const exclusions = [];
  const exclusionKeys = new Set();
  for (const exclusion of list(verification.exclusions)) {
    const obligation = obligationMap.get(exclusion?.obligationRef);
    if (!obligation)
      fail(
        `Exclusion references unknown obligation ${String(exclusion?.obligationRef)}`,
      );
    if (obligation.disposition !== 'requirement')
      fail(
        `Exclusion for ${obligation.id} is obsolete because its disposition is ${obligation.disposition}`,
      );
    if (
      !text(exclusion.reason) ||
      !list(exclusion.references).length ||
      list(exclusion.references).some((reference) => !text(reference)) ||
      new Set(exclusion.references).size !== exclusion.references.length
    )
      fail(`Exclusion for ${obligation.id} needs a reason and references`);
    const targetContexts = list(exclusion.targetContexts).map((context) => {
      const normalized = normalizeOrFail(
        context,
        `Exclusion for ${obligation.id} target context`,
      );
      if (!contexts.has(auditContextKey(normalized)))
        fail(`Exclusion for ${obligation.id} references an unplanned context`);
      return normalized;
    });
    if (targetContexts.length === 0)
      fail(`Exclusion for ${obligation.id} needs contexts`);
    const normalizedContexts = uniqueContexts(
      targetContexts,
      `Exclusion for ${obligation.id}`,
    );
    for (const context of normalizedContexts) {
      const key = `${obligation.id}:${auditContextKey(context)}`;
      if (exclusionKeys.has(key))
        fail(`Duplicate exclusion for ${obligation.id} and target context`);
      exclusionKeys.add(key);
    }
    exclusions.push({
      obligationRef: obligation.id,
      targetContexts: normalizedContexts,
      reason: exclusion.reason,
      references: [...new Set(exclusion.references)],
    });
  }
  const checks = [];
  const unresolved = [];
  for (const obligation of obligations) {
    if (obligation.disposition !== 'requirement') continue;
    const binding = bound.get(obligation.id);
    const excludedKeys = new Set(
      exclusions
        .filter((item) => item.obligationRef === obligation.id)
        .flatMap((item) => item.targetContexts.map(auditContextKey)),
    );
    for (const context of binding?.excludedContexts ?? [])
      excludedKeys.add(auditContextKey(context.context));
    if (
      binding &&
      binding.targetContexts.some((context) =>
        excludedKeys.has(auditContextKey(context)),
      )
    )
      fail(
        `Binding ${obligation.id} contains an applicable and excluded context`,
      );
    if (!binding) {
      const remainingContexts = [...contexts.values()].filter(
        (context) => !excludedKeys.has(auditContextKey(context)),
      );
      if (remainingContexts.length === 0) continue;
      unresolved.push({
        obligationRef: obligation.id,
        layer: obligation.layer,
        reason:
          'An established obligation has no explicit target binding; applicability is unresolved.',
      });
      continue;
    }
    for (const context of binding.targetContexts) {
      const key = auditContextKey(context);
      if (excludedKeys.has(key)) continue;
      checks.push({
        id: `check.${identifierPart(obligation.id)}.${semanticContextId(key)}`,
        obligationRef: obligation.id,
        layer: binding.layer,
        method: binding.method,
        targetContexts: [context],
        sourceRefs: binding.sourceRefs,
        implementationRefs: binding.implementationRefs,
      });
    }
  }
  if (new Set(checks.map((check) => check.id)).size !== checks.length)
    fail('Verification check IDs must be unique');
  return {
    auditContractVersion,
    dnaFingerprint: expectedDnaFingerprint,
    obligations,
    bindings: normalizedBindings,
    checks,
    exclusions,
    unresolved,
  };
}

function semanticContextId(key) {
  return semanticFingerprint(key).slice(0, 16);
}

function checkMatchesCapture(check, capture) {
  return check.targetContexts.some(
    (context) =>
      auditContextKey(context) ===
      auditContextKey(
        captureContextOrFail(capture, `Capture ${String(capture.id)}`),
      ),
  );
}

function assertObservationReferences(
  observation,
  check,
  captures,
  sources,
  { required = true } = {},
) {
  const targetRefs = observation.targetCaptureRefs;
  const sourceRefs = observation.sourceCaptureRefs;
  if (
    (targetRefs !== undefined && !Array.isArray(targetRefs)) ||
    (sourceRefs !== undefined && !Array.isArray(sourceRefs))
  )
    fail(`Observation ${observation.id} has invalid capture references`);
  const normalizedTargetRefs = list(targetRefs);
  const normalizedSourceRefs = list(sourceRefs);
  if (
    required &&
    (normalizedTargetRefs.length === 0 || normalizedSourceRefs.length === 0)
  )
    fail(
      `Observation ${observation.id} needs source and target capture references`,
    );
  if (
    new Set(normalizedTargetRefs).size !== normalizedTargetRefs.length ||
    new Set(normalizedSourceRefs).size !== normalizedSourceRefs.length
  )
    fail(`Observation ${observation.id} contains duplicate capture references`);
  if (normalizedTargetRefs.some((ref) => !captures.has(ref)))
    fail(`Observation ${observation.id} references an unknown target capture`);
  if (normalizedSourceRefs.some((ref) => !sources.has(ref)))
    fail(`Observation ${observation.id} references an unknown source capture`);
  const targetCaptures = normalizedTargetRefs.map((ref) => captures.get(ref));
  if (targetCaptures.some((capture) => !checkMatchesCapture(check, capture)))
    fail(
      `Observation ${observation.id} references a capture outside its check context`,
    );
  if (required && targetCaptures.length === 0)
    fail(`Observation ${observation.id} does not match its check context`);
  if (
    list(check.sourceRefs).length > 0 &&
    normalizedSourceRefs.some((ref) => !check.sourceRefs.includes(ref))
  )
    fail(
      `Observation ${observation.id} references a source outside its planned check`,
    );
}

function resultFromObservations(observations) {
  if (observations.length === 0)
    return {
      result: 'incomplete',
      evidenceRefs: [],
      reason: 'No linked observation was recorded.',
    };
  if (observations.some((observation) => observation.result === 'failed'))
    return {
      result: 'failed',
      evidenceRefs: observations.map((observation) => observation.id),
      reason: 'A linked host observation established a failure.',
    };
  if (observations.some((observation) => observation.result === 'incomplete'))
    return {
      result: 'incomplete',
      evidenceRefs: observations.map((observation) => observation.id),
      reason: 'A linked host observation is incomplete.',
    };
  return {
    result: 'passed',
    evidenceRefs: observations.map((observation) => observation.id),
    reason: 'All linked host observations passed.',
  };
}

/**
 * Validate the reference side of a verification-aware evidence file before
 * any result is written. This intentionally does not decide whether the
 * rendered UI is visually faithful.
 */
export function validateAuditVerificationEvidence({
  verification,
  evidence,
  sourceRefs = new Set(),
}) {
  if (!object(verification)) fail('Audit verification registry is missing');
  if (!object(evidence)) fail('Audit verification evidence is missing');
  const knownSourceRefs =
    sourceRefs instanceof Set ? sourceRefs : new Set(list(sourceRefs));
  if (verification.auditContractVersion !== auditContractVersion)
    fail('Audit verification registry has an incompatible contract version');
  for (const field of [
    'obligations',
    'bindings',
    'checks',
    'exclusions',
    'unresolved',
  ]) {
    if (!Array.isArray(verification[field]))
      fail(`Audit verification registry ${field} must be an array`);
  }
  if (!/^[a-f0-9]{64}$/u.test(String(verification.dnaFingerprint)))
    fail('Audit verification registry has an invalid Design DNA fingerprint');
  if (evidence?.auditContractVersion !== auditContractVersion)
    fail('Audit Contract 2.0 evidence must declare auditContractVersion 2.0.0');
  if (evidence.designDnaFingerprint !== verification.dnaFingerprint)
    fail(
      'Audit evidence and verification registry use different Design DNA fingerprints',
    );
  if (
    !text(evidence?.designDnaFingerprint) ||
    !/^[a-f0-9]{64}$/u.test(evidence.designDnaFingerprint)
  )
    fail('Audit Contract 2.0 evidence must declare a Design DNA fingerprint');
  const checks = new Map(
    list(verification.checks).map((check) => [check.id, check]),
  );
  if (checks.size !== list(verification.checks).length)
    fail('Verification check IDs must be unique');
  for (const check of checks.values()) {
    if (
      !text(check.id) ||
      !layers.has(check.layer) ||
      !methods.has(check.method)
    )
      fail(`Verification check ${String(check.id)} has an invalid shape`);
    const obligation = list(verification.obligations).find(
      (candidate) => candidate.id === check.obligationRef,
    );
    if (!obligation)
      fail(
        `Verification check ${String(check.id)} references an unknown obligation`,
      );
    if (obligation.disposition !== 'requirement')
      fail(
        `Verification check ${String(check.id)} references a non-required obligation`,
      );
    if (check.layer !== obligation.layer || check.method !== obligation.method)
      fail(
        `Verification check ${String(check.id)} disagrees with its obligation method`,
      );
    if (
      uniqueContexts(
        list(check.targetContexts),
        `Verification check ${check.id}`,
      ).length === 0
    )
      fail(`Verification check ${String(check.id)} needs a target context`);
  }
  const captures = new Map(
    list(evidence?.captures).map((capture) => [capture.id, capture]),
  );
  if (captures.size !== list(evidence?.captures).length)
    fail('Capture IDs must be unique in verification-aware evidence');
  const captureContexts = new Set();
  for (const capture of captures.values()) {
    if (!text(capture.id)) fail('Verification captures require unique IDs');
    const key = auditContextKey(
      captureContextOrFail(capture, `Capture ${String(capture.id)}`),
    );
    if (captureContexts.has(key))
      fail(
        `Capture ${String(capture.id)} duplicates an existing target context`,
      );
    captureContexts.add(key);
  }
  const seenObservationContexts = new Set();
  const seenObservationIds = new Set();
  for (const observation of list(evidence?.perceptualObservations)) {
    if (!text(observation.id) || seenObservationIds.has(observation.id))
      fail(
        `Perceptual observation ${String(observation.id)} has a duplicate ID`,
      );
    seenObservationIds.add(observation.id);
    if (!text(observation.checkRef))
      fail(`Perceptual observation ${String(observation.id)} needs checkRef`);
    const check = checks.get(observation.checkRef);
    if (!check || check.method !== 'perceptual')
      fail(
        `Perceptual observation ${String(observation.id)} references an invalid check`,
      );
    if (!allStatuses.has(observation.epistemicStatus))
      fail(
        `Perceptual observation ${String(observation.id)} has an invalid epistemic status`,
      );
    if (
      ['unknown', 'proposed'].includes(observation.epistemicStatus) &&
      observation.result !== 'incomplete'
    )
      fail(
        `Perceptual observation ${String(observation.id)} cannot establish an unestablished verdict`,
      );
    if (['passed', 'failed'].includes(observation.result)) {
      assertObservationReferences(
        observation,
        check,
        captures,
        knownSourceRefs,
      );
      const key = `${check.id}:${list(observation.targetCaptureRefs).sort().join(',')}`;
      if (seenObservationContexts.has(key))
        fail(
          `Duplicate perceptual observation for ${check.id} and target context`,
        );
      seenObservationContexts.add(key);
    } else {
      if (
        observation.sourceCaptureRefs !== undefined ||
        observation.targetCaptureRefs !== undefined
      )
        assertObservationReferences(
          observation,
          check,
          captures,
          knownSourceRefs,
          { required: false },
        );
      if (!list(observation.limitations).length)
        fail(
          `Incomplete perceptual observation ${String(observation.id)} needs a limitation`,
        );
    }
  }
  const seenMeasurements = new Set();
  const seenMeasurementIds = new Set();
  for (const measurement of list(evidence?.fidelityMeasurements)) {
    if (!text(measurement.id) || seenMeasurementIds.has(measurement.id))
      fail(`Fidelity measurement ${String(measurement.id)} has a duplicate ID`);
    seenMeasurementIds.add(measurement.id);
    const check = checks.get(measurement.checkRef);
    if (!check || check.method !== 'measurement')
      fail(
        `Fidelity measurement ${String(measurement.id)} references an invalid check`,
      );
    if (!captures.has(measurement.captureRef))
      fail(
        `Fidelity measurement ${String(measurement.id)} references an unknown capture`,
      );
    if (
      !check.targetContexts.some(
        (context) =>
          auditContextKey(context) ===
          auditContextKey(
            captureContextOrFail(
              captures.get(measurement.captureRef),
              `Capture ${measurement.captureRef}`,
            ),
          ),
      )
    )
      fail(
        `Fidelity measurement ${String(measurement.id)} references a capture outside its check context`,
      );
    const obligation = verification.obligations.find(
      (candidate) => candidate.id === check.obligationRef,
    );
    if (
      obligation?.constraintRef &&
      measurement.constraintRef !== undefined &&
      measurement.constraintRef !== obligation.constraintRef
    )
      fail(
        `Fidelity measurement ${String(measurement.id)} references a different constraint`,
      );
    if (
      !['string', 'number', 'boolean'].includes(typeof measurement.value) ||
      (typeof measurement.value === 'number' &&
        !Number.isFinite(measurement.value))
    )
      fail(
        `Fidelity measurement ${String(measurement.id)} has an invalid value`,
      );
    if (
      !text(measurement.target) ||
      !text(measurement.property) ||
      !text(measurement.unit)
    )
      fail(
        `Fidelity measurement ${String(measurement.id)} has incomplete semantic fields`,
      );
    const key = `${measurement.captureRef}:${measurement.target}:${measurement.property}`;
    if (seenMeasurements.has(key))
      fail(`Duplicate fidelity measurement ${key}`);
    seenMeasurements.add(key);
  }
  for (const interaction of list(evidence?.interactions)) {
    for (const checkRef of list(interaction.checkRefs)) {
      const check = checks.get(checkRef);
      if (!check || check.method !== 'interaction')
        fail(
          `Interaction ${String(interaction.id)} references an invalid check`,
        );
      if (
        new Set(list(interaction.checkRefs)).size !==
        list(interaction.checkRefs).length
      )
        fail(`Interaction ${String(interaction.id)} has duplicate checkRefs`);
      if (!text(interaction.id)) fail('Linked interaction needs an ID');
      if (!text(interaction.captureRef))
        fail(
          `Interaction ${String(interaction.id)} linked to ${checkRef} needs captureRef`,
        );
      const capture = captures.get(interaction.captureRef);
      if (!capture)
        fail(
          `Interaction ${String(interaction.id)} references an unknown capture`,
        );
      if (!checkMatchesCapture(check, capture))
        fail(
          `Interaction ${String(interaction.id)} references a capture outside its check context`,
        );
    }
  }
  for (const accessibility of list(evidence?.accessibilityChecks)) {
    if (
      new Set(list(accessibility.checkRefs)).size !==
      list(accessibility.checkRefs).length
    )
      fail(
        `Accessibility check ${String(accessibility.id)} has duplicate checkRefs`,
      );
    for (const checkRef of list(accessibility.checkRefs)) {
      const check = checks.get(checkRef);
      if (!check || check.method !== 'accessibility')
        fail(
          `Accessibility check ${String(accessibility.id)} references an invalid check`,
        );
      if (!text(accessibility.captureRef))
        fail(
          `Accessibility check ${String(accessibility.id)} linked to ${checkRef} needs captureRef`,
        );
      const capture = captures.get(accessibility.captureRef);
      if (!capture)
        fail(
          `Accessibility check ${String(accessibility.id)} references an unknown capture`,
        );
      if (!checkMatchesCapture(check, capture))
        fail(
          `Accessibility check ${String(accessibility.id)} references a capture outside its check context`,
        );
    }
  }
  return true;
}

/** Validate and evaluate the verification registry against normalized evidence. */
export function evaluateAuditVerification({
  verification,
  evidence,
  dna,
  sourceRefs = null,
}) {
  if (!verification)
    return { status: 'not-requested', checks: [], unresolved: [] };
  if (verification.auditContractVersion !== auditContractVersion)
    fail('Verification registry has an incompatible audit contract version');
  if (dna && verification.dnaFingerprint !== designDnaFingerprint(dna))
    fail('Verification registry is bound to a different Design DNA');
  const checks = list(verification.checks);
  const checkMap = new Map(checks.map((check) => [check.id, check]));
  if (checkMap.size !== checks.length)
    fail('Verification check IDs must be unique');
  const captures = new Map(
    list(evidence?.captures).map((capture) => [capture.id, capture]),
  );
  const sources =
    sourceRefs instanceof Set
      ? sourceRefs
      : new Set(
          list(evidence?.sourceCaptures ?? dna?.sources).map(
            (source) => source.id,
          ),
        );
  const observationsByCheck = new Map();
  for (const observation of list(evidence?.perceptualObservations)) {
    if (!observation.checkRef) continue;
    const check = checkMap.get(observation.checkRef);
    if (!check || check.method !== 'perceptual')
      fail(
        `Observation ${observation.id} references an invalid perceptual check`,
      );
    if (!allStatuses.has(observation.epistemicStatus))
      fail(`Observation ${observation.id} has an invalid epistemic status`);
    if (
      (observation.epistemicStatus === 'unknown' ||
        observation.epistemicStatus === 'proposed') &&
      observation.result !== 'incomplete'
    )
      fail(
        `Observation ${observation.id} cannot establish a ${observation.epistemicStatus} verdict`,
      );
    if (['passed', 'failed'].includes(observation.result))
      assertObservationReferences(observation, check, captures, sources);
    else {
      if (
        observation.sourceCaptureRefs !== undefined ||
        observation.targetCaptureRefs !== undefined
      )
        assertObservationReferences(observation, check, captures, sources, {
          required: false,
        });
      if (!list(observation.limitations).length)
        fail(`Incomplete observation ${observation.id} needs a limitation`);
    }
    const key = `${check.id}:${[...list(observation.targetCaptureRefs)]
      .sort()
      .join(',')}`;
    if (observationsByCheck.has(key))
      fail(`Contradictory or duplicate observation for ${check.id}`);
    observationsByCheck.set(key, observation);
  }
  const measurementByCheck = new Map();
  for (const measurement of list(evidence?.fidelityMeasurements)) {
    const check = checkMap.get(measurement.checkRef);
    if (!check || check.method !== 'measurement')
      fail(
        `Measurement ${measurement.id} references an invalid measurement check`,
      );
    if (!captures.has(measurement.captureRef))
      fail(`Measurement ${measurement.id} references an unknown capture`);
    if (
      !check.targetContexts.some(
        (context) =>
          auditContextKey(context) ===
          auditContextKey(
            captureContextOrFail(
              captures.get(measurement.captureRef),
              `Capture ${measurement.captureRef}`,
            ),
          ),
      )
    )
      fail(
        `Measurement ${measurement.id} references a capture outside its check context`,
      );
    const key = `${measurement.captureRef}:${measurement.target}:${measurement.property}`;
    if (measurementByCheck.has(key)) fail(`Duplicate measurement for ${key}`);
    measurementByCheck.set(key, measurement);
  }
  const interactionByCheck = new Map();
  for (const interaction of list(evidence?.interactions)) {
    for (const checkRef of list(interaction.checkRefs)) {
      const check = checkMap.get(checkRef);
      if (!check || check.method !== 'interaction')
        fail(
          `Interaction ${interaction.id} references an invalid interaction check`,
        );
      const key = `${check.id}:${interaction.id}`;
      if (interactionByCheck.has(key))
        fail(`Duplicate interaction evidence for ${key}`);
      interactionByCheck.set(key, interaction);
    }
  }
  const accessibilityByCheck = new Map();
  for (const check of list(evidence?.accessibilityChecks)) {
    for (const checkRef of list(check.checkRefs)) {
      const planned = checkMap.get(checkRef);
      if (!planned || planned.method !== 'accessibility')
        fail(`Accessibility check ${check.id} references an invalid check`);
      const key = `${planned.id}:${check.id}`;
      if (accessibilityByCheck.has(key))
        fail(`Duplicate accessibility evidence for ${key}`);
      accessibilityByCheck.set(key, check);
    }
  }
  const evaluations = [];
  for (const check of checks) {
    const obligation = verification.obligations.find(
      (item) => item.id === check.obligationRef,
    );
    if (!obligation)
      fail(`Verification check ${check.id} references an unknown obligation`);
    if (obligation.disposition !== 'requirement')
      fail(
        `Verification check ${check.id} references a non-required obligation`,
      );
    let result;
    if (check.method === 'perceptual') {
      const linked = [...observationsByCheck.entries()]
        .filter(([key]) => key.startsWith(`${check.id}:`))
        .map(([, observation]) => observation);
      result = resultFromObservations(linked);
    } else if (check.method === 'measurement') {
      const constraint =
        dna?.fidelity?.constraints?.find(
          (item) => item.id === obligation.constraintRef,
        ) ??
        (obligation.constraintRef
          ? {
              id: obligation.constraintRef,
              measurement: obligation.measurement,
              acceptance: obligation.acceptance ?? { status: 'accepted' },
              claim: { epistemicStatus: obligation.epistemicStatus },
            }
          : null);
      if (!constraint)
        fail(`Measurement check ${check.id} has no fidelity constraint`);
      const measurements = [...measurementByCheck.entries()]
        .filter(([, measurement]) => measurement.checkRef === check.id)
        .map(([, measurement]) => measurement);
      const byCapture = new Map();
      for (const measurement of measurements) {
        const group = byCapture.get(measurement.captureRef) ?? [];
        group.push({
          target: measurement.target,
          property: measurement.property,
          unit: measurement.unit,
          value: measurement.value,
        });
        byCapture.set(measurement.captureRef, group);
      }
      const constraintResults = [...byCapture.values()].map(
        (group) =>
          evaluateFidelityConstraints(
            { fidelity: { constraints: [constraint] } },
            group,
          )[0],
      );
      const constraintResult =
        constraintResults.length === 0
          ? {
              result: 'incomplete',
              actual: null,
              reason: 'No measurement was recorded for the target context.',
            }
          : constraintResults.some((item) => item.result === 'failed')
            ? constraintResults.find((item) => item.result === 'failed')
            : constraintResults.some((item) => item.result === 'incomplete')
              ? constraintResults.find((item) => item.result === 'incomplete')
              : constraintResults[0];
      result = {
        result: constraintResult.result,
        evidenceRefs: measurements.map((measurement) => measurement.id),
        reason: constraintResult.reason,
      };
    } else {
      const linked = [
        ...(check.method === 'interaction'
          ? interactionByCheck
          : accessibilityByCheck
        ).entries(),
      ]
        .filter(([key]) => key.startsWith(`${check.id}:`))
        .map(([, item]) => item);
      if (linked.length === 0)
        result = {
          result: 'incomplete',
          evidenceRefs: [],
          reason: 'No linked browser observation was recorded.',
        };
      else if (linked.some((item) => item.passed === false))
        result = {
          result: 'failed',
          evidenceRefs: linked.map((item) => item.id),
          reason: 'A linked browser observation failed.',
        };
      else
        result = {
          result: 'passed',
          evidenceRefs: linked.map((item) => item.id),
          reason: 'All linked browser observations passed.',
        };
    }
    evaluations.push({
      checkRef: check.id,
      obligationRef: obligation.id,
      layer: check.layer,
      method: check.method,
      targetContexts: check.targetContexts,
      ...result,
    });
  }
  const status = evaluations.some((item) => item.result === 'failed')
    ? 'failed'
    : verification.unresolved.length > 0 ||
        evaluations.some((item) => item.result === 'incomplete')
      ? 'incomplete'
      : 'passed';
  return { status, checks: evaluations, unresolved: verification.unresolved };
}

export function verificationCoverage(verification, evaluation) {
  if (!verification) return null;
  const values = list(evaluation?.checks);
  const obligations = list(verification.obligations);
  return {
    contractVersion: auditContractVersion,
    expected: verification.checks.length,
    evaluated: values.length,
    passed: values.filter((item) => item.result === 'passed').length,
    failed: values.filter((item) => item.result === 'failed').length,
    incomplete: values.filter((item) => item.result === 'incomplete').length,
    unresolved: verification.unresolved.length,
    unresolvedItems: verification.unresolved,
    checks: values,
    exclusions: verification.exclusions,
    excluded: obligations
      .filter((item) => item.disposition === 'excluded')
      .map((item) => ({
        obligationRef: item.id,
        layer: item.layer,
        reason:
          item.acceptance?.basis ?? 'Excluded by the accepted audit scope.',
      })),
    calibration: obligations
      .filter((item) => item.disposition === 'calibration')
      .map((item) => ({
        obligationRef: item.id,
        layer: item.layer,
        reason:
          item.acceptance?.basis ??
          'Pending calibration; not an audit requirement.',
      })),
    diagnostics: obligations
      .filter((item) => item.disposition === 'diagnostic')
      .map((item) => ({
        obligationRef: item.id,
        layer: item.layer,
        reason: item.statement || 'Source behavior is not established.',
      })),
  };
}
