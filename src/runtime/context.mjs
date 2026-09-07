import fs from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import {
  pluginRoot,
  readJson,
  sha256,
  writeJsonIfChanged,
  writeIfChanged,
} from './files.mjs';
import { DesignomeError } from './errors.mjs';
import {
  loadRequestContract,
  assertValidRequestContract,
} from './request-contract.mjs';
import { assertValidDesignDna } from './design-dna.mjs';
import { validateStageEnvelope } from './context-stage.mjs';

const matrixFile = 'concepts/concept-matrix.v0.3.json';
const selectors = [
  'axisRefs',
  'conceptRefs',
  'uiDomainRefs',
  'tokenCategories',
  'ruleCategories',
];
const phases = [
  'request',
  'source',
  'analysis',
  'governance',
  'synthesis',
  'install',
  'audit',
];
const modes = ['full', 'lossless-pack', 'shadow'];
const governance = 'axis.system-governance';

function requireCondition(condition, message) {
  if (!condition)
    throw new DesignomeError(message, { code: 'INVALID_CONTEXT' });
}

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export const contextHash = (value) => sha256(stableJson(value));

function checkRefs(record, matrix) {
  const registries = [
    matrix.axes.map((x) => x.id),
    matrix.concepts.map((x) => x.id),
    matrix.uiDomains.map((x) => x.id),
    matrix.tokenCategories,
    matrix.ruleCategories,
  ];
  selectors.forEach((key, index) => {
    requireCondition(
      Array.isArray(record[key]) &&
        new Set(record[key]).size === record[key].length &&
        record[key].every((ref) => registries[index].includes(ref)),
      `Invalid ${key}`,
    );
  });
}

// Execution relevance is deliberately separate from evidence authorization.
// Multiple subjects in one record must be split by the host before admission.
export function admitsSubject(directive, subject) {
  if (!directive || ['all', 'prefer'].includes(directive.evidenceMode))
    return true;
  const matches = selectors.some((key) =>
    (directive[key] ?? []).some((ref) => (subject[key] ?? []).includes(ref)),
  );
  if (directive.evidenceMode === 'exclude') return !matches;
  // Every populated restriction dimension must match. A shared color axis
  // cannot authorize a charts claim from an only-stats source.
  return selectors.every(
    (key) =>
      !directive[key]?.length ||
      (subject[key]?.length > 0 &&
        subject[key].every((ref) => directive[key].includes(ref))),
  );
}

