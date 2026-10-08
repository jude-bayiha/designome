// Authoring shorthand for Fidelity Contract assertions. An extraction writes
// each assertion with its own statement, status and evidence; routing, scope
// and validation repeat the owner claim in practice, so the runtime fills them
// deterministically and derives the legacy mirror fields. Status and evidence
// are never inherited: an appearance cannot lend its status to a behavior.

const stateFields = [
  'appearance',
  'trigger',
  'behavior',
  'feedback',
  'exit',
  'programmaticState',
];
const componentFields = [
  'compositionRules',
  'contentConstraints',
  'adaptationRules',
  'accessibilityRequirements',
  'antiPatterns',
];
const object = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const copy = (value) => structuredClone(value);

function completeClaim(claim, parent, filled) {
  if (!object(claim) || !object(parent)) return;
  for (const key of ['conceptRefs', 'uiDomainRefs', 'scope']) {
    if (claim[key] === undefined && parent[key] !== undefined) {
      claim[key] = copy(parent[key]);
      filled[key] += 1;
    }
  }
  for (const key of ['exceptions', 'evidenceRefs']) {
    if (claim[key] === undefined) {
      claim[key] = [];
      filled[key] += 1;
    }
  }
  // Confidence describes one status; reuse it only for the same status.
  if (
    claim.confidence === undefined &&
    claim.epistemicStatus === parent.epistemicStatus &&
    parent.confidence !== undefined
  ) {
    claim.confidence = copy(parent.confidence);
    filled.confidence += 1;
  }
  if (claim.validation === undefined && parent.validation?.method) {
    claim.validation = { method: parent.validation.method, status: 'pending' };
    filled.validation += 1;
  }
}

function expandOwner(owner, fields, parent, filled, singles = false) {
  if (!object(owner) || !object(owner.assertions)) return;
  for (const field of fields) {
    const value = owner.assertions[field];
    if (singles) {
      completeClaim(value, parent, filled);
      if (!object(value)) continue;
      if (field === 'appearance') {
        if (owner.epistemicStatus === undefined) {
          owner.epistemicStatus = value.epistemicStatus;
          filled.mirrors += 1;
        }
        if (owner.evidenceRefs === undefined) {
          owner.evidenceRefs = copy(value.evidenceRefs);
          filled.mirrors += 1;
        }
      } else if (owner[field] === undefined) {
        owner[field] = value.statement;
        filled.mirrors += 1;
      }
    } else if (Array.isArray(value)) {
      for (const claim of value) completeClaim(claim, parent, filled);
      if (owner[field] === undefined) {
        owner[field] = value.map((claim) => claim?.statement);
        filled.mirrors += 1;
      }
    }
  }
}

export function expandDesignDna(authoring) {
  const dna = structuredClone(authoring);
  const filled = {
    conceptRefs: 0,
    uiDomainRefs: 0,
    scope: 0,
    exceptions: 0,
    evidenceRefs: 0,
    confidence: 0,
    validation: 0,
    mirrors: 0,
  };
  // Assertions belong to the fidelity contract; legacy DNA stays untouched.
  if (!object(dna.fidelity)) return { dna, filled };
  for (const rule of Array.isArray(dna.rules) ? dna.rules : []) {
    expandOwner(rule, ['requirements'], rule?.claim, filled);
  }
  for (const component of Array.isArray(dna.componentPatterns)
    ? dna.componentPatterns
    : []) {
    const parent = component?.claim;
    expandOwner(component, componentFields, parent, filled);
    for (const part of component?.anatomy ?? [])
      expandOwner(part, ['contentConstraints'], parent, filled);
    for (const variant of component?.variants ?? [])
      expandOwner(variant, ['conditions', 'differences'], parent, filled);
    for (const state of component?.states ?? [])
      expandOwner(state, stateFields, parent, filled, true);
  }
  return { dna, filled };
}
