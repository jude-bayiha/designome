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
5. `../../schemas/request-contract.schema.json`
6. `../../docs/conversational-request-contract.md`

Read each axis prompt only when the orchestrator routes that axis. Read `../../prompts/10-synthesis.md` before synthesis and `../../schemas/design-dna.schema.json` before writing Design DNA.

## Workflow

1. Interpret the complete conversational request once. Normalize its screenshot paths, target use case, adaptation mode, motion mode, constraints, and per-source evidence directives into an `extract` request contract. Use `all` for unrestricted captures, `only` or `exclude` as hard routing, and `prefer` as a priority. Map ordinary language such as "colors" or "statistics" to canonical concept references and token or rule categories. Record unclear instructions as ambiguities and meaningless text as ignored fragments; never guess a use case from nonsense.
2. Validate the request contract before visual analysis:

   ```bash
   node <designome-plugin-root>/bin/designome.mjs validate-request \
     --file <request-contract.json> \
     --operation extract
   ```

3. Confirm readable screenshot paths and select motion mode: `off`, `observed-only`, or `auto`. Default to `off` when the user does not request motion guidance. Create a unique local run directory. Keep the initial request contract outside that empty directory; initialization copies it into the run. Do not commit private screenshots or `.designome/runs/` artifacts.
4. Initialize deterministic source metadata:

   ```bash
   node <designome-plugin-root>/bin/designome.mjs init-run \
     --output <run-directory> \
     --request <request-contract.json> \
     --motion <mode> \
     --image <absolute-image-path> [--image <another-path>]
   ```

5. Inspect every screenshot and write `evidence-index.json` with stable region IDs. Keep interpretations out of evidence descriptions. Infer likely source surfaces or page families with evidence and confidence, then write `compatibility-report.json` against the requested use case.
6. In `direct` mode, do not claim destination accuracy when matching source families are missing. Tell the user which references are needed and continue only with source-grounded base extraction. In explicit `adapt` mode, keep cross-surface additions `proposed`.
7. Execute the routed axis prompts independently. Enforce each source directive before admitting evidence and write each shared-contract JSON result under `stages/`.
8. Run synthesis. Produce `design-dna.json`, `design-rules.md`, `confidence-report.md`, and `unknowns.md`.
9. Validate the candidate:

   ```bash
   node <designome-plugin-root>/bin/designome.mjs validate-dna \
     --file <run-directory>/design-dna.json
   ```

10. Report request interpretation, source compatibility, coverage, conflicts, unknowns, unperformed validation, and the exact files produced. Leave the Design DNA as `draft` until the user explicitly accepts it.

When invoked from `designome run`, write the draft to the `expectedArtifact` path in the current host handoff, then call `designome run --resume`. The runtime detects and validates the artifact deterministically. It does not perform this skill's visual reasoning.

## Guardrails

- Use only `observed`, `inferred`, `proposed`, and `unknown`.
- Require evidence references for observed and inferred claims.
- The bundled `validate-dna` command performs dependency-light semantic contract checks. Do not call it full JSON Schema validation unless a separate schema validator actually ran.
- Never identify exact fonts, icon packages, CSS values, breakpoints, motion curves, or implementation libraries from resemblance alone.
- Do not create page inventories, role families, speculative screens, or target-project visual rules.
- Never let a target use case rewrite source observations. Destination-specific rules absent from matching captures remain proposed.
- Never use a capture outside its `only` or `exclude` evidence boundary, even when another prompt would normally inspect it.
- A target-project path may inform later technical installation, never extraction.
- Do not install artifacts from this skill.
- Never mark the draft accepted on behalf of the human. The orchestrated workflow records the one mandatory human acceptance separately.
