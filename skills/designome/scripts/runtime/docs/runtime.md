# Runtime and CLI

New extraction drafts require [Fidelity Contract 1.0](fidelity-contract.md); use `validate-dna --file <draft> --require-fidelity` for the standalone equivalent. `benchmark-prepare --dna <file> --corpus <file> --output <directory>` creates immutable docs-only packets. `benchmark-evaluate --plan <file> --evidence <file> --output <file>` verifies repeated rendered evidence. See [benchmark semantics](fidelity-benchmark.md), including component-library provenance and incomplete results.

The Designome runtime supports the agent skills with deterministic operations. It does not call a model API or perform visual design reasoning.

## Commands

Experimental commands `context`, `validate-context`, `context-stages` and `validate-stage` use the [lossless context contract](lossless-context.md). Extraction initialization accepts `--context-mode full|lossless-pack|shadow`; full remains default. Packs are content-addressed, never token-truncated. Audit focus is retained in the plan and capture fingerprint without dropping required rules.

### Validate a normalized conversational request

```bash
designome validate-request \
  --file /absolute/request-contract.json \
  --operation extract
```

The host agent interprets the conversation and writes request contract v1.1. Runtime semantic validation checks operation-specific paths, modes, authorization, global axis/domain focus, per-source axis/concept/UI-domain directives, and token/rule categories against matrix v0.3. Repository validation also checks the complete JSON Schema. The runtime never interprets the original natural-language request. Legacy v1.0 request artifacts are migrated in memory with empty axis/domain selectors.

### Run the complete resumable workflow

```bash
designome run \
  --source /absolute/reference.png \
  --request /absolute/request-contract.json \
  --project /absolute/target-project \
  --css-entry src/styles/globals.css

designome run --resume
designome run --resume --accept-dna
designome run --resume --host-event implementation-complete
designome run --resume \
  --host-event evidence-complete \
  --evidence /absolute/target-project/.designome/runs/<workflow-id>/audit/external-evidence.json
```

The state machine persists `workflow-state.json`, never repeats completed steps, and exposes one explicit owner for each runtime, host-agent, or human action. The only mandatory normal-workflow human decision is `--accept-dna`. See [Orchestration and host-agent contract](orchestration-and-host-contract.md).

### Diagnose a target without writing

```bash
designome doctor \
  --project /absolute/target-project \
  --dna /absolute/accepted-design-dna.json
```

The result always includes `readOnly` and `writesPerformed`. Missing `package.json` returns `PROJECT_PACKAGE_JSON_MISSING` before any target write.

### Initialize extraction separately

```bash
designome extract \
  --output .designome/runs/<run-id> \
  --request /absolute/request-contract.json \
  --source /absolute/reference.png
```

This compatibility command initializes deterministic metadata and returns a host-agent handoff. It does not perform visual reasoning. `init-run` remains available as the lower-level equivalent.

### Initialize an extraction run

```bash
node bin/designome.mjs init-run \
  --output .designome/runs/<run-id> \
  --request /absolute/request-contract.json \
  --motion off \
  --image /absolute/path/reference-1.png \
  --image /absolute/path/reference-2.jpeg
```

The command validates input paths, deduplicates identical images, reads PNG/JPEG/GIF/WebP dimensions from binary signatures, computes SHA-256 hashes, fingerprints the configuration, and writes:

- `source-manifest.json`;
- `request-contract.json` when supplied;
- `run-context.json`;
- `run-plan.json`, including contract-routed axes/domains or an explicit source-evidence routing deferral;
- an empty `stages/` directory.

Repeating the same command returns `unchanged`. Reusing the directory with different inputs fails instead of silently replacing the run.

### Measure screenshot regions

Use the bundled command when a visually identified source region needs a check on geometry or surface color. Run it from the repository or the installed skill's runtime directory. The installed skill includes its image decoders and runs locally with Node.js 24 or newer. It does not require a separate image tool or dependency installation.

```bash
node bin/designome.mjs measure-source \
  --image /absolute/reference.png \
  --region 120,400,1440,200 \
  --annotation /private/run/kpi-edges.png \
  > /private/run/kpi-measurement.json
```

- `--region` is `x,y,width,height` in the source image, with a zero-based origin. Omit it for a first pass over the whole image. Keep measurements inside an admitted product region once any presentation frame is identified.
- `edges.x` and `edges.y` report axis-aligned candidate transitions in source coordinates. Each position is the first pixel after the transition. A candidate needs support from at least 60% of the sampled scanlines. `--min-delta` controls the minimum difference in any decoded RGB channel (default: `6`). A narrow separator may have candidates on both sides. Tighten the region or inspect the annotation if several candidates are plausible.
- `colors.mostFrequent` reports decoded RGB samples with counts. Select a small, visually uniform patch to compare two surfaces. Transparent samples do not contribute. Samples are not color-managed across image profiles and do not recover a source CSS value or alpha setting.
- The JSON identifies the original with its SHA-256 and reports image-pixel units. Use same-capture proportions or contrast relationships in the DNA. Original viewport, CSS scale, fonts, semantics, motion and responsive behavior require separate evidence.
- The optional annotation is a native-size crop with cyan vertical and orange horizontal markers. It creates a new file in an existing directory. Keep it private together with the source and measurement JSON. The command supports static JPEG, GIF, WebP and non-interlaced PNG files up to 32 MiB, with sides up to 8192 px and at most 16,777,216 total pixels.