export function resolveContextRouting(matrix, request, evidence = null) {
  const selected = new Set([governance]);
  const domains = new Set(request?.parameters.focusUiDomainRefs ?? []);
  const concepts = new Set(request?.parameters.focusConceptRefs ?? []);
  const reasons = new Map([[governance, ['required-governance']]]);
  const select = (ref, reason) => {
    selected.add(ref);
    reasons.set(ref, [...new Set([...(reasons.get(ref) ?? []), reason])]);
  };
  for (const ref of request?.parameters.focusAxisRefs ?? [])
    select(ref, 'explicit-focus');
  const directives =
    request?.operation === 'extract' ? request.parameters.sources : [];
  for (const directive of directives) {
    if (directive.evidenceMode === 'exclude') continue;
    for (const ref of directive.axisRefs) select(ref, 'source-selector');
    for (const ref of directive.conceptRefs) concepts.add(ref);
    for (const ref of directive.uiDomainRefs) domains.add(ref);
  }
  const decisions = [];
  if (evidence) {
    requireCondition(
      evidence.schemaVersion === '1.0.0' &&
        Array.isArray(evidence.sources) &&
        Array.isArray(evidence.regions),
      'Invalid context evidence index',
    );
    const expected = directives.map((x) => path.resolve(x.path)).sort();
    const actual = evidence.sources.map((x) => path.resolve(x.path)).sort();
    requireCondition(
      isDeepStrictEqual(actual, expected),
      'Evidence must account for every request source exactly once',
    );
    for (const source of evidence.sources)
      requireCondition(
        typeof source.complete === 'boolean' &&
          typeof source.basis === 'string' &&
          source.basis.length > 0 &&
          /^sha256:[a-f0-9]{64}$/u.test(source.contentHash),
        'Source review needs completeness, basis and content hash',
      );
    const ids = new Set();
    for (const region of evidence.regions) {
      requireCondition(
        typeof region.id === 'string' &&
          region.id.length > 0 &&
          !ids.has(region.id),
        'Duplicate or missing region ID',
      );
      ids.add(region.id);
      requireCondition(
        typeof region.region === 'string' &&
          region.region.length > 0 &&
          typeof region.basis === 'string' &&
          region.basis.length > 0 &&
          Number.isFinite(region.confidence) &&
          region.confidence >= 0 &&
          region.confidence <= 1,
        'Region needs bounds, confidence and basis',
      );
      checkRefs(region, matrix);
      const directive = directives.find(
        (x) => path.resolve(x.path) === path.resolve(region.sourcePath),
      );
      requireCondition(directive, 'Region source is outside request');
      const admitted = admitsSubject(directive, region);
      decisions.push({
        evidenceRef: region.id,
        disposition: admitted ? 'admitted' : 'hard-excluded',
        directive: structuredClone(directive),
      });
      if (!admitted) continue;
      for (const ref of region.axisRefs) select(ref, 'detected-region');
      for (const ref of region.conceptRefs) concepts.add(ref);
      for (const ref of region.uiDomainRefs) domains.add(ref);
    }
  }
  const uncertain =
    !evidence ||
    evidence.sources.some((source) => source.complete !== true) ||
    evidence.regions.some((region) => region.confidence < 0.8) ||
    [...directives, ...(evidence?.regions ?? [])].some(
      (record) =>
        (record.tokenCategories?.length ?? 0) +
          (record.ruleCategories?.length ?? 0) >
          0 &&
        record.axisRefs.length +
          record.conceptRefs.length +
          record.uiDomainRefs.length ===
          0,
    );
  // Uncertainty expands obligations, never source admission or permissions.
  if (uncertain)
    for (const axis of matrix.axes) select(axis.id, 'uncertain-routing');
  for (const domain of matrix.uiDomains.filter((x) => domains.has(x.id))) {
    for (const ref of domain.axisRefs)
      select(ref, 'domain-execution-dependency');
    for (const ref of domain.conceptRefs) concepts.add(ref);
  }
  for (const concept of matrix.concepts.filter((x) => concepts.has(x.id))) {
    for (const ref of concept.axisRefs)
      select(ref, 'concept-execution-dependency');
  }
  return {
    schemaVersion: '1.0.0',
    uncertain,
    axes: matrix.axes.map((axis) => ({
      axisRef: axis.id,
      executionStatus: selected.has(axis.id) ? 'pending' : 'skipped',
      reasons: reasons.get(axis.id) ?? ['not-routed'],
      facetRefs: axis.facets.map((x) => x.id),
    })),
    uiDomainRefs: matrix.uiDomains
      .filter((x) => domains.has(x.id))
      .map((x) => x.id),
    decisions,
  };
}

function discovery(matrix) {
  return {
    axes: matrix.axes.map(({ id, name, purpose, facets }) => ({
      id,
      name,
      purpose,
      facets: facets.map(({ id: facetId, name: facetName, question }) => ({
        id: facetId,
        name: facetName,
        question,
      })),
    })),
    concepts: matrix.concepts.map(({ id, name, description, axisRefs }) => ({
      id,
      name,
      description,
      axisRefs,
    })),
    uiDomains: matrix.uiDomains.map(
      ({ id, name, description, detectionCues, axisRefs, conceptRefs }) => ({
        id,
        name,
        description,
        detectionCues,
        axisRefs,
        conceptRefs,
      }),
    ),
  };
}

