import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import Ajv2020 from 'ajv/dist/2020.js';
import {
  compileContext,
  contextView,
  contextHash,
  loadContextInput,
  recoverContext,
  resolveContextRouting,
  stableJson,
  validateContext,
  validateContextView,
  writeContext,
} from '../../src/runtime/context.mjs';
import {
  stageScaffold,
  validateStageEnvelope,
} from '../../src/runtime/context-stage.mjs';
import { pluginRoot, readJson, sha256 } from '../../src/runtime/files.mjs';
import { initializeRun } from '../../src/runtime/run.mjs';

const matrix = await readJson(
  path.join(pluginRoot, 'concepts/concept-matrix.v0.3.json'),
);
const schema = await readJson(
  path.join(pluginRoot, 'schemas/context-contract.schema.json'),
);
const validateSchema = new Ajv2020({ allErrors: true }).compile(schema);
const viewAjv = new Ajv2020({ allErrors: true });
viewAjv.addSchema(schema);
const validateViewSchema = viewAjv.compile({
  $ref: `${schema.$id}#/$defs/view`,
});
const axisRef = 'axis.data-display-visualization';
const execute = promisify(execFile);

test('canonical changes invalidate cached packs; missing originals never fabricate fallback', async (t) => {
  const directory = await temporary(t);
  const source = await input();
  const pack = await compileContext(source);
  for (const file of Object.keys(pack.canonicalHashes)) {
    await fs.mkdir(path.dirname(path.join(directory, file)), {
      recursive: true,
    });
    await fs.copyFile(path.join(pluginRoot, file), path.join(directory, file));
  }
  const options = { rootDirectory: directory };
  await validateContext(pack, source, options);
  const prompt = path.join(
    directory,
    'prompts/08-data-display-visualization.md',
  );
  await fs.appendFile(prompt, '\nAn additional canonical limitation.\n');
  await assert.rejects(validateContext(pack, source, options), /stale/);
  const recovered = await recoverContext(pack, source, options);
  assert.equal(recovered.pack.mode, 'full');
  assert.equal(recovered.requiresRerun, true);
  await fs.unlink(prompt);
  await assert.rejects(recoverContext(pack, source, options), {
    code: 'ENOENT',
  });
});

test('shadow keeps full execution and never claims semantic parity', async (t) => {
  const directory = await temporary(t);
  const specPath = path.join(directory, 'request-context.json');
  await fs.writeFile(
    specPath,
    JSON.stringify({ phase: 'request', mode: 'shadow' }),
  );
  const result = await writeContext({
    specPath,
    outputDirectory: path.join(directory, 'packs'),
  });
  const baseline = await readJson(result.packPath);
  const candidate = await readJson(result.comparison.candidatePath);
  assert.equal(result.comparison.executionMode, 'full');
  assert.equal(result.comparison.semanticParity, 'not-established');
  assert.equal(candidate.mode, 'lossless-pack');
  assert.deepEqual(baseline.routing, candidate.routing);
  assert.deepEqual(baseline.payload, candidate.payload);
  assert.ok(result.comparison.candidateBytes < result.comparison.baselineBytes);
});

async function input() {
  const request = await readJson(
    path.join(pluginRoot, 'examples/request-contract.extract.reference.json'),
  );
  request.parameters.focusUiDomainRefs = [];
  request.parameters.sources = [
    {
      ...request.parameters.sources[0],
      axisRefs: [],
      conceptRefs: [],
      uiDomainRefs: ['domain.stats-kpis'],
      tokenCategories: [],
      ruleCategories: [],
    },
  ];
  const sourcePath = request.parameters.sources[0].path;
  return {
    phase: 'analysis',
    sourceHashes: { [path.resolve(sourcePath)]: `sha256:${'a'.repeat(64)}` },
    mode: 'lossless-pack',
    axisRef,
    request,
    compatibility: {
      status: 'unknown',
      missing: ['Corporate page families'],
      exceptions: ['Dashboard stats only'],
    },
    evidence: {
      schemaVersion: '1.0.0',
      sources: [
        {
          path: sourcePath,
          contentHash: `sha256:${'a'.repeat(64)}`,
          complete: true,
          basis: 'Test fixture: not a visual assessment',
        },
      ],
      regions: [
        {
          id: 'evidence.stats',
          sourcePath,
          region: 'KPI row',
          basis: 'Synthetic routing fixture',
          confidence: 0.9,
          axisRefs: [axisRef],
          conceptRefs: [],
          uiDomainRefs: ['domain.stats-kpis'],
          tokenCategories: [],
          ruleCategories: [],
          limitations: ['Unknown tooltip behavior'],
        },
      ],
    },
  };
}

