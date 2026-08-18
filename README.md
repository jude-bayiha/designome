# Designome

Designome turns UI screenshots into an evidence-backed **Design DNA** that an existing coding agent can use to generate more coherent interfaces. It extracts reusable relationships, rules, component contracts, edge-case expectations, and validation guidance. It does not recreate a brand pixel for pixel or invent an unseen product world.

## Current status

The repository now contains the first executable vertical slice:

- a Codex plugin manifest with `designome-extract`, `designome-install`, and `designome-audit` skills;
- a versioned matrix of eight analysis axes and 18 cross-cutting concepts;
- 13 modular prompts for evidence intake, analysis, synthesis, integration, and audit;
- deterministic screenshot metadata, Design DNA validation, installation, and verification commands;
- executable audit planning with explicit browser-provider and evidence-layer boundaries;
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
7. Generated files, user overrides, and managed guidance remain separate and idempotent.

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
- [Integration and calibration matrix](docs/integration-and-calibration-matrix.md)
- [Runtime and CLI](docs/runtime.md)
- [Reference screenshot analysis](docs/reference-analysis.md)
- [Design DNA v0.2 example](examples/design-dna.reference-v0.2.json)

## Local quality checks

Requirements: Node.js 24+ and pnpm 11.5.2.

```bash
pnpm install
pnpm check
pnpm designome --help
```

Husky formats staged files and validates Conventional Commit messages. CI runs the same repository checks. Release Please prepares releases from conventional commits merged into `main`.

## Agent workflow

1. Invoke `$designome-extract` with representative screenshot paths.
2. Review the generated draft and explicitly accept the Design DNA.
3. Invoke `$designome-install` with the accepted file and target project.
4. Ask the coding agent to generate a new interface, such as user management.
5. Invoke `$designome-audit` against the implementation and accepted rules.

That forward test measures the actual product outcome: whether extracted knowledge improves a new UI without copying an existing screen.

Designome does not implement a second chat interface. Codex or another compatible host agent supplies the conversation, multimodal model, and authenticated account. The plugin supplies the specialized workflow; the Node helper owns deterministic file operations.