export async function compileContext(
  {
    phase,
    mode = 'full',
    axisRef = null,
    request = null,
    evidence = null,
    fragments = [],
    dna = null,
    compatibility = null,
    sourceHashes = {},
  },
  { rootDirectory = pluginRoot } = {},
) {
  requireCondition(
    phases.includes(phase) && modes.includes(mode),
    'Unknown context phase or mode',
  );
  const canonical = {};
  const hashes = {};
  const read = async (file) => {
    const bytes = await fs.readFile(path.join(rootDirectory, file));
    hashes[file] = sha256(bytes);
    canonical[file] = file.endsWith('.json')
      ? JSON.parse(bytes)
      : bytes.toString('utf8');
    return canonical[file];
  };
  const matrix = await read(matrixFile);
  requireCondition(
    mode === 'full' || matrix.contextContractVersion === '1.0.0',
    'Canonical matrix does not support this context compiler; use full mode',
  );
  if (request)
    await assertValidRequestContract(request, {
      requireExecutable: true,
      rootDirectory,
    });
  if (request)
    requireCondition(
      request.interpretation.status !== 'blocked',
      'Blocked request cannot execute',
    );
  if (request?.operation === 'extract') {
    const expectedPaths = request.parameters.sources
      .map((source) => path.resolve(source.path))
      .sort();
    requireCondition(
      isDeepStrictEqual(Object.keys(sourceHashes).sort(), expectedPaths) &&
        Object.values(sourceHashes).every((hash) =>
          /^sha256:[a-f0-9]{64}$/u.test(hash),
        ),
      'Verified hashes for every original source are required; use loadContextInput',
    );
    if (evidence)
      requireCondition(
        evidence.sources.every(
          (source) =>
            sourceHashes[path.resolve(source.path)] === source.contentHash,
        ),
        'Evidence hashes differ from original source bindings',
      );
  }
  for (const stage of matrix.promptStages) await read(stage.file);
  for (const file of [
    'prompts/_shared-contract.md',
    'schemas/design-dna.schema.json',
    'schemas/request-contract.schema.json',
    'docs/conversational-request-contract.md',
    'docs/installation-contract.md',
    'schemas/integration-policy.schema.json',
  ])
    await read(file);
  for (const file of [
    'schemas/context-contract.schema.json',
    'src/runtime/context.mjs',
    'src/runtime/context-stage.mjs',
    'docs/lossless-context.md',
    'skills/designome-extract/SKILL.md',
    'skills/designome-install/SKILL.md',
    'skills/designome-audit/SKILL.md',
  ])
    await read(file);
  if (!['request'].includes(phase))
    requireCondition(request, 'A normalized request is required');
  if (phase === 'analysis')
    requireCondition(
      matrix.axes.some((x) => x.id === axisRef) && axisRef !== governance,
      'Analysis requires a specialist axis',
    );
  if (['source', 'analysis', 'governance', 'synthesis'].includes(phase))
    requireCondition(
      request.operation === 'extract',
      'Extraction phase requires an extract request',
    );
  if (['install', 'audit'].includes(phase))
    requireCondition(
      request.operation === phase && dna?.status === 'accepted',
      'Accepted DNA and matching operation required',
    );
  if (dna)
    await assertValidDesignDna(dna, { requireAccepted: true, rootDirectory });
  const routing = resolveContextRouting(matrix, request, evidence);
  if (['governance', 'synthesis'].includes(phase)) {
    const expectedAxes = routing.axes.filter(
      (axis) => phase === 'synthesis' || axis.axisRef !== governance,
    );
    requireCondition(
      fragments.length === expectedAxes.length &&
        new Set(fragments.map((item) => item.axisRef)).size ===
          fragments.length,
      'All specialist envelopes, including skipped axes, are required',
    );
    for (const axis of expectedAxes) {
      const envelope = fragments.find((item) => item.axisRef === axis.axisRef);
      requireCondition(envelope, `Missing envelope for ${axis.axisRef}`);
      const stagePack =
        axis.executionStatus === 'skipped'
          ? { routing }
          : await compileContext(
              {
                phase: axis.axisRef === governance ? 'governance' : 'analysis',
                mode,
                axisRef: axis.axisRef === governance ? null : axis.axisRef,
                request,
                evidence,
                sourceHashes,
                compatibility,
                fragments:
                  axis.axisRef === governance
                    ? fragments.filter((item) => item.axisRef !== governance)
                    : [],
              },
              { rootDirectory },
            );
      validateStageEnvelope(envelope, stagePack);
      requireCondition(
        envelope.executionStatus !== 'blocked',
        'Blocked specialist must be resolved before synthesis',
      );
    }
    requireCondition(
      compatibility && typeof compatibility === 'object',
      'Compatibility report is required',
    );
  }
  if (phase === 'analysis')
    requireCondition(
      routing.axes.find((x) => x.axisRef === axisRef).executionStatus !==
        'skipped',
      'Axis is not routed',
    );
  const input = {
    phase,
    mode,
    axisRef,
    request,
    evidence,
    fragments,
    dna,
    compatibility,
    sourceHashes,
  };
  const entries = [];
  const add = (source, pointer, value, reason) =>
    entries.push({
      source,
      pointer,
      hash: contextHash(value),
      reason,
      value: structuredClone(value),
    });
  const file = (name, reason) => add(name, '', canonical[name], reason);
  file('prompts/_shared-contract.md', 'mandatory-guardrails');
  const stageFiles = {
    request: ['prompts/00-orchestrator.md'],
    source: ['prompts/01-source-evidence.md'],
    analysis: [matrix.axes.find((x) => x.id === axisRef)?.promptRef],
    governance: ['prompts/14-system-governance.md'],
    synthesis: ['prompts/15-synthesis.md'],
    install: ['prompts/16-project-integration.md'],
    audit: ['prompts/17-generation-audit.md'],
  };
  for (const name of stageFiles[phase]) file(name, 'stage-instructions');
  if (['request', 'source'].includes(phase)) {
    file('schemas/request-contract.schema.json', 'complete-request-contract');
    file('docs/conversational-request-contract.md', 'normalization-semantics');
  }
  if (['governance', 'synthesis', 'install', 'audit'].includes(phase))
    file('schemas/design-dna.schema.json', 'complete-authoring-semantics');
  if (phase === 'install') {
    file('docs/installation-contract.md', 'installation-policy');
    file(
      'schemas/integration-policy.schema.json',
      'complete-integration-policy',
    );
  }
  const fullMatrix =
    mode !== 'lossless-pack' ||
    ['governance', 'synthesis', 'install', 'audit'].includes(phase);
  if (fullMatrix) file(matrixFile, 'full-canonical-matrix');
  else {
    for (const [key, value] of Object.entries(matrix)) {
      if (
        ![
          'axes',
          'concepts',
          'uiDomains',
          'documentationProjection',
          'promptStages',
        ].includes(key)
      )
        add(matrixFile, `/${key}`, value, 'global-contract');
    }
    const index = discovery(matrix);
    // Index fields are exact canonical values, not generated summaries.
    for (const [collection, records] of Object.entries(index)) {
      records.forEach((record, position) => {
        for (const key of Object.keys(record)) {
          if (key === 'facets') {
            record.facets.forEach((facet, facetIndex) =>
              Object.entries(facet).forEach(([field, value]) =>
                add(
                  matrixFile,
                  `/${collection}/${position}/facets/${facetIndex}/${field}`,
                  value,
                  'global-discovery',
                ),
              ),
            );
          } else
            add(
              matrixFile,
              `/${collection}/${position}/${key}`,
              record[key],
              'global-discovery',
            );
        }
      });
    }
    if (phase === 'analysis') {
      const axis = matrix.axes.find((x) => x.id === axisRef);
      const domainRecords = matrix.uiDomains.filter(
        (x) =>
          routing.uiDomainRefs.includes(x.id) && x.axisRefs.includes(axisRef),
      );
      const conceptIds = new Set([
        ...axis.conceptRefs,
        ...domainRecords.flatMap((x) => x.conceptRefs),
      ]);
      for (const [collection, records] of [
        ['axes', [axis]],
        ['concepts', matrix.concepts.filter((x) => conceptIds.has(x.id))],
        ['uiDomains', domainRecords],
      ]) {
        for (const record of records)
          add(
            matrixFile,
            `/${collection}/${matrix[collection].indexOf(record)}`,
            record,
            'complete-specialist-context',
          );
      }
    }
    if (phase === 'source')
      matrix.uiDomains.forEach((domain, index) =>
        add(
          matrixFile,
          `/uiDomains/${index}`,
          domain,
          'complete-domain-detection',
        ),
      );
  }
  // Remove descendants when a complete ancestor is already present.
  const nodes = entries.filter(
    (entry) =>
      !entries.some(
        (parent) =>
          parent !== entry &&
          parent.source === entry.source &&
          (parent.pointer === '' ||
            entry.pointer.startsWith(`${parent.pointer}/`)),
      ),
  );
  nodes.sort((a, b) =>
    `${a.source}#${a.pointer}`.localeCompare(`${b.source}#${b.pointer}`, 'en'),
  );
  // Full fragments and evidence retain conflicts, exceptions and unknown fields.
  const payload = {
    request,
    evidence,
    fragments,
    dna,
    compatibility,
    sourceHashes,
  };
  const body = {
    schemaVersion: '1.0.0',
    compilerVersion: '1.0.0',
    phase,
    mode,
    axisRef,
    inputHash: contextHash(input),
    canonicalHashes: hashes,
    routing,
    nodes,
    payload,
  };
  const pack = { ...body, packHash: contextHash(body) };
  return {
    ...pack,
    metrics: {
      serializedBytes: Buffer.byteLength(stableJson(pack)),
      canonicalBytes: Object.values(canonical).reduce(
        (sum, x) =>
          sum + Buffer.byteLength(typeof x === 'string' ? x : stableJson(x)),
        0,
      ),
      tokenEstimate: 'Not measured; serialized bytes are not model tokens.',
      semanticParity: 'not-established',
    },
  };
}

