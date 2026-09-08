import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { deflateSync } from 'node:zlib';
import {
  prepareBenchmark,
  evaluateBenchmark,
  benchmarkAspects,
  hashBenchmarkDirectory,
} from '../../src/runtime/benchmark.mjs';
import { jsonText, sha256 } from '../../src/runtime/files.mjs';

// A real, synthetic blank PNG for artifact-integrity tests, never visual evidence.
function png(seed = 0) {
  function chunk(type, data) {
    const body = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of body) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    const length = Buffer.alloc(4),
      checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, body, checksum]);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(200);
  header.writeUInt32BE(200, 4);
  header[8] = 8;
  header[9] = 6;
  const pixels = Buffer.alloc(200 * (200 * 4 + 1), seed);
  for (let row = 0; row < 200; row++) pixels[row * (200 * 4 + 1)] = 0;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function fixture(
  t,
  { library = false, acceptedConstraint = false } = {},
) {
  const dir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'designome-benchmark-test-'),
  );
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const dna = JSON.parse(
    await fs.readFile(
      new URL(
        '../../examples/design-dna.fidelity.reference.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const image = png();
  for (const [index, source] of dna.sources.entries()) {
    source.path = path.join(dir, `private-source-${index}.png`);
    source.contentHash = 'sha256:' + sha256(image);
    source.dimensions = { width: 200, height: 200 };
    await fs.writeFile(source.path, image);
  }
  dna.sources[0].limitations.push('Private source at ' + dna.sources[0].path);
  const corpus = {
    schemaVersion: '1.0.0',
    id: 'benchmark.test',
    repetitions: 2,
    cases: [
      {
        id: 'case.analytics',
        kind: 'reference-reproduction',
        family: 'analytics',
        sourceRefs: [dna.sources[0].id],
        viewport: { width: 200, height: 200 },
        task: 'Render a synthetic metric card from ' + dna.sources[0].path,
        scope: 'Unit-test contract only.',
      },
    ],
    limitations: ['Synthetic test fixtures do not establish visual fidelity.'],
  };
  if (library)
    corpus.cases[0].implementationContext = {
      framework: 'react',
      componentLibrary: 'mui',
      requirements: ['Use actual installed components.'],
    };
  if (acceptedConstraint)
    dna.fidelity.constraints[0].acceptance = {
      status: 'accepted',
      basis: 'Synthetic test requirement only.',
    };
  const dnaPath = path.join(dir, 'dna.json'),
    corpusPath = path.join(dir, 'corpus.json');
  await fs.writeFile(dnaPath, jsonText(dna));
  await fs.writeFile(corpusPath, jsonText(corpus));
  const prepared = await prepareBenchmark({
    dnaPath,
    corpusPath,
    outputDirectory: path.join(dir, 'evaluation'),
  });
  const plan = JSON.parse(await fs.readFile(prepared.planPath, 'utf8'));
  const implementationPath = path.join(dir, 'index.html');
  await fs.writeFile(
    implementationPath,
    '<!doctype html><title>Synthetic fixture</title><p>Test</p>',
  );
  const implementation = {
    path: implementationPath,
    sha256: sha256(await fs.readFile(implementationPath)),
  };
  const capture = { path: dna.sources[0].path, sha256: sha256(image) };
  const alternatePath = path.join(dir, 'alternate.png');
  await fs.writeFile(alternatePath, png(1));
  const evidence = {
    schemaVersion: '1.0.0',
    planFingerprint: plan.fingerprint,
    runs: plan.packets.map((packet) => ({
      caseId: corpus.cases[0].id,
      repetition: packet.repetition,
      generatorId: 'generator-' + packet.repetition,
      reviewerId: 'reviewer',
      sourceAccess: false,
      inputHash: packet.inputHash,
      viewport: { width: 200, height: 200 },
      implementation,
      capture,
      additionalCaptures: [
        {
          purpose: 'Synthetic alternate content state for contract testing.',
          path: alternatePath,
          sha256: sha256(png(1)),
        },
      ],
      observations: benchmarkAspects.map((aspect) => ({
        aspect,
        result: 'passed',
        epistemicStatus: 'observed',
        statement:
          'Synthetic observation supplied for runtime contract testing only.',
        sourceRefs: corpus.cases[0].sourceRefs,
      })),
      measurements: [],
      limitations: corpus.limitations,
    })),
  };
  const evidencePath = path.join(dir, 'evidence.json');
  const evaluate = async () => {
    await fs.writeFile(evidencePath, jsonText(evidence));
    return evaluateBenchmark({ planPath: prepared.planPath, evidencePath });
  };
  return { dir, dna, dnaPath, corpus, plan, prepared, evidence, evaluate };
}

test('preparation isolates repeatable Markdown packets without accepting or installing DNA', async (t) => {
  const f = await fixture(t);
  assert.equal(f.prepared.expectedRuns, 2);
  assert.equal(f.plan.packets[0].inputHash, f.plan.packets[1].inputHash);
  const packet = f.plan.packets[0].directory;
  assert.deepEqual((await fs.readdir(packet)).sort(), ['brief.json', 'docs']);
  const sourceDoc = await fs.readFile(
    path.join(packet, 'docs/governance/source-routing.md'),
    'utf8',
  );
  assert.ok(!sourceDoc.includes(f.dir));
  assert.ok(
    !(await fs.readFile(path.join(packet, 'brief.json'), 'utf8')).includes(
      f.dir,
    ),
  );
  assert.equal(
    JSON.parse(await fs.readFile(f.dnaPath, 'utf8')).status,
    'draft',
  );
  assert.equal((await f.evaluate()).status, 'passed');
  await assert.rejects(
    prepareBenchmark({
      dnaPath: f.dnaPath,
      corpusPath: path.join(f.dir, 'corpus.json'),
      outputDirectory: path.join(f.dir, 'evaluation'),
    }),
    /immutable/,
  );
});

test('library cases bind actual build assets, dependency metadata and separate visual finish', async (t) => {
  const f = await fixture(t, { library: true });
  await assert.rejects(f.evaluate(), /planned framework and component library/);
  const build = path.join(f.dir, 'dist');
  await fs.mkdir(build);
  await fs.writeFile(
    path.join(build, 'index.html'),
    '<script src="app.js"></script>',
  );
  await fs.writeFile(
    path.join(build, 'app.js'),
    'document.body.textContent="Synthetic fixture";',
  );
  const dependency = path.join(f.dir, 'lockfile.json');
  await fs.writeFile(dependency, '{"mui":"synthetic-test-version"}');
  for (const run of f.evidence.runs) {
    run.implementation = {
      path: build,
      kind: 'directory',
      sha256: await hashBenchmarkDirectory(build),
    };
    run.integrationEvidence = {
      framework: 'react',
      componentLibrary: 'mui',
      versions: { mui: 'synthetic-test-version' },
      components: ['Card'],
      themeAdaptations: ['Documented sans-serif fallback'],
      dependencyArtifact: {
        path: dependency,
        sha256: sha256(await fs.readFile(dependency)),
      },
    };
    run.qualityAssessment = {
      finish: 'strong',
      coherence: 'strong',
      readability: 'strong',
      epistemicStatus: 'observed',
      statement: 'Synthetic visual grade does not prove fidelity.',
      limitations: ['Contract test only.'],
    };
    run.observations[0].result = 'failed';
  }
  const report = await f.evaluate();
  assert.equal(report.status, 'failed');
  assert.equal(report.libraries[0].componentLibrary, 'mui');
  assert.equal(report.runs[0].qualityAssessment.finish, 'strong');
  await fs.appendFile(path.join(build, 'app.js'), ' changed');
  await assert.rejects(f.evaluate(), /Changed implementation directory/);
});

test('accepted calibration requirements need measured evidence while pending proposals remain diagnostic', async (t) => {
  const f = await fixture(t, { acceptedConstraint: true });
  assert.equal((await f.evaluate()).status, 'incomplete');
  for (const run of f.evidence.runs)
    run.measurements = [
      { target: 'metric-value', property: 'font-size', unit: 'px', value: 28 },
      { target: 'metric-label', property: 'font-size', unit: 'px', value: 14 },
    ];
  assert.equal((await f.evaluate()).status, 'passed');
  f.evidence.runs[0].measurements[0].value = 60;
  assert.equal((await f.evaluate()).status, 'failed');
});

test('missing runs or review aspects stay incomplete and visual failures stay failures', async (t) => {
  const f = await fixture(t);
  const run = f.evidence.runs.pop();
  assert.equal((await f.evaluate()).status, 'incomplete');
  f.evidence.runs.push(run);
  const observation = run.observations.pop();
  assert.equal((await f.evaluate()).status, 'incomplete');
  run.observations.push({ ...observation, result: 'failed' });
  assert.equal((await f.evaluate()).status, 'failed');
  run.observations.at(-1).result = 'passed';
  run.observations.at(-1).epistemicStatus = 'unknown';
  await assert.rejects(f.evaluate(), /Unknown visual evidence/);
});

test('content resilience cannot pass from a default capture or an unbound alternate state', async (t) => {
  const f = await fixture(t),
    run = f.evidence.runs[0],
    probe = run.additionalCaptures[0];
  delete run.additionalCaptures;
  const report = await f.evaluate();
  assert.equal(report.status, 'incomplete');
  assert.equal(report.runs[0].status, 'incomplete');
  assert.equal(report.runs[1].status, 'passed');
  run.additionalCaptures = [{ ...run.capture, purpose: probe.purpose }];
  await assert.rejects(f.evaluate(), /distinct rendered state/);
  run.additionalCaptures = [probe];
  await fs.appendFile(probe.path, 'changed after review');
  await assert.rejects(f.evaluate(), /distinct rendered state/);
});

test('benchmark rejects source access, shared generator contexts, reviewer leaks and stale artifacts', async (t) => {
  const f = await fixture(t),
    run = f.evidence.runs[1];
  run.sourceAccess = true;
  await assert.rejects(f.evaluate(), /docs-only/);
  run.sourceAccess = false;
  run.generatorId = 'generator-1';
  await assert.rejects(f.evaluate(), /independent generator/);
  run.generatorId = 'generator-2';
  run.reviewerId = 'generator-1';
  await assert.rejects(f.evaluate(), /another repetition/);
  run.reviewerId = 'reviewer';
  await fs.appendFile(run.implementation.path, 'changed');
  await assert.rejects(f.evaluate(), /Changed implementation/);
});

test('hash checks reject changed DNA, packets and a resealed plan with omitted review requirements', async (t) => {
  const f = await fixture(t);
  await fs.appendFile(
    path.join(f.plan.packets[0].directory, 'brief.json'),
    ' ',
  );
  await assert.rejects(f.evaluate(), /packet changed/);
  const g = await fixture(t);
  g.dna.description = 'Changed after preparation';
  await fs.writeFile(g.dnaPath, jsonText(g.dna));
  await assert.rejects(g.evaluate(), /DNA changed/);
  const h = await fixture(t);
  h.plan.aspects = [];
  delete h.plan.fingerprint;
  h.plan.fingerprint = sha256(jsonText(h.plan));
  h.evidence.planFingerprint = h.plan.fingerprint;
  await fs.writeFile(h.prepared.planPath, jsonText(h.plan));
  await assert.rejects(h.evaluate(), /every review aspect/);
});
