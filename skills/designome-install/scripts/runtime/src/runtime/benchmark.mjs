import fs from 'node:fs/promises';
import path from 'node:path';
import { assertValidDesignDna } from './design-dna.mjs';
import { projectDocumentation } from './install.mjs';
import { evaluateFidelityConstraints } from './fidelity.mjs';
import { DesignomeError } from './errors.mjs';
import {
  jsonText,
  readJson,
  sha256,
  pathExists,
  writeJsonIfChanged,
} from './files.mjs';
import { inspectImageBuffer } from './images.mjs';

export const benchmarkAspects = [
  'composition',
  'proportions',
  'typography',
  'spacing',
  'color-surface',
  'component-anatomy',
  'identity',
  'content-resilience',
];
const isObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const id = (value) => text(value) && /^[a-z][a-z0-9.-]*$/u.test(value);
function check(condition, message) {
  if (!condition)
    throw new DesignomeError(message, { code: 'INVALID_BENCHMARK' });
}

export function validateBenchmarkCorpus(corpus, dna) {
  check(
    isObject(corpus) && corpus.schemaVersion === '1.0.0',
    'Benchmark corpus requires schemaVersion 1.0.0',
  );
  check(
    id(corpus.id) &&
      Number.isInteger(corpus.repetitions) &&
      corpus.repetitions >= 2 &&
      corpus.repetitions <= 10,
    'Benchmark needs an ID and two to ten independent repetitions',
  );
  check(
    Array.isArray(corpus.cases) && corpus.cases.length > 0,
    'Benchmark cases are required',
  );
  check(
    Array.isArray(corpus.limitations) &&
      corpus.limitations.length > 0 &&
      corpus.limitations.every(text),
    'Corpus limitations are required',
  );
  const ids = new Set(),
    sources = new Set(dna.sources.map((source) => source.id));
  for (const item of corpus.cases) {
    check(
      isObject(item) && id(item.id) && !ids.has(item.id),
      'Missing or duplicate benchmark case ID',
    );
    ids.add(item.id);
    check(
      text(item.family) && text(item.task) && text(item.scope),
      'Every case needs a family, task and source-comparison scope',
    );
    check(
      ['reference-reproduction', 'grammar-transfer'].includes(item.kind),
      'Invalid benchmark case kind',
    );
    check(
      Array.isArray(item.sourceRefs) &&
        item.sourceRefs.length > 0 &&
        new Set(item.sourceRefs).size === item.sourceRefs.length &&
        item.sourceRefs.every((ref) => sources.has(ref)),
      'Case source references must resolve to supplied DNA sources',
    );
    check(
      isObject(item.viewport) &&
        ['width', 'height'].every(
          (key) =>
            Number.isInteger(item.viewport[key]) &&
            item.viewport[key] >= 200 &&
            item.viewport[key] <= 4096,
        ),
      'Invalid benchmark viewport',
    );
    if (item.implementationContext !== undefined) {
      const context = item.implementationContext;
      check(
        isObject(context) &&
          text(context.framework) &&
          text(context.componentLibrary) &&
          Array.isArray(context.requirements) &&
          context.requirements.every(text),
        'Implementation context requires framework, component library and technical requirements',
      );
    }
  }
  return true;
}

function publicInput(value, sources) {
  // Generator packets contain no source locations, images, old code or raw DNA.
  // Replace occurrences in prose too: a routing or confidence note may carry a path.
  let serialized = jsonText(value);
  for (const source of sources)
    if (text(source.path))
      serialized = serialized.replaceAll(
        JSON.stringify(source.path).slice(1, -1),
        'source:' + source.id,
      );
  return JSON.parse(serialized);
}