function pointerValue(root, pointer) {
  return pointer === ''
    ? root
    : pointer
        .slice(1)
        .split('/')
        .reduce(
          (value, key) =>
            value[key.replaceAll('~1', '/').replaceAll('~0', '~')],
          root,
        );
}

async function temporary(t) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'designome-context-test-'),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

test('every projected node equals its canonical JSON pointer; full and reduced obligations agree', async () => {
  const source = await input();
  const pack = await compileContext(source);
  assert.equal(
    validateSchema(pack),
    true,
    JSON.stringify(validateSchema.errors),
  );
  for (const node of pack.nodes) {
    const raw = await fs.readFile(path.join(pluginRoot, node.source), 'utf8');
    const original = node.source.endsWith('.json') ? JSON.parse(raw) : raw;
    assert.deepEqual(node.value, pointerValue(original, node.pointer));
    assert.equal(node.hash, contextHash(node.value));
  }
  const view = contextView(pack);
  assert.equal(
    validateViewSchema(view),
    true,
    JSON.stringify(validateViewSchema.errors),
  );
  for (const node of pack.nodes)
    assert.deepEqual(
      pointerValue(view.context[node.source], node.pointer),
      node.value,
    );
  await validateContextView(view, pack, source);
  const tamperedView = structuredClone(view);
  tamperedView.context['concepts/concept-matrix.v0.3.json'].axes[0].purpose =
    'A changed purpose';
  await assert.rejects(
    validateContextView(tamperedView, pack, source),
    /Host view differs/,
  );
  const full = await compileContext({ ...source, mode: 'full' });
  assert.ok(
    Buffer.byteLength(stableJson(view)) <
      Buffer.byteLength(stableJson(contextView(full))) * 0.75,
  );
  assert.deepEqual(pack.routing, full.routing);
  assert.deepEqual(pack.payload, full.payload);
  const axis = matrix.axes.find((item) => item.id === axisRef);
  assert.ok(
    pack.nodes.some(
      (node) => node.value.id === axisRef && node.value.facets.length === 5,
    ),
  );
  for (const conceptRef of axis.conceptRefs)
    assert.ok(
      pack.nodes.some(
        (node) =>
          node.value.id === conceptRef &&
          Array.isArray(node.value.screenshotLimits),
      ),
    );
  assert.ok(
    pack.nodes.some(
      (node) =>
        node.value.id === 'domain.stats-kpis' &&
        node.value.stressTests.length > 0,
    ),
  );
  assert.equal(pack.routing.axes.length, 13);
  assert.equal(pack.routing.axes.flatMap((item) => item.facetRefs).length, 65);
  assert.ok(pack.metrics.serializedBytes < full.metrics.serializedBytes);
  assert.equal(pack.metrics.semanticParity, 'not-established');
});

test('recomputed checksums cannot conceal removed, mutated or injected nodes', async () => {
  const source = await input();
  const pack = await compileContext(source);
  for (const mutate of [
    (candidate) => candidate.nodes.pop(),
    (candidate) => {
      candidate.nodes[0].value = 'lost limits';
    },
    (candidate) =>
      candidate.nodes.push({
        source: 'target.css',
        pointer: '',
        value: 'foreign visual evidence',
        hash: contextHash('foreign visual evidence'),
        reason: 'injected',
      }),
    (candidate) => {
      candidate.routing.axes[0].executionStatus = 'pending';
    },
    (candidate) => {
      candidate.payload.evidence.regions[0].limitations = [];
    },
  ]) {
    const changed = structuredClone(pack);
    mutate(changed);
    changed.nodes.forEach((node) => {
      node.hash = contextHash(node.value);
    });
    const { packHash, metrics, ...body } = changed;
    changed.packHash = contextHash(body);
    await assert.rejects(validateContext(changed, source), {
      code: 'INVALID_CONTEXT',
    });
  }
});