### Matrix brief and authoring expansion

```bash
node bin/designome.mjs matrix-brief --output <matrix-brief.md>
node bin/designome.mjs expand-dna \
  --file <design-dna.authoring.json> \
  --output <design-dna.json> \
  --require-fidelity
```

`matrix-brief` writes a compact Markdown view of the v0.3 matrix for extraction: every identifier, facet question, inspection list, screenshot limit and stress test, without the documentation projection or prompt registry. It is about half the size of the JSON, which stays authoritative. `expand-dna` completes the [assertion authoring shorthand](fidelity-contract.md#authoring-shorthand), writes the canonical Design DNA and returns the same semantic validation as `validate-dna`, with a nonzero exit code when errors remain.

### Validate Design DNA

```bash
node bin/designome.mjs validate-dna --file <design-dna.json>
node bin/designome.mjs validate-dna \
  --file <design-dna.json> \
  --require-accepted
```

Runtime validation supports current Design DNA v0.3 and legacy v0.2. For v0.3 it checks source classification/directives, evidence routing, typed token/rule/component contracts, dependencies, claim evidence requirements, motion, and exact coverage of all 13 axes, 65 facets, and 20 UI domains. Repository CI additionally validates the complete JSON Schema with Ajv.

### Install accepted Design DNA

```bash
node bin/designome.mjs install \
  --dna <accepted-design-dna.json> \
  --project <target-project> \
  --css-entry src/styles/globals.css \
  --docs-dir docs/design-system/generated \
  --rule-precedence complement \
  --existing-rules docs/design-system/core \
  --styling auto \
  --dry-run

node bin/designome.mjs install \
  --dna <accepted-design-dna.json> \
  --project <target-project> \
  --css-entry src/styles/globals.css \
  --docs-dir docs/design-system/generated \
  --rule-precedence complement \
  --existing-rules docs/design-system/core \
  --styling auto \
  --instructions-reviewed
```

The installer refuses non-project roots, broad paths, escaped CSS entries, unaccepted DNA, unsafe literal CSS values, duplicate generated token names, unmanaged markers, and modified managed artifacts.

Current target artifacts are:

```text
.designome/design-dna.json
.designome/manifest.json
docs/designome/ (or the configured documentation directory)
.agents/skills/designome-audit/ (unless a standalone designome skill is installed there)
.claude/skills/designome-audit/ (same condition)
<css-directory>/designome.generated.css
<css-directory>/designome.overrides.css
<css-entry> managed import block
AGENTS.md managed guidance block
CLAUDE.md managed guidance block, unless CLAUDE.md imports AGENTS.md
```

The documentation directory contains the design brief `README.md` (every measure, relationship and recipe with its screenshot evidence; the only file a generator must read in full) plus the 51 mandatory paths declared by `documentationProjection` in matrix v0.3 (52 files total). They are grouped under `foundations/`, `components/`, `patterns/`, `behavior/`, and `governance/`. Specialized renderers expose component variants/composition, every UI domain, complete facet/domain coverage, and source routing. Each artifact is rendered in full once, in its home file; other files that route it link there in one line. A subject with no accepted visual claim still receives an honest `unknown` boundary or `proposed` stress-test contract; the runtime never fills the gap with fabricated observation.

The installer detects Tailwind from project dependencies and CSS directives when `--styling auto` is used. It records the resolved adapter and rule-precedence policy in the manifest and generated integration documentation. Existing rule paths are read-only context and are never rewritten.

The accepted Design DNA is copied verbatim. Review source paths, notes, and extensions for private metadata before installation, especially when the target repository will be shared.

Literal accepted values and accepted bounded ranges with a preferred value become CSS custom properties. Bounds remain comments for audit visibility. Relationships, audit-only ranges, and unknown values remain comments rather than fabricated CSS values.

### Verify an installation

```bash
node bin/designome.mjs verify-install --project <target-project>
```

Verification checks the manifest, accepted Design DNA, full-file hashes, exact marker multiplicity, managed-block hashes, and presence of user-owned overrides. Layout migration deletes an obsolete generated documentation file only when its manifest ownership and checksum still match; manual changes remain conflicts.

### Initialize an implementation audit

```bash
node bin/designome.mjs audit \
  --project <target-project> \
  --config .designome/audit.config.json \
  --provider auto \
  --dry-run

node bin/designome.mjs audit \
  --project <target-project> \
  --provider in-app-browser
```

The user-owned audit config declares the base URL, routes, viewports, scenarios, directions, flows, requested layers, and output directory. The command verifies the managed installation, validates the accepted Design DNA, resolves a browser provider, and initializes `plan.json`, `findings.json`, canonical `report.json`, and `report.md`. It does not create final evidence before a provider actually supplies observations.

New installations generate an additive Audit Contract `2.0.0` configuration. It records `verification.dnaFingerprint` and an initially empty `verification.bindings` list. Use the dry-run plan to bind every established obligation to explicit route, viewport, scenario, and direction contexts, then regenerate the plan before capturing. The resulting plan exposes `verification.obligations`, `checks`, `exclusions`, and `unresolved`; a binding or check is an applicability declaration, not a proof.

After the host browser or project runner uses `createCaptureSession(plan)` and finalizes `external-evidence.json`, evaluate it without changing implementation code:

```bash
node bin/designome.mjs audit \
  --project <target-project> \
  --evidence audit/external-evidence.json \
  --overwrite
```

With separate authorization for implementation changes, initialize a bounded repair plan:

```bash
node bin/designome.mjs audit \
  --project <target-project> \
  --evidence audit/evidence.json \
  --output audit-repair \
  --mode repair \
  --max-passes 2 \
  --implementation-authorized
```

The repair plan includes observed finding IDs, excludes proposed calibration candidates, caps the loop at three passes, and forbids accepted Design DNA mutation. It guides the agent; the deterministic helper does not edit implementation source files itself.

Provider resolution never silently installs dependencies. `auto` selects an existing target-project Playwright setup when one is detected, otherwise it produces a static-only plan. `in-app-browser` records that the host agent owns browser execution. `managed-playwright` remains `provider-unavailable` unless a separately implemented provider exists; `--browser-install-authorized` only records a reviewed setup proposal and the audit command still performs no dependency mutation.

Provider reports use the validated states `not-requested`, `provider-unavailable`, `awaiting-evidence`, `evidence-received`, `running`, `passed`, `failed`, and `incomplete`. Installation, mechanical, perceptual, and usage layers are reported separately.

Audit Contract 2.0 evidence adds `checkRef` to each perceptual observation and accepts planned `recordFidelityMeasurement` records. The runtime recalculates coverage from recorded captures and flows, verifies target hashes and native image dimensions, keeps CSS viewport context separate from file dimensions, and evaluates accepted constraints per capture. Ratios never combine desktop and mobile measurements. Missing or incompatible evidence is `incomplete`; a failed established check is `failed`. `unknown` or `proposed` perceptual claims cannot be reported as a verdict.

Legacy schema `0.1.0` and Audit Contract `1.0.0` artifacts remain readable for historical runs. When a legacy evidence file is supplied to a 2.0 plan, the command returns `AUDIT_EVIDENCE_RECAPTURE_REQUIRED` before writing a successful result. `designome run --resume` keeps accepted extraction, acceptance, installation, and implementation steps intact while handing capture back to the host.

## Exit behavior

| Exit | Meaning                                                                      |
| ---: | ---------------------------------------------------------------------------- |
|    0 | Command completed or installation is valid                                   |
|    1 | Invalid input, diagnostic failure, contract failure, or verification failure |
|    2 | Installation conflict; no write was performed                                |

Commands emit machine-readable JSON. Errors are emitted as JSON on standard error with a stable code, message, and details array.

## Measure composition

Use Node 24 and the installed bundle. The skill loads its bundled decoder on demand. Node reads the local WebP WebAssembly module from disk. Measurements use the stored raster orientation and decoded pixel colors. JPEG and lossy WebP can shift colors or soften edges. Export animated images as individual frames before measurement. The browser provider used to produce an audit capture has its own setup.

Run `node bin/designome.mjs measure-composition --plan plan.json --image source.png` and save stdout in the private extraction run. Add `--render captured.png` to replay on a corresponding audit capture. Each report includes the original file hashes, actual probe rectangles, observed edge candidates or color samples, and relation results.

A version 1 plan defines named probes and relations. Regions are normalized left, top, right, bottom coordinates. Visually confirm each region and its semantic role. An optional `renderRegion` identifies that same feature after reflow. Keep the source region, relation definition and tolerance fixed. Set the tolerance using the accepted bounds or label it as a proposed diagnostic tolerance.

```json
{
  "version": 1,
  "probes": {
    "left": { "axis": "x", "boundary": "start" },
    "right": { "axis": "x", "boundary": "end" },
    "divider": { "axis": "x", "region": [0.12, 0.1, 0.32, 0.9] }
  },
  "relations": [
    {
      "id": "sidebar-share",
      "kind": "ratio",
      "probes": ["left", "divider", "left", "right"],
      "tolerance": 0.005
    }
  ]
}
```

Use measured frame edges for a screenshot with presentation margins. For ratios, the first pair supplies the span and the second pair the denominator on the same axis. Use a signed `offset` to compare alignment between two rows. For `contrast`, supply two `color` probes on flat opaque surfaces. The result is their relative luminance contrast ratio. A tolerance of 0.005 for a width share means half a percentage point. Multiple distinct edge candidates, absent edges and regions without a majority color yield incomplete measurements. Match the viewport and screen state before interpreting differences.