export async function hashBenchmarkDirectory(directory) {
  const entries = [];
  async function visit(current, prefix = '') {
    for (const entry of (
      await fs.readdir(current, { withFileTypes: true })
    ).sort((a, b) => a.name.localeCompare(b.name))) {
      check(
        !entry.isSymbolicLink(),
        'Benchmark packets cannot contain symbolic links',
      );
      const relative = prefix + entry.name;
      if (entry.isDirectory())
        await visit(path.join(current, entry.name), relative + '/');
      else
        entries.push([
          relative,
          sha256(await fs.readFile(path.join(current, entry.name))),
        ]);
    }
  }
  await visit(directory);
  return sha256(jsonText(entries));
}

export async function prepareBenchmark({
  dnaPath,
  corpusPath,
  outputDirectory,
}) {
  const dna = await readJson(dnaPath),
    corpus = await readJson(corpusPath);
  await assertValidDesignDna(dna, { requireFidelity: true });
  validateBenchmarkCorpus(corpus, dna);
  const output = path.resolve(outputDirectory);
  check(
    !(await pathExists(output)) || (await fs.readdir(output)).length === 0,
    'Benchmark output must be a new or empty directory; previous runs are immutable',
  );
  const sourceRecords = [];
  for (const source of dna.sources) {
    const bytes = await fs.readFile(source.path),
      hash = 'sha256:' + sha256(bytes);
    check(hash === source.contentHash, 'Source hash mismatch for ' + source.id);
    sourceRecords.push({
      id: source.id,
      path: path.resolve(source.path),
      contentHash: hash,
      dimensions: inspectImageBuffer(bytes),
    });
  }
  const documents = await projectDocumentation(publicInput(dna, dna.sources));
  await fs.mkdir(output, { recursive: true });
  const packets = [];
  for (let repetition = 1; repetition <= corpus.repetitions; repetition++) {
    const packetDirectory = path.join(
      output,
      'packets',
      'repetition-' + repetition,
    );
    const docDirectory = path.join(packetDirectory, 'docs');
    for (const [filename, content] of documents) {
      const dest = path.join(docDirectory, filename);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, content);
    }
    const brief = {
      schemaVersion: '1.0.0',
      dnaStatus: dna.status,
      sourceAccess: 'forbidden',
      cases: corpus.cases,
      instructions:
        'Use only this brief and the Markdown dossier as design input. Do not view source images, source locations, raw DNA, target repositories, sibling generations or evaluation output. Produce one independent implementation per case. When implementationContext is present, its library APIs, official documentation and neutral technical scaffold are allowed integration inputs only; their default style is never design evidence. Candidate calibrations remain proposed; generation is an isolated benchmark, not installation or DNA acceptance.',
      limitations: corpus.limitations,
    };
    await fs.writeFile(
      path.join(packetDirectory, 'brief.json'),
      jsonText(publicInput(brief, dna.sources)),
    );
    packets.push({
      repetition,
      directory: packetDirectory,
      inputHash: await hashBenchmarkDirectory(packetDirectory),
    });
  }
  const plan = {
    schemaVersion: '1.0.0',
    benchmarkId: corpus.id,
    dnaHash: sha256(jsonText(dna)),
    dnaPath: path.resolve(dnaPath),
    dnaStatus: dna.status,
    sourceRecords,
    cases: corpus.cases,
    repetitions: corpus.repetitions,
    aspects: benchmarkAspects,
    packets,
    families: [...new Set(corpus.cases.map((item) => item.family))],
    limitations: corpus.limitations,
    isolation:
      'separate-context-and-packet; host-declared access discipline, not an OS sandbox',
    status: 'awaiting-generation',
  };
  plan.fingerprint = sha256(jsonText(plan));
  const planPath = path.join(output, 'plan.json');
  await writeJsonIfChanged(planPath, plan);
  return {
    planPath,
    benchmarkId: corpus.id,
    packets,
    expectedRuns: corpus.cases.length * corpus.repetitions,
    status: plan.status,
  };
}