test('only stats cannot leak via a shared axis; exclude and prefer preserve their meanings', async () => {
  const source = await input();
  source.evidence.regions.push({
    ...source.evidence.regions[0],
    id: 'evidence.chart',
    uiDomainRefs: ['domain.charts-data-visualization'],
  });
  let routing = resolveContextRouting(matrix, source.request, source.evidence);
  assert.equal(routing.decisions[1].disposition, 'hard-excluded');
  assert.equal(
    routing.axes.find((item) => item.axisRef === 'axis.spatial-composition')
      .executionStatus,
    'skipped',
  );
  source.request.parameters.sources[0].evidenceMode = 'exclude';
  routing = resolveContextRouting(matrix, source.request, source.evidence);
  assert.equal(routing.decisions[0].disposition, 'hard-excluded');
  assert.equal(routing.decisions[1].disposition, 'admitted');
  source.request.parameters.sources[0].evidenceMode = 'prefer';
  routing = resolveContextRouting(matrix, source.request, source.evidence);
  assert.ok(routing.decisions.every((item) => item.disposition === 'admitted'));
});

test('uncertainty expands execution, not evidence authority, and invalid references fail', async () => {
  const source = await input();
  source.evidence.regions[0].confidence = 0.5;
  let routing = resolveContextRouting(matrix, source.request, source.evidence);
  assert.ok(routing.axes.every((item) => item.executionStatus === 'pending'));
  assert.equal(routing.decisions[0].directive.evidenceMode, 'only');
  source.evidence.regions[0].axisRefs.push('axis.imaginary');
  assert.throws(
    () => resolveContextRouting(matrix, source.request, source.evidence),
    { code: 'INVALID_CONTEXT' },
  );
  source.evidence.regions[0].axisRefs.pop();
  source.evidence.sources = [];
  assert.throws(
    () => resolveContextRouting(matrix, source.request, source.evidence),
    /every request source/,
  );
});

test('scaffolds never pass as executed stages; skipped facets stay unknown', async () => {
  const source = await input();
  const pack = await compileContext(source);
  const ledger = stageScaffold(pack);
  const pending = ledger.find((item) => item.axisRef === axisRef);
  assert.throws(() => validateStageEnvelope(pending, pack), /has not executed/);
  const skipped = ledger.find((item) => item.executionStatus === 'skipped');
  assert.equal(validateStageEnvelope(skipped, pack).valid, true);
  skipped.facetCoverage[0].coverageStatus = 'not-applicable';
  assert.throws(
    () => validateStageEnvelope(skipped, pack),
    /Skipped is unknown/,
  );
});

function completedEnvelope(pack, ref) {
  const envelope = stageScaffold(pack).find((item) => item.axisRef === ref);
  envelope.executionStatus = 'partial';
  envelope.packHash = pack.packHash;
  envelope.inputHash = pack.inputHash;
  envelope.fragment = {
    stageId: ref.replace('axis.', 'prompt.'),
    status: 'partial',
    claims: [],
    unknowns: [
      {
        question: 'No visual model executed in this fixture',
        confidence: { score: 0, basis: 'Synthetic fixture' },
      },
    ],
    conflicts: [
      {
        sourceA: 'One context',
        sourceB: 'Another context',
        resolution: 'unresolved',
      },
    ],
    facetCoverage: structuredClone(envelope.facetCoverage),
    uiDomainContributions: [],
    handoff: [],
    extraDetail: { exceptions: ['Never discard this field'] },
  };
  return envelope;
}

