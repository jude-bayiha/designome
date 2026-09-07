import { DesignomeError } from './errors.mjs';
import { admitsSubject } from './context.mjs';

function check(condition, message) {
  if (!condition)
    throw new DesignomeError(message, { code: 'INVALID_CONTEXT_STAGE' });
}

export function stageScaffold(pack) {
  return pack.routing.axes.map((axis) => ({
    schemaVersion: '1.0.0',
    axisRef: axis.axisRef,
    executionStatus: axis.executionStatus,
    packHash: null,
    inputHash: null,
    reason: axis.reasons.join(', '),
    fragment: null,
    facetCoverage: axis.facetRefs.map((facetRef) => ({
      facetRef,
      coverageStatus: 'unknown',
      claimRefs: [],
      gaps: ['This specialist has not executed.'],
    })),
  }));
}

export function validateStageEnvelope(envelope, pack) {
  check(
    envelope && typeof envelope === 'object',
    'Stage envelope must be an object',
  );
  const keys = [
    'schemaVersion',
    'axisRef',
    'executionStatus',
    'packHash',
    'inputHash',
    'reason',
    'fragment',
    'facetCoverage',
  ];
  check(
    Object.keys(envelope).every((key) => keys.includes(key)) &&
      keys.every((key) => Object.hasOwn(envelope, key)),
    'Unexpected or missing envelope field',
  );
  const axis = pack.routing.axes.find(
    (item) => item.axisRef === envelope.axisRef,
  );
  check(axis, 'Unknown stage axis');
  check(envelope.schemaVersion === '1.0.0', 'Invalid stage schema version');
  if (axis.executionStatus === 'skipped') {
    check(
      envelope.executionStatus === 'skipped' &&
        envelope.fragment === null &&
        envelope.packHash === null &&
        envelope.inputHash === null &&
        typeof envelope.reason === 'string' &&
        envelope.reason.length > 0,
      'Skipped stage cannot contain claims or a completed artifact',
    );
  } else {
    check(
      ['complete', 'partial', 'blocked'].includes(envelope.executionStatus),
      'Pending stage has not executed',
    );
    check(
      envelope.packHash === pack.packHash &&
        envelope.inputHash === pack.inputHash,
      'Stage is bound to a different context',
    );
    check(
      pack.axisRef === axis.axisRef ||
        (pack.phase === 'governance' &&
          axis.axisRef === 'axis.system-governance'),
      'Wrong specialist context',
    );
    const fragment = envelope.fragment;
    check(
      fragment &&
        fragment.stageId === axis.axisRef.replace('axis.', 'prompt.') &&
        fragment.status === envelope.executionStatus,
      'Fragment stage identity or status mismatch',
    );
    for (const key of [
      'claims',
      'unknowns',
      'conflicts',
      'facetCoverage',
      'uiDomainContributions',
      'handoff',
    ])
      check(Array.isArray(fragment[key]), `Missing fragment ${key}`);
    const ids = new Set();
    const canonicalRefs = new Set();
    for (const node of pack.nodes) {
      if (node.source !== 'concepts/concept-matrix.v0.3.json') continue;
      if (node.pointer === '')
        for (const collection of ['axes', 'concepts', 'uiDomains'])
          node.value[collection].forEach((item) => canonicalRefs.add(item.id));
      else if (/^\/(axes|concepts|uiDomains)\/\d+\/id$/u.test(node.pointer))
        canonicalRefs.add(node.value);
      else if (node.value?.id) canonicalRefs.add(node.value.id);
    }
    for (const claim of fragment.claims) {
      check(
        typeof claim.id === 'string' &&
          claim.id.length > 0 &&
          !ids.has(claim.id),
        'Duplicate or missing claim ID',
      );
      ids.add(claim.id);
      check(
        ['observed', 'inferred', 'proposed', 'unknown'].includes(
          claim.epistemicStatus,
        ),
        'Invalid epistemic status',
      );
      check(
        typeof claim.statement === 'string' &&
          claim.statement.length > 0 &&
          Array.isArray(claim.scope) &&
          claim.scope.length > 0 &&
          Array.isArray(claim.exceptions),
        'Claim lacks statement, scope or exceptions',
      );
      check(
        Number.isFinite(claim.confidence?.score) &&
          claim.confidence.score >= 0 &&
          claim.confidence.score <= 1 &&
          typeof claim.confidence.basis === 'string' &&
          claim.confidence.basis.length > 0,
        'Claim lacks confidence and basis',
      );
      check(
        typeof claim.validation?.method === 'string' &&
          claim.validation.method.length > 0 &&
          ['pending', 'passed', 'failed', 'not-applicable'].includes(
            claim.validation.status,
          ),
        'Claim lacks validation',
      );
      check(
        Array.isArray(claim.evidenceRefs) &&
          Array.isArray(claim.conceptRefs) &&
          Array.isArray(claim.uiDomainRefs),
        'Claim references must be arrays',
      );
      check(
        [
          ...claim.conceptRefs,
          ...claim.uiDomainRefs,
          ...(claim.axisRefs ?? []),
        ].every((ref) => canonicalRefs.has(ref)),
        'Claim references unknown canonical subjects',
      );
      if (['observed', 'inferred'].includes(claim.epistemicStatus))
        check(
          claim.evidenceRefs.length > 0,
          'Observed or inferred claim requires evidence',
        );
      for (const evidenceRef of claim.evidenceRefs) {
        const region = pack.payload.evidence?.regions.find(
          (item) => item.id === evidenceRef,
        );
        const decision = pack.routing.decisions.find(
          (item) => item.evidenceRef === evidenceRef,
        );
        check(
          region && decision?.disposition === 'admitted',
          'Claim uses absent or excluded evidence',
        );
        const subject = {
          axisRefs: claim.axisRefs ?? [axis.axisRef],
          conceptRefs: claim.conceptRefs,
          uiDomainRefs: claim.uiDomainRefs,
          tokenCategories: claim.tokenCategories ?? [],
          ruleCategories: claim.ruleCategories ?? [],
        };
        check(
          admitsSubject(decision.directive, subject),
          'Claim exceeds source admission boundaries',
        );
        // Region concept tags discover specialists; source directives carry
        // hard concept restrictions. A specialist may refine unclassified tags.
        for (const key of ['uiDomainRefs'])
          check(
            subject[key].every((ref) => region[key].includes(ref)),
            'Claim exceeds region evidence subjects',
          );
      }
    }
    check(
      JSON.stringify(envelope.facetCoverage) ===
        JSON.stringify(fragment.facetCoverage),
      'Envelope coverage differs from fragment',
    );
    for (const facet of fragment.facetCoverage)
      check(
        Array.isArray(facet.claimRefs) &&
          facet.claimRefs.every((ref) => ids.has(ref)),
        'Coverage references an absent claim',
      );
  }
  check(
    Array.isArray(envelope.facetCoverage) &&
      envelope.facetCoverage.length === axis.facetRefs.length &&
      new Set(envelope.facetCoverage.map((item) => item.facetRef)).size ===
        axis.facetRefs.length,
    'Exactly five unique facets are required',
  );
  for (const facet of envelope.facetCoverage) {
    check(
      axis.facetRefs.includes(facet.facetRef) &&
        ['complete', 'partial', 'unknown', 'not-applicable'].includes(
          facet.coverageStatus,
        ) &&
        Array.isArray(facet.gaps) &&
        Array.isArray(facet.claimRefs),
      'Invalid facet coverage',
    );
    if (envelope.executionStatus === 'skipped')
      check(
        facet.coverageStatus === 'unknown' &&
          facet.claimRefs.length === 0 &&
          facet.gaps.length > 0,
        'Skipped is unknown, never implicit completion or non-applicability',
      );
    if (['unknown', 'not-applicable'].includes(facet.coverageStatus))
      check(facet.gaps.length > 0, 'Coverage requires an explicit reason');
    if (facet.coverageStatus === 'complete')
      check(
        facet.claimRefs.length > 0,
        'Complete facet requires a supported answer, not just a label',
      );
  }
  return {
    valid: true,
    validation: 'structural-and-admission-only',
    axisRef: axis.axisRef,
  };
}