export async function evaluateBenchmark({
  planPath,
  evidencePath,
  outputPath,
}) {
  const plan = await readJson(planPath),
    evidence = await readJson(evidencePath);
  check(
    isObject(plan) && isObject(evidence),
    'Benchmark plan and evidence must be objects',
  );
  const { fingerprint, ...content } = plan;
  check(
    fingerprint === sha256(jsonText(content)),
    'Benchmark plan fingerprint is invalid',
  );
  check(
    evidence.schemaVersion === '1.0.0' &&
      evidence.planFingerprint === fingerprint &&
      Array.isArray(evidence.runs),
    'Evidence must bind to this benchmark plan',
  );
  const dna = await readJson(plan.dnaPath);
  await assertValidDesignDna(dna, { requireFidelity: true });
  validateBenchmarkCorpus(
    {
      schemaVersion: plan.schemaVersion,
      id: plan.benchmarkId,
      repetitions: plan.repetitions,
      cases: plan.cases,
      limitations: plan.limitations,
    },
    dna,
  );
  check(
    JSON.stringify(plan.aspects) === JSON.stringify(benchmarkAspects),
    'Benchmark plan must preserve every review aspect',
  );
  check(
    plan.dnaStatus === dna.status && plan.status === 'awaiting-generation',
    'Invalid benchmark plan state',
  );
  check(
    JSON.stringify(plan.families) ===
      JSON.stringify([...new Set(plan.cases.map((item) => item.family))]),
    'Benchmark families differ from its cases',
  );
  check(
    Array.isArray(plan.packets) &&
      plan.packets.length === plan.repetitions &&
      plan.packets.every(
        (packet, index) =>
          packet.repetition === index + 1 &&
          text(packet.directory) &&
          /^[a-f0-9]{64}$/u.test(packet.inputHash),
      ),
    'Plan must contain one ordered packet per repetition',
  );
  check(
    Array.isArray(plan.sourceRecords) &&
      plan.sourceRecords.length === dna.sources.length &&
      plan.sourceRecords.every(
        (source, index) =>
          source.id === dna.sources[index].id &&
          source.path === path.resolve(dna.sources[index].path) &&
          source.contentHash === dna.sources[index].contentHash,
      ),
    'Plan source records differ from its DNA',
  );
  check(
    plan.dnaHash === sha256(jsonText(dna)),
    'Benchmark DNA changed after packet preparation',
  );
  for (const source of plan.sourceRecords)
    check(
      'sha256:' + sha256(await fs.readFile(source.path)) === source.contentHash,
      'Source changed after preparation: ' + source.id,
    );
  for (const packet of plan.packets)
    check(
      (await hashBenchmarkDirectory(packet.directory)) === packet.inputHash,
      'Generator packet changed after preparation',
    );
  const runs = [],
    seen = new Set(),
    generators = new Map();
  for (const run of evidence.runs) {
    check(isObject(run), 'Benchmark run must be an object');
    const key = `${run.caseId}:${run.repetition}`,
      item = plan.cases.find((c) => c.id === run.caseId),
      packet = plan.packets.find((p) => p.repetition === run.repetition);
    check(
      item && packet && !seen.has(key),
      'Unexpected or duplicate benchmark run',
    );
    seen.add(key);
    check(
      text(run.generatorId) &&
        text(run.reviewerId) &&
        run.generatorId !== run.reviewerId,
      'A different identified reviewer is required',
    );
    check(
      run.sourceAccess === false && run.inputHash === packet.inputHash,
      'Generator must attest docs-only input bound to the packet',
    );
    const previous = generators.get(run.repetition);
    check(
      !previous || previous === run.generatorId,
      'A repetition must use one generator context',
    );
    generators.set(run.repetition, run.generatorId);
    check(
      Array.isArray(run.limitations) &&
        run.limitations.every(text) &&
        Array.isArray(run.observations),
      'Run observations and limitations are required',
    );
    check(
      run.viewport?.width === item.viewport.width &&
        run.viewport?.height === item.viewport.height,
      'Run viewport must match the planned comparison',
    );
    for (const field of ['implementation', 'capture']) {
      const artifact = run[field];
      check(
        isObject(artifact) && text(artifact.path),
        'Missing ' + field + ' artifact',
      );
      if (field === 'implementation' && artifact.kind === 'directory') {
        check(
          artifact.sha256 === (await hashBenchmarkDirectory(artifact.path)),
          'Changed implementation directory',
        );
        continue;
      }
      check(
        artifact.kind === undefined || artifact.kind === 'file',
        'Invalid artifact kind',
      );
      const bytes = await fs.readFile(artifact.path);
      check(
        artifact.sha256 === sha256(bytes),
        'Changed ' + field + ' artifact',
      );
      if (field === 'capture') {
        const size = inspectImageBuffer(bytes);
        check(
          size.width === item.viewport.width &&
            size.height === item.viewport.height,
          'Capture dimensions differ from planned viewport',
        );
      }
    }
    const additionalCaptures = run.additionalCaptures ?? [];
    check(
      Array.isArray(additionalCaptures),
      'Additional captures must be an array',
    );
    for (const capture of additionalCaptures) {
      check(
        isObject(capture) && text(capture.purpose) && text(capture.path),
        'Additional capture needs a purpose and path',
      );
      const bytes = await fs.readFile(capture.path),
        size = inspectImageBuffer(bytes);
      check(
        capture.sha256 === sha256(bytes) &&
          capture.sha256 !== run.capture.sha256,
        'Additional capture must bind a distinct rendered state',
      );
      check(
        size.width === item.viewport.width &&
          size.height === item.viewport.height,
        'Additional capture dimensions differ from planned viewport',
      );
    }
    if (item.implementationContext) {
      const integration = run.integrationEvidence,
        context = item.implementationContext;
      check(
        isObject(integration) &&
          integration.framework === context.framework &&
          integration.componentLibrary === context.componentLibrary,
        'Run must identify its planned framework and component library',
      );
      check(
        isObject(integration.versions) &&
          Object.keys(integration.versions).length > 0 &&
          Object.entries(integration.versions).every(
            ([name, version]) => text(name) && text(version),
          ),
        'Library versions are required',
      );
      check(
        Array.isArray(integration.components) &&
          integration.components.length > 0 &&
          integration.components.every(text) &&
          Array.isArray(integration.themeAdaptations) &&
          integration.themeAdaptations.every(text),
        'Used components and theme adaptations are required',
      );
      const dependency = integration.dependencyArtifact;
      check(
        isObject(dependency) &&
          text(dependency.path) &&
          dependency.sha256 === sha256(await fs.readFile(dependency.path)),
        'Dependency artifact must bind the library installation',
      );
    } else
      check(
        run.integrationEvidence === undefined,
        'Unplanned integration evidence must be declared in the corpus',
      );
    if (run.qualityAssessment !== undefined) {
      const quality = run.qualityAssessment;
      check(
        isObject(quality) &&
          ['finish', 'coherence', 'readability'].every((key) =>
            ['strong', 'mixed', 'weak', 'unknown'].includes(quality[key]),
          ) &&
          ['observed', 'inferred', 'unknown'].includes(
            quality.epistemicStatus,
          ) &&
          text(quality.statement) &&
          Array.isArray(quality.limitations) &&
          quality.limitations.every(text),
        'Visual quality assessment requires explicit grades, evidence and limitations',
      );
    }
    const aspects = new Set();
    for (const observation of run.observations) {
      check(isObject(observation), 'Review observation must be an object');
      check(
        plan.aspects.includes(observation.aspect) &&
          !aspects.has(observation.aspect),
        'Unexpected or duplicate review aspect',
      );
      aspects.add(observation.aspect);
      check(
        ['passed', 'failed', 'incomplete'].includes(observation.result) &&
          ['observed', 'inferred', 'unknown'].includes(
            observation.epistemicStatus,
          ) &&
          text(observation.statement),
        'Review needs an explicit result, status and evidence statement',
      );
      check(
        observation.result !== 'passed' ||
          observation.epistemicStatus !== 'unknown',
        'Unknown visual evidence cannot pass',
      );
      check(
        Array.isArray(observation.sourceRefs) &&
          observation.sourceRefs.length > 0 &&
          observation.sourceRefs.every((ref) => item.sourceRefs.includes(ref)),
        'Perceptual statements require the case source references',
      );
    }
    check(
      Array.isArray(run.measurements),
      'Browser measurement list is required, even when empty',
    );
    const constraints = evaluateFidelityConstraints(dna, run.measurements);
    const complete = plan.aspects.every((aspect) => aspects.has(aspect));
    const missingContentProbe =
      run.observations.some(
        (o) => o.aspect === 'content-resilience' && o.result === 'passed',
      ) && additionalCaptures.length === 0;
    const requirements = constraints.filter(
      (c) => c.disposition === 'requirement',
    );
    const status =
      run.observations.some((o) => o.result === 'failed') ||
      requirements.some((c) => c.result === 'failed')
        ? 'failed'
        : !complete ||
            missingContentProbe ||
            run.observations.some((o) => o.result === 'incomplete') ||
            requirements.some((c) => c.result === 'incomplete')
          ? 'incomplete'
          : 'passed';
    runs.push({
      caseId: run.caseId,
      repetition: run.repetition,
      family: item.family,
      kind: item.kind,
      status,
      generatorId: run.generatorId,
      reviewerId: run.reviewerId,
      sourceAccess: false,
      inputHash: run.inputHash,
      implementationHash: run.implementation.sha256,
      captureHash: run.capture.sha256,
      additionalCaptures: additionalCaptures.map(({ purpose, sha256 }) => ({
        purpose,
        sha256,
      })),
      observations: run.observations,
      constraints,
      limitations: run.limitations,
      componentLibrary: item.implementationContext?.componentLibrary ?? 'none',
      ...(run.integrationEvidence
        ? { integrationEvidence: run.integrationEvidence }
        : {}),
      ...(run.qualityAssessment
        ? { qualityAssessment: run.qualityAssessment }
        : {}),
    });
  }
  check(
    new Set(generators.values()).size === generators.size,
    'Repetitions require independent generator contexts',
  );
  const generatorIds = new Set(generators.values());
  check(
    runs.every((run) => !generatorIds.has(run.reviewerId)),
    'Reviewers cannot be a generator from another repetition',
  );
  const missing = [];
  for (const item of plan.cases)
    for (let repetition = 1; repetition <= plan.repetitions; repetition++)
      if (!seen.has(`${item.id}:${repetition}`))
        missing.push({ caseId: item.id, repetition });
  const status = runs.some((run) => run.status === 'failed')
    ? 'failed'
    : missing.length || runs.some((run) => run.status === 'incomplete')
      ? 'incomplete'
      : 'passed';
  const report = {
    schemaVersion: '1.0.0',
    benchmarkId: plan.benchmarkId,
    planFingerprint: fingerprint,
    status,
    dnaStatus: plan.dnaStatus,
    expectedRuns: plan.cases.length * plan.repetitions,
    receivedRuns: runs.length,
    missing,
    families: plan.families.map((family) => ({
      family,
      runs: runs
        .filter((run) => run.family === family)
        .map((run) => ({
          caseId: run.caseId,
          repetition: run.repetition,
          status: run.status,
        })),
    })),
    runs,
    libraries: [
      ...new Set(
        plan.cases.map(
          (item) => item.implementationContext?.componentLibrary ?? 'none',
        ),
      ),
    ].map((componentLibrary) => ({
      componentLibrary,
      runs: runs
        .filter((run) => run.componentLibrary === componentLibrary)
        .map((run) => ({
          caseId: run.caseId,
          repetition: run.repetition,
          status: run.status,
          qualityAssessment: run.qualityAssessment ?? null,
        })),
    })),
    limitations: [
      ...plan.limitations,
      'Results concern this corpus and these host passes only. No universal fidelity, cross-brand or native-mobile generalization is established.',
      plan.isolation,
    ],
  };
  if (outputPath) await writeJsonIfChanged(outputPath, report);
  return report;
}
