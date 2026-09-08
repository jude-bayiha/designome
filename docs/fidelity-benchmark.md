# Documentation-only UI benchmark

The benchmark asks whether the Markdown dossier reproduces the useful visual logic of supplied screenshots. It evaluates scoped reference reconstruction and grammar transfer to new content. Visual finish and fidelity are separate: a polished component-library interface can still lose the source's composition or density.

## Prepare immutable inputs

Use a reviewed draft with [Fidelity Contract 1.0](fidelity-contract.md). Preparation neither accepts nor installs DNA. Create a corpus using the [schema](../schemas/benchmark.schema.json) and [example](../examples/benchmark-corpus.reference.json). Each case declares family, source references, comparison scope, task, capture dimensions and kind (`reference-reproduction` or `grammar-transfer`). Use at least two independent repetitions. Different visual identities should have separate DNA and plans.

```bash
designome benchmark-prepare \
  --dna /absolute/design-dna.json \
  --corpus /absolute/corpus.json \
  --output /absolute/new-benchmark-directory
```

Preparation verifies source hashes and produces `plan.json` plus one packet per repetition. A packet contains only `brief.json` and the 52 Markdown files. Known source paths are redacted, including prose occurrences. Screenshots, raw DNA, target code and other generations are excluded. Packets, DNA and sources are hash-bound. Reusing a populated output directory fails so earlier experiments remain reviewable.

## Generate and render

Give each generator only its packet. Separate agent contexts are required. The runtime checks declared identities and hashes; isolation is a host access discipline, not an operating-system sandbox or proof of model independence. Record model/version and reasoning settings when exposed by the host; absent settings limit repeatability.

An optional case `implementationContext` declares `framework`, `componentLibrary` and technical `requirements`. Compare React with `shadcn-ui` and `mui` against a `none` baseline. A neutral technical scaffold and official API documentation are allowed integration inputs only. Their default style is never DNA evidence. Use actual library components; a library-themed HTML imitation does not qualify.

Render in a real browser and save actual captures. Record native image dimensions, CSS viewport, scale, overflow, console observations and executed interactions. Promotional references need an explicit product-region scope; do not score an excluded outer frame as a product-UI failure. Do not claim exact CSS recovery from source pixels.

Keep private inputs and generated targets outside the repository. A standalone HTML artifact uses `path` and SHA-256. A built React app uses `implementation.kind: directory` and its complete deterministic tree hash, binding HTML and external JS/CSS together. Hash the lockfile in `integrationEvidence.dependencyArtifact`; record installed versions, actual components and theme adaptations. The runtime validates this metadata but does not inspect import semantics or execute a renderer.

Use the exported `hashBenchmarkDirectory(directory)` helper for directory artifacts so the evidence uses the same ordering and serialization as evaluation. Verify actual rendered fonts where possible: a declared sans-serif CSS stack can resolve to an unexpected local face. Record fallback corrections and preserve the original generation; normalize the environment before comparing libraries.

## Review independently

A reviewer who generated no repetition sees reference and rendered captures. It reports one concrete, source-referenced observation per aspect:

| Aspect             | Comparison                                                 |
| ------------------ | ---------------------------------------------------------- |
| Composition        | Region order, containment, main/supporting hierarchy       |
| Proportions        | Relative region and component sizes                        |
| Typography         | Role hierarchy, character, weight and line treatment       |
| Spacing            | Insets, row rhythm, gap ownership and density              |
| Color and surface  | Semantic palette, containment, borders and depth           |
| Component anatomy  | Parts, variants, alignment and action placement            |
| Identity           | Distinctive relationships and exceptions                   |
| Content resilience | Executed long, missing, extreme or alternate content cases |

Each result is `passed`, `failed` or `incomplete` with one epistemic status and a concrete statement. Initial static captures do not establish content resilience, accessibility, responsive behavior or interactions. Missing aspects or repetitions cannot pass. A reviewer cannot also generate another repetition.

A fidelity pass must compare a source-specific relationship: semantic color roles, value/label hierarchy, annotation placement, row occupancy or the actual encoding of a chart. Generic readability or an orderly grid supports a finish assessment but cannot by itself establish source fidelity. Check that matching palette swatches also retain their series meanings; a swapped legend remains a mismatch.

For a content-resilience pass, supply `additionalCaptures` with purpose, path and hash for distinct rendered content states at the planned dimensions. Otherwise the run remains incomplete even if the host labels that aspect passed. These captures establish only the actual stress cases reviewed, not every possible data or locale.

Optional `qualityAssessment` records visual `finish`, `coherence` and `readability` as `strong`, `mixed`, `weak` or `unknown`, with evidence and limitations. These grades never improve the fidelity result or establish production readiness.

## Evaluate evidence

Write evidence using the schema's `evidence` definition. Include the plan fingerprint, case/repetition, generator/reviewer identities, `sourceAccess: false`, packet hash, capture and implementation artifacts, observations, measurements and limitations. Library cases require integration evidence. Measurements refer to semantic targets/properties from fidelity constraints; framework-specific selectors do not enter canonical DNA.

```bash
designome benchmark-evaluate \
  --plan /absolute/benchmark/plan.json \
  --evidence /absolute/benchmark/evidence.json \
  --output /absolute/benchmark/report.json
```

The runtime rechecks hashes, required aspects, identities and capture dimensions. Reports group by family and component library. Pending calibrations remain diagnostic; accepted constraints must pass, with missing required measurements incomplete. Acceptance never turns a proposal into observation. A failed aspect remains a failure even if other evidence is missing.

The CLI returns a report for valid evidence, including failed or incomplete evaluations. Invalid evidence exits with an error. Automation must inspect `report.status`; successful invocation is not a visual pass.

## Evidence and limits

See [executed fidelity evaluation](fidelity-evaluation.md) for corpus, library versions, repetitions and findings. Repository tests use synthetic artifacts for contract and integrity checks; they do not prove visual fidelity. Rendered results apply only to the recorded sources, scope, host, model contexts, libraries and scales. They cannot establish universal quality, unseen page families, native mobile or motion.
