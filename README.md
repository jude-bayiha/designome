# Designome

Designome turns UI screenshots into an evidence-backed **Design DNA** that an existing coding agent can use to generate more coherent interfaces. It extracts reusable relationships, rules, component contracts, edge-case expectations, and validation guidance. It does not recreate a brand pixel for pixel or invent an unseen product world.

## Current status

The repository now contains the first executable vertical slice:

- a Codex plugin manifest with `designome-extract`, `designome-install`, and `designome-audit` skills;
- a versioned matrix of eight analysis axes and 18 cross-cutting concepts;
- 13 modular prompts for evidence intake, analysis, synthesis, integration, and audit;
- deterministic screenshot metadata, Design DNA validation, installation, and verification commands;
- one persistent `designome run` workflow with explicit human and host-agent handoffs and deterministic resume;
- a read-only `designome doctor` plus transactional prepare, journal, apply, verify, manifest, and rollback installation;
- executable audit planning with explicit browser-provider and evidence-layer boundaries;
- a versioned browser capture adapter and canonical provider state shared by JSON and Markdown reports;
- independent installation, mechanical, perceptual, and usage audit layers;
- bounded repair planning and project-aware shadcn/ui component mapping;
- a complete 23-file project-local design dossier spanning foundations, components, behavior, and governance, plus repository-native integration context;
- a project-local `designome-audit` skill that fresh Codex sessions can discover;
- idempotent managed CSS and agent guidance with checksums and user-owned overrides;
- repository quality, commit, CI, and release guardrails.

The host agent performs multimodal reasoning with its installed model and account. Designome does not require a separate OCR, computer-vision, model-training, or image-processing stack.

## Non-negotiable rules

1. Screenshots are the only source of visual truth.
2. Every claim is `observed`, `inferred`, `proposed`, or `unknown`.
3. `observed` and `inferred` claims retain localized evidence.
4. Static screenshots do not prove motion, responsive behavior, accessibility semantics, or runtime states.
5. A target project is an integration destination, never an implicit design source.
6. Specialized prompts produce fragments; synthesis resolves the canonical Design DNA.
7. Conversational skill requests are normalized once into a validated request contract before execution.
8. Generated files, user overrides, and managed guidance remain separate and idempotent.

## Conversational requests

`$designome-extract`, `$designome-install`, and `$designome-audit` accept ordinary instructions. The host agent converts relevant intent, paths, constraints, evidence routing, preferences, and explicit authorization into `request-contract.json`; the deterministic runtime validates that contract and rejects mismatched execution inputs.

Extraction requests may assign captures to specific subjects and request either direct destination fidelity or explicit cross-surface adaptation. For example:

```text
$designome-extract for a corporate website.
Use dashboard-1.png only for statistics and charts.
Use theme.png only for colors and surfaces.
```

Direct mode requires matching destination references before claiming destination-specific accuracy. Adaptation mode keeps unsupported destination rules proposed. See the [conversational request contract](docs/conversational-request-contract.md).

## Quick start

Requirements: Node.js 24+ and pnpm 11.5.2. From this repository, use
`pnpm designome <command>` in place of `designome <command>` if the CLI is
not installed on `PATH`.

Start the complete workflow from a dedicated workspace directory:

```bash
designome run \
  --source /absolute/reference.png \
  --project /absolute/target-project \
  --workspace /absolute/designome-workspace
```

The command stops at explicit handoffs instead of pretending that the
deterministic runtime can perform visual reasoning, generate the interface, or
control the host browser. Follow the returned JSON handoff, then resume from
the same workspace:

```bash
# After the host agent writes the draft Design DNA
designome run --resume --workspace /absolute/designome-workspace

# The only mandatory human approval in the normal workflow
designome run --resume \
  --workspace /absolute/designome-workspace \
  --accept-dna

# After the host agent implements or modifies the target interface
designome run --resume \
  --workspace /absolute/designome-workspace \
  --host-event implementation-complete

# After the host browser records and finalizes the requested evidence
designome run --resume \
  --workspace /absolute/designome-workspace \
  --host-event evidence-complete \
  --evidence /absolute/external-evidence.json
```

Every completed step is persisted in `workflow-state.json`. A later
`designome run --resume --workspace <directory>` continues from the first
unfinished or failed step without repeating extraction, acceptance, or another
completed operation.

Run a read-only project diagnostic independently when needed:

```bash
designome doctor \
  --project /absolute/target-project \
  --dna /absolute/accepted-design-dna.json
```

