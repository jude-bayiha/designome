# Lossless context compiler

## Status

Context Contract `1.0.0` is experimental. DNA stays `0.3.0`; Request Contract stays `1.1.0`. Default: `full`. Explicit opt-in: `lossless-pack`. `shadow` executes full context and writes a candidate for inspection. Projection integrity is not behavioral equivalence. The host still interprets conversation, inspects screenshots and judges visual quality. Target projects supply technical integration facts only.

## Architecture

```text
Conversation -> discovery -> normalized request
Screenshots -> host evidence index -> routing manifest
Canonical inputs -> specialist packs -> stage envelopes
Governance -> synthesis -> draft -> human acceptance
Transactional installation -> four-layer audit
```

Execution closure differs from context closure. Explicit selectors, admitted regions and their domain/concept dependencies select execution. Reading a concept associated with a specialist does not recursively execute all its related axes. Every specialist receives its complete five-facet axis, associated concepts and routed domains, with limits and stress tests.

All optimized packs retain exact global discovery fields: axis names/purposes, facet questions, concept descriptions, domain descriptions/detection cues. This index routes work; it is not specialist guidance. Source review receives complete domain definitions. Governance, synthesis, installation and audit retain the full matrix. Governance/synthesis retain all actual fragments; installation/audit retain full accepted DNA and schema. This conservative version does not prune audit dependencies or abbreviate authoring semantics.

## Invocation

Create a JSON specification. Paths resolve relative to it:

```json
{
  "phase": "analysis",
  "mode": "lossless-pack",
  "axisRef": "axis.data-display-visualization",
  "requestPath": "request-contract.json",
  "evidencePath": "evidence-index.json",
  "compatibilityPath": "compatibility-report.json"
}
```

```bash
node <plugin-root>/bin/designome.mjs context --spec <spec.json> --output <run>/context
node <plugin-root>/bin/designome.mjs validate-context --spec <spec.json> --file <returned-pack-path> --view <returned-view-path>
```

Read the returned `viewPath` completely, not the integrity pack. Its `context` groups exact projected values by canonical source; `routing` and `payload` remain complete. The runtime validates the view against an independently reconstructed pack. Per-node hashes, pointers and inclusion reasons stay in the machine-readable pack. Complete ancestors replace duplicate descendants, never their contents. Bootstrap normalization uses `phase: request` without a request path. Other phases require a matching normalized request. Installation/audit also require an accepted `dnaPath`.

`run`, `extract` and `init-run` accept `--context-mode full|lossless-pack|shadow`. Experimental initialization requires `--request`, creates a source pack and binds the mode into the run fingerprint and plan. Default artifacts remain compatible.

## Source evidence

Follow `schemas/context-contract.schema.json#/$defs/evidence`. Include every request source once, including identical bytes at distinct paths with different directives. Each source has `path`, actual `sha256:`-prefixed `contentHash`, boolean `complete`, and nonempty review `basis`. `complete` means review completeness, not complete UI/UX evidence.

Each region has a stable `id`, `sourcePath`, bounding `region` description, `basis`, confidence between zero and one, and arrays `axisRefs`, `conceptRefs`, `uiDomainRefs`, `tokenCategories`, `ruleCategories`. Preserve extra observations and unknowns. Missing review or confidence below 0.8 expands execution to all axes without widening evidence authorization. The threshold is conservative policy, not calibrated probability.

Experimental `only` admission requires each populated selector dimension to match. Split mixed subjects into separate records. `exclude` rejects any match. `prefer` preserves priority, not altered truth. Related-axis execution never authorizes unrelated evidence. Each decision preserves its full directive, including negative routes. Legacy full-mode admission remains unchanged.

Packs and original screenshots can contain rejected regions. The runtime does not crop or isolate pixels; the host must respect boundaries. Structural checks cannot prove source inspection or correct classification. Phone-shaped dimensions do not prove native mobile; corporate intent does not turn dashboards into marketing evidence. Preserve compatibility gaps and proposed adaptations.

## Stage envelopes

After review, compile a source pack including evidence and compatibility paths:

```bash
node <plugin-root>/bin/designome.mjs context-stages --spec <source-spec.json> --pack <source-pack.json> --output <ledger.json>
```

The 13 entries and 65 unknown facets are scaffolding only. For each selected axis, compile its analysis pack and execute the specialist. Copy its ledger entry into an envelope, set `packHash` and `inputHash` from that pack, retain `axisRef`, supply the complete shared-contract `fragment`, mirror its five `facetCoverage` records, and set `executionStatus` to complete/partial/blocked matching the fragment. Preserve all extra fragment fields, exceptions, conflicts and unknowns.

```bash
node <plugin-root>/bin/designome.mjs validate-stage --spec <axis-spec.json> --pack <axis-pack.json> --file <axis-envelope.json>
```

Skipped entries retain null hashes/fragment, unknown facets and an explicit reason. They cannot become implicitly complete or non-applicable. Governance uses `phase: governance`, the same inputs/mode and `fragmentPaths` for all 12 non-governance envelopes. Synthesis includes all 13. The compiler reconstructs each expected specialist context. Missing/blocked stages prevent synthesis; partial stages retain gaps. Compatibility is mandatory.

Experimental `designome run` expects the synthesis specification at `run-plan.context.synthesisInputPath`. Resume recompiles it against the initialized request/mode before human acceptance. The normal DNA validator still checks the draft. Neither check proves faithful prose synthesis; human review and forward evaluation remain necessary.

## Integrity and fallback

Canonical files, compiler code, requests and screenshot bytes bind packs. Independent reconstruction rejects omissions, changed limits, additions and stale inputs even after submitted checksums are recalculated. Identical inputs reuse content-addressed paths. No token budget truncates nodes or fragments. Metrics measure UTF-8 bytes, not model tokens. Smaller later packs do not evict earlier conversation context; discovery/provenance overhead can outweigh savings.

`viewBytes` measures the actual compact JSON file intended for host reading; pack metrics separately measure compact integrity serialization. Shadow output includes both full and candidate view byte counts. Savings are stage-specific and never an account-usage guarantee.

Programmatic callers should use `loadContextInput` to validate requests and read original screenshot hashes before compilation. The lower-level `compileContext` accepts trusted in-memory inputs and preverified `sourceHashes`; it does not independently inspect image bytes or prove visual observations.

Stop using an invalid pack and rebuild from trusted originals. Exported `recoverContext` rebuilds full request/source/analysis/install/audit context and marks prior work for rerun. Missing originals fail; governance/synthesis requires rebuilding upstream envelopes first. Never silently rebind old work to new instructions. Project-local audit without the compiler keeps its installed documentation workflow and reports unavailable compiler validation; no implicit dependency installation.

## Promotion gate

Automated tests cover exact pointers, complete dependencies, 13/65 obligations, source restrictions, tampering, freshness, reuse, stage bindings, full fragments, accepted DNA, CLI integration and existing installer/audit regressions. Full JSON Schema checks remain separate from runtime semantic validation.

Promotion requires independent repeated full-versus-pack extractions from identical raw inputs and held-out dashboards, corporate sites, native mobile, mixed/restricted references, contradictions and poor captures. Compare supported claims, evidence, confidence, exceptions, unknowns, facet depth and rendered behavior—not wording or claim counts. Baseline mistakes are not an oracle. Projection tests never mark semantic parity passed; full stays default until behavioral evidence exists.
