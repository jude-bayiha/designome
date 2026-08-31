---
name: designome-extract
description: Extract evidence-backed, framework-neutral UI Design DNA from one or more screenshots. Use when a user asks to analyze UI screenshots, derive reusable design rules or component guidance, capture state and edge-case expectations, or prepare Designome artifacts before installation in a target project.
---

# Extract Design DNA

Treat supplied screenshots as the only source of visual truth. Use the host model for visual reasoning and the bundled Node helper only for deterministic metadata and validation.

## Resolve bundled files

Resolve paths relative to this `SKILL.md`. The plugin root is `../..`. Convert it to an absolute path before invoking the helper; replace `<designome-plugin-root>` below with that path.

Read completely before analysis:

1. `../../prompts/_shared-contract.md`
2. `../../prompts/00-orchestrator.md`
3. `../../prompts/01-source-evidence.md`
4. `../../concepts/concept-matrix.v0.2.json`

Read each axis prompt only when the orchestrator routes that axis. Read `../../prompts/10-synthesis.md` before synthesis and `../../schemas/design-dna.schema.json` before writing Design DNA.

## Workflow

1. Confirm readable screenshot paths and select motion mode: `off`, `observed-only`, or `auto`. Default to `off` when the user does not request motion guidance.
2. Create a unique local run directory. Do not commit private screenshots or `.designome/runs/` artifacts.
3. Initialize deterministic source metadata:

   ```bash
   node <designome-plugin-root>/bin/designome.mjs init-run \
     --output <run-directory> \
     --motion <mode> \
     --image <absolute-image-path> [--image <another-path>]
   ```

4. Inspect every screenshot and write `evidence-index.json` with stable region IDs. Keep interpretations out of evidence descriptions.
5. Execute the routed axis prompts independently. Write each shared-contract JSON result under `stages/`.
6. Run synthesis. Produce `design-dna.json`, `design-rules.md`, `confidence-report.md`, and `unknowns.md`.
7. Validate the candidate:

   ```bash
   node <designome-plugin-root>/bin/designome.mjs validate-dna \
     --file <run-directory>/design-dna.json
   ```

8. Report coverage, conflicts, unknowns, unperformed validation, and the exact files produced. Leave the Design DNA as `draft` until the user explicitly accepts it.

When invoked from `designome run`, write the draft to the `expectedArtifact` path in the current host handoff, then call `designome run --resume`. The runtime detects and validates the artifact deterministically. It does not perform this skill's visual reasoning.

## Guardrails

- Use only `observed`, `inferred`, `proposed`, and `unknown`.
- Require evidence references for observed and inferred claims.
- The bundled `validate-dna` command performs dependency-light semantic contract checks. Do not call it full JSON Schema validation unless a separate schema validator actually ran.
- Never identify exact fonts, icon packages, CSS values, breakpoints, motion curves, or implementation libraries from resemblance alone.
- Do not create page inventories, role families, speculative screens, or target-project visual rules.
- A target-project path may inform later technical installation, never extraction.
- Do not install artifacts from this skill.
- Never mark the draft accepted on behalf of the human. The orchestrated workflow records the one mandatory human acceptance separately.
