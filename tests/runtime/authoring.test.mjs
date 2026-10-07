import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { validateDesignDna } from '../../src/runtime/design-dna.mjs';
import { expandDesignDna } from '../../src/runtime/dna-authoring.mjs';
import { renderMatrixBrief } from '../../src/runtime/matrix-brief.mjs';

const read = async (name) =>
  JSON.parse(
    await fs.readFile(new URL('../../' + name, import.meta.url), 'utf8'),
  );
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const stateFields = ['trigger', 'behavior', 'feedback', 'exit'];

// Remove every field expand-dna can rebuild, as an extraction would omit it.
function authoringForm(canonical) {
  const dna = structuredClone(canonical);
  const stripClaim = (claim, parent) => {
    for (const key of ['conceptRefs', 'uiDomainRefs', 'scope'])
      if (same(claim[key], parent[key])) delete claim[key];
    for (const key of ['exceptions', 'evidenceRefs'])
      if (same(claim[key], [])) delete claim[key];
    if (
      claim.epistemicStatus === parent.epistemicStatus &&
      same(claim.confidence, parent.confidence)
    )
      delete claim.confidence;
    if (
      same(claim.validation, {
        method: parent.validation.method,
        status: 'pending',
      })
    )
      delete claim.validation;
  };
  const strip = (owner, parent, singles = false) => {
    for (const [field, value] of Object.entries(owner.assertions ?? {})) {
      for (const claim of Array.isArray(value) ? value : [value])
        stripClaim(claim, parent);
      if (!singles) delete owner[field];
      else if (field === 'appearance') {
        delete owner.epistemicStatus;
        delete owner.evidenceRefs;
      } else if ([...stateFields, 'programmaticState'].includes(field))
        delete owner[field];
    }
  };
  for (const rule of dna.rules) strip(rule, rule.claim);
  for (const component of dna.componentPatterns) {
    strip(component, component.claim);
    for (const part of component.anatomy) strip(part, component.claim);
    for (const variant of component.variants) strip(variant, component.claim);
    for (const state of component.states) strip(state, component.claim, true);
  }
  return dna;
}

test('expand-dna rebuilds canonical assertions and mirrors from authoring shorthand', async () => {
  const canonical = await read('examples/design-dna.fidelity.reference.json');
  const authoring = authoringForm(canonical);
  assert.ok(
    JSON.stringify(authoring).length < JSON.stringify(canonical).length,
  );
  const { dna, filled } = expandDesignDna(authoring);
  assert.deepEqual(dna, canonical);
  assert.ok(filled.mirrors > 0 && filled.scope > 0);
  assert.deepEqual(await validateDesignDna(dna, { requireFidelity: true }), []);
  // Expanding canonical DNA changes nothing.
  assert.deepEqual(expandDesignDna(canonical).dna, canonical);
});

test('expand-dna never inherits status, evidence or confidence across statuses', async () => {
  const canonical = await read('examples/design-dna.fidelity.reference.json');
  const authoring = authoringForm(canonical);
  const state = authoring.componentPatterns
    .flatMap((component) => component.states)
    .find((item) => item.assertions);
  delete state.assertions.trigger.epistemicStatus;
  const component = authoring.componentPatterns.find(
    (item) => item.claim.epistemicStatus === 'observed',
  );
  const differing = {
    statement:
      'Proposed (not visible in the screenshots): a new composition note.',
    epistemicStatus: 'proposed',
  };
  component.assertions.compositionRules.push(differing);
  const { dna } = expandDesignDna(authoring);
  const expandedState = dna.componentPatterns
    .flatMap((item) => item.states)
    .find((item) => item.name === state.name);
  assert.equal(expandedState.assertions.trigger.epistemicStatus, undefined);
  const expandedComponent = dna.componentPatterns.find(
    (item) => item.id === component.id,
  );
  const added = expandedComponent.assertions.compositionRules.at(-1);
  assert.equal(added.confidence, undefined);
  assert.deepEqual(added.evidenceRefs, []);
  assert.equal(expandedComponent.compositionRules.at(-1), differing.statement);
  const errors = (await validateDesignDna(dna, { requireFidelity: true })).join(
    '\n',
  );
  assert.match(errors, /epistemicStatus/u);
  assert.match(errors, /confidence/u);
});

test('the matrix brief keeps every extraction identifier at a fraction of the JSON', async () => {
  const matrix = await read('concepts/concept-matrix.v0.3.json');
  const brief = renderMatrixBrief(matrix);
  const identifiers = [
    ...matrix.epistemicStatuses,
    ...matrix.tokenCategories,
    ...matrix.ruleCategories,
    ...matrix.axes.flatMap((axis) => [
      axis.id,
      axis.promptRef,
      ...axis.facets.map((facet) => facet.id),
    ]),
    ...matrix.concepts.map((concept) => concept.id),
    ...matrix.uiDomains.map((domain) => domain.id),
  ];
  for (const id of identifiers) assert.ok(brief.includes(`\`${id}\``), id);
  for (const facet of matrix.axes.flatMap((axis) => axis.facets))
    for (const limit of facet.screenshotLimits)
      assert.ok(brief.includes(limit), facet.id);
  assert.ok(brief.length * 2 < JSON.stringify(matrix, null, 2).length);
});