`doctor` reports `readOnly: true` and `writesPerformed: false`. A missing
`package.json`, invalid or unaccepted Design DNA, managed-file conflict, or
incompatible provider fails before installation writes begin. The standalone
`extract`, `install`, and `audit` commands remain supported; see
[Runtime and CLI](docs/runtime.md) for their complete options.

## Browser evidence boundary

The runtime writes a capture plan, the host agent drives its real browser, and
the versioned `designome/audit` adapter validates and normalizes observations.
The audit engine only evaluates the finalized evidence:

```js
import { createCaptureSession } from 'designome/audit';

const session = createCaptureSession(plan, {
  provider: 'in-app-browser',
  outputPath: 'audit/external-evidence.json',
});

await session.recordCapture(capture);
await session.recordInteraction(interaction);
await session.recordConsoleMessage(consoleMessage);
await session.recordAccessibilityCheck(accessibilityCheck);
await session.recordPerceptualObservation(perceptualObservation);
await session.finalize();
```

The adapter writes audit evidence schema `1.0.0`; incompatible versions fail
closed. Incomplete route, viewport, scenario, direction, or interaction
coverage fails finalization unless the host deliberately requests an
`incomplete` report. See the [browser evidence adapter contract](docs/browser-evidence-adapter.md)
and its [runnable example](examples/browser-adapter.reference.mjs).

## Audit result semantics

Browser-provider execution uses one canonical state in both JSON and Markdown:
`not-requested`, `provider-unavailable`, `awaiting-evidence`,
`evidence-received`, `running`, `passed`, `failed`, or `incomplete`. Valid
external evidence therefore never remains described as pending provider
execution.

The final result keeps four layers independent:

| Layer        | What it establishes                                                   | Evaluator                         |
| ------------ | --------------------------------------------------------------------- | --------------------------------- |
| Installation | Accepted DNA, manifest, ownership, checksums, and artifact integrity  | Deterministic runtime             |
| Mechanical   | Geometry, overflow, clipping, measurable constraints, console errors  | Runtime over browser observations |
| Perceptual   | Hierarchy, density, composition, rhythm, palette, and visual fidelity | Host agent, with provenance       |
| Usage        | Navigation, interactions, focus, states, responsive behavior, LTR/RTL | Browser observations and runtime  |

Each layer is reported as `passed`, `failed`, `incomplete`, `not-requested`,
or `unavailable`. A passing mechanical layer never implies that perceptual or
usage evaluation passed. The runtime never modifies the accepted Design DNA
during audit.

## Repository map

```text
.codex-plugin/ Codex plugin manifest
skills/        Extract, install, and audit skill entry points
bin/           Designome command-line entry point
src/runtime/   Dependency-light deterministic operations
concepts/    Versioned concept matrix
prompts/     Modular agent workflow
schemas/     Machine-readable contracts
examples/    Schema-valid Design DNA example
docs/        Product, architecture, concepts, evidence, and installation guidance
scripts/     Repository contract validation
tests/         Runtime and idempotency tests
```

Start with:

- [Product foundation](docs/product-foundation.md)
- [Architecture and methodology](docs/architecture-and-methodology.md)
- [Concept matrix](docs/concept-matrix.md)
- [Target-project installation contract](docs/installation-contract.md)
- [Rendered audit contract](docs/audit-contract.md)
- [Orchestration and host-agent contract](docs/orchestration-and-host-contract.md)
- [Browser evidence adapter](docs/browser-evidence-adapter.md)
- [Transactional installation and doctor](docs/transactional-installation.md)
- [Integration and calibration matrix](docs/integration-and-calibration-matrix.md)
- [Runtime and CLI](docs/runtime.md)
- [Reference screenshot analysis](docs/reference-analysis.md)
- [Design DNA v0.2 example](examples/design-dna.reference-v0.2.json)

## Local quality checks

```bash
pnpm install
pnpm check
pnpm designome --help
```

Husky formats staged files and validates Conventional Commit messages. CI runs the same repository checks. Release Please prepares releases from conventional commits merged into `main`.

## Agent workflow

1. Start `designome run --source <capture> --project <directory>`.
2. Follow the `$designome-extract` host handoff and resume.
3. Review and accept the draft Design DNA once.
4. Let the transactional runtime install it, then follow the host implementation handoff.
5. Record real browser and perceptual observations through the official adapter.
6. Resume for a consolidated four-layer audit result.

That forward test measures the actual product outcome: whether extracted knowledge improves a new UI without copying an existing screen.

Designome does not implement a second chat interface. Codex or another compatible host agent supplies the conversation, multimodal model, and authenticated account. The plugin supplies the specialized workflow; the Node helper owns deterministic file operations.
