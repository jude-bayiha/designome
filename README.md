# Designome

Designome turns UI screenshots into an evidence-backed **Design DNA** that an existing coding agent can use to generate more coherent interfaces. It extracts reusable relationships, rules, component contracts, edge-case expectations, and validation guidance. It does not recreate a brand pixel for pixel or invent an unseen product world.

## Current status

The repository defines the v0.2 product contract:

- a versioned matrix of eight analysis axes and 18 cross-cutting concepts;
- 13 modular prompts for evidence intake, analysis, synthesis, integration, and audit;
- a framework-neutral Design DNA JSON Schema and reference example;
- an idempotent target-project installation contract;
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
concepts/    Versioned concept matrix
prompts/     Modular agent workflow
schemas/     Machine-readable contracts
examples/    Schema-valid Design DNA example
docs/        Product, architecture, concepts, evidence, and installation guidance
scripts/     Repository contract validation
```

Start with:

- [Product foundation](docs/product-foundation.md)
- [Architecture and methodology](docs/architecture-and-methodology.md)
- [Concept matrix](docs/concept-matrix.md)
- [Target-project installation contract](docs/installation-contract.md)
- [Reference screenshot analysis](docs/reference-analysis.md)
- [Design DNA v0.2 example](examples/design-dna.reference-v0.2.json)

## Local quality checks

Requirements: Node.js 24+ and pnpm 11.5.2.

```bash
pnpm install
pnpm check
```

Husky formats staged files and validates Conventional Commit messages. CI runs the same repository checks. Release Please prepares releases from conventional commits merged into `main`.

## Intended user test

1. Supply representative screenshots and run the extraction pipeline.
2. Review and accept the resulting Design DNA.
3. Install it into a real target project.
4. Ask the coding agent to generate a new interface, such as user management.
5. Audit the result against the accepted rules and stress cases.

That forward test measures the actual product outcome: whether extracted knowledge improves a new UI without copying an existing screen.