export async function validateContext(pack, input, options) {
  const expected = await compileContext(input, options);
  requireCondition(
    isDeepStrictEqual(pack, expected),
    'Context is stale, incomplete, altered, or bound to different inputs; rebuild from trusted inputs',
  );
  return {
    valid: true,
    packHash: expected.packHash,
    validation: 'deterministic-projection-only',
  };
}

// The host reads this verified materialized view, not per-leaf integrity
// metadata. Every leaf is copied exactly; no model summarizes the pack.
export function contextView(pack) {
  const context = {};
  for (const node of pack.nodes) {
    requireCondition(
      !['__proto__', 'prototype', 'constructor'].includes(node.source),
      'Unsafe context source key',
    );
    if (node.pointer === '') {
      context[node.source] = structuredClone(node.value);
      continue;
    }
    const segments = node.pointer
      .slice(1)
      .split('/')
      .map((key) => key.replaceAll('~1', '/').replaceAll('~0', '~'));
    requireCondition(
      segments.every(
        (key) => !['__proto__', 'prototype', 'constructor'].includes(key),
      ),
      'Unsafe context pointer',
    );
    context[node.source] ??= {};
    let cursor = context[node.source];
    segments.forEach((key, index) => {
      if (index === segments.length - 1)
        cursor[key] = structuredClone(node.value);
      else {
        cursor[key] ??= /^\d+$/u.test(segments[index + 1]) ? [] : {};
        cursor = cursor[key];
      }
    });
  }
  return {
    schemaVersion: '1.0.0',
    packHash: pack.packHash,
    inputHash: pack.inputHash,
    phase: pack.phase,
    mode: pack.mode,
    axisRef: pack.axisRef,
    routing: structuredClone(pack.routing),
    payload: structuredClone(pack.payload),
    context,
  };
}

