import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { validateDesignDna } from '../../src/runtime/design-dna.mjs';
import { projectDocumentation } from '../../src/runtime/install.mjs';
import {
  evaluateFidelityConstraints,
  fidelityReadiness,
} from '../../src/runtime/fidelity.mjs';

const read = async (name) =>
  JSON.parse(
    await fs.readFile(new URL('../../' + name, import.meta.url), 'utf8'),
  );
const reference = () => read('examples/design-dna.fidelity.reference.json');
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const schema = ajv.compile(await read('schemas/design-dna.schema.json'));

test('complete coverage requires routed artifacts and no unresolved gaps in schema and runtime', async () => {
  const dna = await reference();
  assert.deepEqual(await validateDesignDna(dna, { requireFidelity: true }), []);
  assert.equal(schema(dna), true, JSON.stringify(schema.errors));
  const facet = dna.coverage.axes[0].facets[0];
  facet.coverageStatus = 'complete';
  facet.gaps = [];
  facet.artifactRefs = [];
  assert.equal(schema(dna), false);
  assert.match((await validateDesignDna(dna)).join('\n'), /artifactRefs/);
  facet.artifactRefs = [dna.tokens[0].id];
  dna.tokens[0].claim.conceptRefs = ['concept.typographic-system'];
  assert.match((await validateDesignDna(dna)).join('\n'), /routed to its axis/);
  facet.coverageStatus = 'partial';
  const domain = dna.coverage.uiDomains.find(
    (item) => item.applicability === 'detected',
  );
  domain.coverageStatus = 'complete';
  domain.artifactRefs = [];
  domain.gaps = [];
  assert.equal(schema(dna), false);
  assert.match((await validateDesignDna(dna)).join('\n'), /artifactRefs/);
  domain.artifactRefs = [dna.tokens[0].id];
  dna.tokens[0].claim.uiDomainRefs = [];
  assert.match(
    (await validateDesignDna(dna)).join('\n'),
    /routed to its domain/,
  );
  domain.gaps = ['A visible relationship is still unresolved.'];
  assert.equal(schema(dna), false);
});

test('new extractions require independent assertions without promoting legacy behavior', async () => {
  const dna = await reference();
  const state = dna.componentPatterns[0].states[0];
  delete state.assertions.behavior;
  assert.equal(schema(dna), false);
  assert.match((await validateDesignDna(dna)).join('\n'), /assertions/);
  const legacy = await read('examples/design-dna.reference-v0.3.json');
  assert.deepEqual(await validateDesignDna(legacy), []);
  assert.match(
    (await validateDesignDna(legacy, { requireFidelity: true })).join('\n'),
    /new extraction requires/,
  );
  const docs = await projectDocumentation(legacy);
  assert.match(docs.get('components/states.md'), /unknown.*Legacy note/);
  assert.equal(fidelityReadiness(legacy).visualFidelity, 'not-established');
});

test('assertions retain exact statements, evidence routing and separate acceptance', async () => {
  const dna = await reference();
  dna.rules[0].assertions.requirements[0].statement =
    'Different from the legacy mirror';
  assert.match(
    (await validateDesignDna(dna)).join('\n'),
    /differs from its entry/,
  );
  dna.rules[0].assertions.requirements[0].statement =
    dna.rules[0].requirements[0];
  const claim = dna.componentPatterns[0].states[0].assertions.behavior;
  claim.epistemicStatus = 'observed';
  claim.evidenceRefs = [];
  assert.match((await validateDesignDna(dna)).join('\n'), /evidenceRefs/);
  claim.epistemicStatus = 'proposed';
  const constraint = dna.fidelity.constraints[0];
  constraint.acceptance = {
    status: 'accepted',
    basis: 'Reviewed synthetic calibration for this test only.',
  };
  assert.deepEqual(await validateDesignDna(dna), []);
  assert.equal(constraint.claim.epistemicStatus, 'proposed');
  constraint.claim.epistemicStatus = 'unknown';
  assert.match(
    (await validateDesignDna(dna)).join('\n'),
    /unknown constraints cannot be accepted/,
  );
  delete dna.fidelity;
  assert.match(
    (await validateDesignDna(dna)).join('\n'),
    /assertions require a declared contract/,
  );
});