test('governance and synthesis retain all fragments and reject missing or stale envelopes', async () => {
  const source = await input();
  const seed = await compileContext(source);
  const fragments = [];
  for (const axis of seed.routing.axes.filter(
    (item) => item.axisRef !== 'axis.system-governance',
  )) {
    if (axis.executionStatus === 'skipped')
      fragments.push(
        stageScaffold(seed).find((item) => item.axisRef === axis.axisRef),
      );
    else {
      const pack = await compileContext({ ...source, axisRef: axis.axisRef });
      fragments.push(completedEnvelope(pack, axis.axisRef));
    }
  }
  const governanceInput = {
    ...source,
    axisRef: null,
    phase: 'governance',
    fragments,
  };
  const governancePack = await compileContext(governanceInput);
  assert.deepEqual(governancePack.payload.fragments, fragments);
  const all = [
    ...fragments,
    completedEnvelope(governancePack, 'axis.system-governance'),
  ];
  const synthesisInput = {
    ...source,
    axisRef: null,
    phase: 'synthesis',
    fragments: all,
  };
  const synthesis = await compileContext(synthesisInput);
  assert.equal(
    validateSchema(synthesis),
    true,
    JSON.stringify(validateSchema.errors),
  );
  assert.deepEqual(synthesis.payload.fragments, all);
  assert.ok(
    synthesis.nodes.some(
      (node) =>
        node.source === 'schemas/design-dna.schema.json' && node.pointer === '',
    ),
  );
  await assert.rejects(
    compileContext({ ...synthesisInput, fragments: all.slice(1) }),
    /All specialist/,
  );
  const stale = structuredClone(synthesisInput);
  stale.request.constraints.push('A new scope restriction');
  await assert.rejects(compileContext(stale), /different context/);
  const blocked = structuredClone(synthesisInput);
  const blockedStage = blocked.fragments.find((item) => item.fragment !== null);
  blockedStage.executionStatus = 'blocked';
  blockedStage.fragment.status = 'blocked';
  await assert.rejects(compileContext(blocked), /Blocked specialist/);
});

test('claim admission checks every source and preserves epistemic boundaries', async () => {
  const source = await input();
  const pack = await compileContext(source);
  const envelope = completedEnvelope(pack, axisRef);
  envelope.fragment.claims = [
    {
      id: 'claim.test',
      statement: 'Test statement',
      scope: ['stats'],
      exceptions: [],
      epistemicStatus: 'observed',
      confidence: { score: 0.9, basis: 'Synthetic test' },
      evidenceRefs: ['evidence.stats'],
      conceptRefs: [],
      uiDomainRefs: ['domain.stats-kpis'],
      validation: { method: 'Visual comparison required', status: 'pending' },
    },
  ];
  assert.equal(validateStageEnvelope(envelope, pack).valid, true);
  envelope.fragment.claims[0].uiDomainRefs = [
    'domain.charts-data-visualization',
  ];
  assert.throws(
    () => validateStageEnvelope(envelope, pack),
    /admission boundaries/,
  );
  envelope.fragment.claims[0].uiDomainRefs = ['domain.stats-kpis'];
  envelope.fragment.claims[0].evidenceRefs = [];
  assert.throws(
    () => validateStageEnvelope(envelope, pack),
    /requires evidence/,
  );
  envelope.fragment.claims[0].epistemicStatus = 'certain';
  assert.throws(() => validateStageEnvelope(envelope, pack), /epistemic/);
});

test('default full, deterministic reuse, original screenshot freshness and CLI validation', async (t) => {
  const directory = await temporary(t);
  const source = await input();
  const screenshot = path.join(directory, 'capture.png');
  const bytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX9sAAAAASUVORK5CYII=',
    'base64',
  );
  await fs.writeFile(screenshot, bytes);
  source.request.parameters.sources[0].path = screenshot;
  const requestPath = path.join(directory, 'request.json');
  await fs.writeFile(requestPath, JSON.stringify(source.request));
  const specPath = path.join(directory, 'spec.json');
  await fs.writeFile(
    specPath,
    JSON.stringify({ phase: 'source', requestPath: 'request.json' }),
  );
  const first = await writeContext({
    specPath,
    outputDirectory: path.join(directory, 'context'),
  });
  const second = await writeContext({
    specPath,
    outputDirectory: path.join(directory, 'context'),
  });
  assert.equal(second.action, 'unchanged');
  assert.equal(first.packHash, second.packHash);
  const pack = await readJson(first.packPath);
  assert.equal(pack.mode, 'full');
  const { stdout } = await execute(process.execPath, [
    path.join(pluginRoot, 'bin/designome.mjs'),
    'validate-context',
    '--spec',
    specPath,
    '--file',
    first.packPath,
  ]);
  assert.equal(JSON.parse(stdout).valid, true);
  await fs.appendFile(screenshot, 'changed');
  await assert.rejects(
    validateContext(pack, await loadContextInput(specPath)),
    /stale/,
  );
  const changedInput = await loadContextInput(specPath);
  const recovered = await recoverContext(pack, changedInput);
  assert.equal(recovered.fallback, true);
  assert.equal(recovered.requiresRerun, true);
  assert.equal(recovered.pack.mode, 'full');
  const initialized = await initializeRun({
    imagePaths: [screenshot],
    requestContractPath: requestPath,
    outputDirectory: path.join(directory, 'run'),
    contextMode: 'lossless-pack',
  });
  assert.ok(initialized.context.packPath);
  const plan = await readJson(path.join(directory, 'run/run-plan.json'));
  assert.equal(plan.context.mode, 'lossless-pack');
  await assert.rejects(
    initializeRun({
      imagePaths: [screenshot],
      requestContractPath: requestPath,
      outputDirectory: path.join(directory, 'run'),
      contextMode: 'shadow',
    }),
    /different inputs/,
  );
  assert.equal(contextHash({ a: 1, b: 2 }), contextHash({ b: 2, a: 1 }));
  assert.equal(typeof stableJson(pack), 'string');
  assert.equal(sha256(bytes).length, 64);
});

