# Runtime and CLI

The Designome runtime supports the agent skills with deterministic operations. It does not call a model API or perform visual design reasoning.

## Commands

### Validate a normalized conversational request

```bash
designome validate-request \
  --file /absolute/request-contract.json \
  --operation extract
```

The host agent interprets the conversation and writes the contract. Runtime semantic validation checks operation-specific paths, modes, authorization, source directives, matrix concept references, and token or rule categories. Repository validation also checks the complete JSON Schema. The runtime never interprets the original natural-language request.

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
- `run-plan.json`;
- an empty `stages/` directory.

Repeating the same command returns `unchanged`. Reusing the directory with different inputs fails instead of silently replacing the run.

### Validate Design DNA

```bash
node bin/designome.mjs validate-dna --file <design-dna.json>
node bin/designome.mjs validate-dna \
  --file <design-dna.json> \
  --require-accepted
```

Runtime validation checks versions, unique identities, source and evidence references, matrix concepts, claim evidence requirements, component references, motion rules, and acceptance status. Repository CI additionally validates the complete JSON Schema with Ajv.

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
.agents/skills/designome-audit/
<css-directory>/designome.generated.css
<css-directory>/designome.overrides.css
<css-entry> managed import block
AGENTS.md managed guidance block
```

The documentation directory contains `README.md` plus the 22 mandatory paths declared by `documentationProjection` in the concept matrix. They are grouped under `foundations/`, `components/`, `behavior/`, and `governance/`. A subject with no accepted visual claim still receives an honest `unknown` boundary or `proposed` stress-test contract; the runtime never fills the gap with fabricated observation.

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

## Exit behavior

| Exit | Meaning                                                                      |
| ---: | ---------------------------------------------------------------------------- |
|    0 | Command completed or installation is valid                                   |
|    1 | Invalid input, diagnostic failure, contract failure, or verification failure |
|    2 | Installation conflict; no write was performed                                |

Commands emit machine-readable JSON. Errors are emitted as JSON on standard error with a stable code, message, and details array.