test('documentation preserves relationships, dependent recipes and field provenance', async () => {
  const dna = await reference();
  const metric = dna.tokens.find((t) => t.id === 'token.type.metric-hierarchy');
  const spacing = dna.tokens.find((t) => t.id === 'token.spacing-rhythm');
  const expression =
    'Value-to-context distance stays below peer-to-peer metric distance.';
  metric.relationships.push({
    kind: 'pair',
    targetRef: spacing.id,
    expression,
  });
  const docs = await projectDocumentation(dna);
  const recipe = docs.get('patterns/stats-and-kpis.md');
  assert.ok(recipe, 'Domain recipe exists');
  for (const text of [
    expression,
    spacing.claim.statement,
    dna.componentPatterns[0].purpose,
    dna.rules[0].rationale,
    'Candidate metric-to-label size ratio',
    'programmaticState',
    'Validation status',
    'Selection conditions',
    'Visual differences',
  ])
    assert.ok(recipe.includes(text), text);
  assert.equal(docs.size, 52);
  assert.match(docs.get('governance/calibration.md'), /Acceptance: `pending`/);
  assert.equal(fidelityReadiness(dna).status, 'ready-for-benchmark');
  assert.equal(fidelityReadiness(dna).visualFidelity, 'not-established');
});

test('domain recipes include cross-domain token and component dependencies without repeating cycles', async () => {
  const dna = await reference();
  const directToken = structuredClone(dna.tokens[0]);
  directToken.id = 'token.test.direct-dependency';
  directToken.name = 'Direct dependency token';
  directToken.claim.uiDomainRefs = [];
  const transitiveToken = structuredClone(directToken);
  transitiveToken.id = 'token.test.transitive-dependency';
  transitiveToken.name = 'Transitive dependency token';
  transitiveToken.relationships = [
    { kind: 'pair', targetRef: directToken.id, expression: 'A test cycle.' },
  ];
  const component = structuredClone(dna.componentPatterns[0]);
  component.id = 'component.test.cross-domain';
  component.name = 'Cross-domain support component';
  component.uiDomainRefs = [
    dna.coverage.uiDomains.find((d) => d.domainRef !== 'domain.stats-kpis')
      .domainRef,
  ];
  component.claim.uiDomainRefs = component.uiDomainRefs;
  component.tokenRefs = [transitiveToken.id];
  component.ruleRefs = [dna.rules[0].id];
  dna.rules[0].dependsOn.push(directToken.id, component.id);
  dna.tokens.push(directToken, transitiveToken);
  dna.componentPatterns.push(component);
  const docs = await projectDocumentation(dna);
  const recipe = docs.get('patterns/stats-and-kpis.md');
  for (const heading of [
    '#### Token: Direct dependency token',
    '#### Token: Transitive dependency token',
    '#### Component: Cross-domain support component',
  ])
    assert.equal(recipe.split(heading).length - 1, 1, heading);
});

test('calibration evaluates ratios and tolerance while preserving proposals and missing evidence', async () => {
  const dna = await reference();
  const observations = [
    { target: 'metric-value', property: 'font-size', unit: 'px', value: 28 },
    { target: 'metric-label', property: 'font-size', unit: 'px', value: 14 },
  ];
  assert.equal(
    evaluateFidelityConstraints(dna, observations)[0].result,
    'passed',
  );
  observations[0].value = 40;
  const failed = evaluateFidelityConstraints(dna, observations)[0];
  assert.equal(failed.result, 'failed');
  assert.equal(failed.disposition, 'calibration');
  assert.equal(failed.epistemicStatus, 'proposed');
  observations[1].unit = 'rem';
  assert.equal(
    evaluateFidelityConstraints(dna, observations)[0].result,
    'incomplete',
  );
  assert.equal(evaluateFidelityConstraints(dna, [])[0].result, 'incomplete');
  assert.throws(
    () => evaluateFidelityConstraints(dna, [observations[0], observations[0]]),
    /Duplicate/,
  );
  assert.throws(
    () => evaluateFidelityConstraints(dna, [{ value: NaN }]),
    /Invalid/,
  );
  dna.fidelity.constraints[0].acceptance.status = 'accepted';
  assert.equal(
    evaluateFidelityConstraints(dna, [])[0].disposition,
    'requirement',
  );
});