test('installation and audit retain complete accepted DNA including dependency and exception fields', async () => {
  for (const phase of ['install', 'audit']) {
    const request = await readJson(
      path.join(
        pluginRoot,
        `examples/request-contract.${phase}.reference.json`,
      ),
    );
    const dna = await readJson(
      path.join(pluginRoot, 'examples/design-dna.reference-v0.3.json'),
    );
    dna.status = 'accepted';
    const pack = await compileContext({
      phase,
      mode: 'lossless-pack',
      request,
      dna,
    });
    assert.deepEqual(pack.payload.dna, dna);
    assert.ok(
      pack.nodes.some(
        (node) =>
          node.source === 'concepts/concept-matrix.v0.3.json' &&
          node.pointer === '',
      ),
    );
    assert.equal(
      validateSchema(pack),
      true,
      JSON.stringify(validateSchema.errors),
    );
  }
});

test('every UI domain retains its complete specialist contract without inventing destination evidence', async () => {
  for (const domain of matrix.uiDomains) {
    const source = await input();
    source.axisRef = domain.axisRefs.find(
      (ref) => ref !== 'axis.system-governance',
    );
    source.request.parameters.sources[0].uiDomainRefs = [domain.id];
    source.evidence.regions[0].uiDomainRefs = [domain.id];
    source.evidence.regions[0].axisRefs = [source.axisRef];
    const pack = await compileContext(source);
    assert.ok(
      pack.nodes.some(
        (node) =>
          node.value.id === domain.id &&
          JSON.stringify(node.value) === JSON.stringify(domain),
      ),
    );
    assert.deepEqual(
      pack.payload.request.parameters.targetUseCase,
      source.request.parameters.targetUseCase,
    );
    assert.deepEqual(pack.payload.compatibility, source.compatibility);
    assert.ok(
      pack.routing.axes.some(
        (axis) =>
          axis.axisRef === 'axis.system-governance' &&
          axis.executionStatus === 'pending',
      ),
    );
  }
});

test('identical image bytes with different source directives keep separate evidence identities', async (t) => {
  const directory = await temporary(t);
  const paths = [
    path.join(directory, 'stats/reference.png'),
    path.join(directory, 'theme/reference.png'),
  ];
  const image = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX9sAAAAASUVORK5CYII=',
    'base64',
  );
  for (const file of paths) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, image);
  }
  const source = await input();
  source.request.parameters.sources = paths.map((file, index) => ({
    ...source.request.parameters.sources[0],
    path: file,
    axisRefs: index ? ['axis.color-surface-identity'] : [],
    uiDomainRefs: index ? [] : ['domain.stats-kpis'],
  }));
  const requestPath = path.join(directory, 'request.json');
  await fs.writeFile(requestPath, JSON.stringify(source.request));
  const options = {
    imagePaths: paths,
    requestContractPath: requestPath,
    outputDirectory: path.join(directory, 'run'),
  };
  const result = await initializeRun(options);
  assert.equal(result.sourceCount, 2);
  const manifest = await readJson(
    path.join(directory, 'run/source-manifest.json'),
  );
  assert.equal(new Set(manifest.sources.map((item) => item.id)).size, 2);
  assert.equal(
    new Set(manifest.sources.map((item) => item.contentHash)).size,
    1,
  );
  assert.ok(
    (await initializeRun(options)).actions.every(
      (item) => item.action === 'unchanged',
    ),
  );
});