export async function validateContextView(view, pack, input, options) {
  await validateContext(pack, input, options);
  requireCondition(
    isDeepStrictEqual(view, contextView(pack)),
    'Host view differs from the validated canonical projection',
  );
  return {
    valid: true,
    packHash: pack.packHash,
    validation: 'deterministic-view-and-projection-only',
  };
}

export async function loadContextInput(specPath) {
  const spec = await readJson(specPath);
  requireCondition(
    spec && typeof spec === 'object' && !Array.isArray(spec),
    'Context spec must be an object',
  );
  const allowed = [
    'phase',
    'mode',
    'axisRef',
    'requestPath',
    'evidencePath',
    'fragmentPaths',
    'dnaPath',
    'compatibilityPath',
  ];
  requireCondition(
    Object.keys(spec).every((key) => allowed.includes(key)),
    'Unknown context input field',
  );
  const resolve = (name) =>
    path.resolve(path.dirname(path.resolve(specPath)), name);
  const request = spec.requestPath
    ? (
        await loadRequestContract(resolve(spec.requestPath), {
          requireExecutable: true,
        })
      ).contract
    : null;
  const evidence = spec.evidencePath
    ? await readJson(resolve(spec.evidencePath))
    : null;
  const sourceHashes = {};
  // Bind original screenshot bytes, including aliases with different directives.
  if (request?.operation === 'extract') {
    for (const source of request.parameters.sources) {
      const hash = `sha256:${sha256(await fs.readFile(path.resolve(source.path)))}`;
      sourceHashes[path.resolve(source.path)] = hash;
      if (evidence)
        requireCondition(
          evidence.sources.some(
            (item) =>
              path.resolve(item.path) === path.resolve(source.path) &&
              item.contentHash === hash,
          ),
          'Screenshot changed or evidence source hash missing',
        );
    }
  }
  return {
    phase: spec.phase,
    mode: spec.mode ?? 'full',
    axisRef: spec.axisRef ?? null,
    request,
    evidence,
    sourceHashes,
    fragments: await Promise.all(
      (spec.fragmentPaths ?? []).map((name) => readJson(resolve(name))),
    ),
    dna: spec.dnaPath ? await readJson(resolve(spec.dnaPath)) : null,
    compatibility: spec.compatibilityPath
      ? await readJson(resolve(spec.compatibilityPath))
      : null,
  };
}

export async function writeContext({ specPath, outputDirectory }) {
  const input = await loadContextInput(specPath);
  const pack = await compileContext(input);
  const output = path.resolve(outputDirectory);
  const packPath = path.join(output, `${pack.packHash}.json`);
  const action = await writeJsonIfChanged(packPath, pack);
  const viewPath = path.join(output, `${pack.packHash}.view.json`);
  const viewText = `${stableJson(contextView(pack))}\n`;
  await writeIfChanged(viewPath, viewText);
  let comparison = null;
  if (input.mode === 'shadow') {
    // Global phases already keep the full matrix. Stage hashes must never be
    // silently rebound to another mode merely to produce a comparison.
    const candidate = ['governance', 'synthesis'].includes(input.phase)
      ? pack
      : await compileContext({ ...input, mode: 'lossless-pack' });
    const candidatePath = path.join(output, `${candidate.packHash}.json`);
    await writeJsonIfChanged(candidatePath, candidate);
    const candidateViewPath = path.join(
      output,
      `${candidate.packHash}.view.json`,
    );
    const candidateViewText = `${stableJson(contextView(candidate))}\n`;
    await writeIfChanged(candidateViewPath, candidateViewText);
    comparison = {
      candidatePath,
      candidateViewPath,
      candidateViewBytes: Buffer.byteLength(candidateViewText),
      baselineViewBytes: Buffer.byteLength(viewText),
      candidateBytes: candidate.metrics.serializedBytes,
      baselineBytes: pack.metrics.serializedBytes,
      semanticParity: 'not-established',
      executionMode: 'full',
    };
  }
  return {
    status: 'ready',
    packPath,
    viewPath,
    viewBytes: Buffer.byteLength(viewText),
    packHash: pack.packHash,
    action,
    metrics: pack.metrics,
    comparison,
  };
}

export async function recoverContext(pack, input, options) {
  try {
    await validateContext(pack, input, options);
    return { pack, fallback: false, requiresRerun: false };
  } catch (error) {
    if (error.code !== 'INVALID_CONTEXT') throw error;
    requireCondition(
      !['governance', 'synthesis'].includes(input.phase),
      'Rebuild specialist stages before recovering global context',
    );
    return {
      pack: await compileContext({ ...input, mode: 'full' }, options),
      fallback: true,
      requiresRerun: true,
      reason: error.message,
    };
  }
}
