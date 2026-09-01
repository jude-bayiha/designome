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
4. `../../concepts/concept-matrix.v0.3.json`
5. `../../schemas/request-contract.schema.json`
6. `../../docs/conversational-request-contract.md`

Read each axis prompt only when the orchestrator routes that axis. Read `../../prompts/15-synthesis.md` before synthesis and `../../schemas/design-dna.schema.json` before writing Design DNA.

## Workflow

1. Interpret the complete conversational request once. Normalize its screenshot paths, optional target-use-case sentence, adaptation mode, motion mode, constraints, global focus, and per-source evidence directives into an `extract` request contract. Map ordinary language to canonical axis, concept, UI-domain, token-category, and rule-category references. Use `all` for unrestricted captures, `only` or `exclude` as hard routing, and `prefer` as a priority. A phrase such as "for a corporate website" is usable intent; a fragment such as "jjjggjgmsmssnfndndndnsnddjdjd" is an ignored fragment and never becomes a use case, selector, claim, or permission.
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

5. Inspect every screenshot and write `evidence-index.json` with stable region IDs. Keep interpretations out of visible summaries. Classify each source surface (`website`, `web-app`, `mobile-app`, `desktop-app`, `other`, or `unknown`), infer an archetype only when visible structure supports it, record confidence and basis, and detect every applicable UI domain. A narrow capture may suggest mobile, but dimensions alone do not prove native mobile, responsive web, or WebView.
6. Write `compatibility-report.json` against the requested use case. In `direct` mode, do not claim destination accuracy when matching source families are missing. Say this concretely: a corporate website needs representative corporate/marketing website captures; a mobile app needs representative mobile-app captures. A dashboard capture may still contribute only its explicitly routed statistics, charts, colors, components, or other visible subjects. In explicit `adapt` mode, preserve source observations and keep cross-surface additions `proposed` with a forward-test requirement.
7. Apply per-source routing before every claim. For example, "capture 1 and 2 only for stats, capture 3 only for the theme and colors" maps the first sources to `domain.stats-kpis` and relevant data-display selectors, and the third to the color/surface axis and requested token categories. A source may support several visible UI domains. `only` never leaks into unrelated facets; `exclude` can never be used to support the excluded subject.
8. Execute the routed axis prompts independently. Run every axis required by admitted visual evidence or global focus, and always run system governance. Evaluate all five facets of each selected axis. Every unselected or unsupported facet must still appear in final coverage as `unknown` or `not-applicable`; do not silently omit it.
9. Run synthesis. Produce `design-dna.json`, `design-rules.md`, `confidence-report.md`, `unknowns.md`, and `coverage-report.md`. The canonical Design DNA must contain exact coverage records for all 13 axes, all 65 facets, and all 20 UI domains, including domains that are not applicable.
10. Validate the candidate:

    ```bash
    node <designome-plugin-root>/bin/designome.mjs validate-dna \
      --file <run-directory>/design-dna.json
    ```

11. Report request interpretation, per-source routing, source-to-destination compatibility, detected UI domains, facet and domain coverage, conflicts, unknowns, unperformed validation, and the exact files produced. Leave the Design DNA as `draft` until the user explicitly accepts it.

When invoked from `designome run`, write the draft to the `expectedArtifact` path in the current host handoff, then call `designome run --resume`. The runtime detects and validates the artifact deterministically. It does not perform this skill's visual reasoning.

## Guardrails

- Use only `observed`, `inferred`, `proposed`, and `unknown`.
- Require evidence references for observed and inferred claims.
- The bundled `validate-dna` command performs dependency-light semantic contract checks. Do not call it full JSON Schema validation unless a separate schema validator actually ran.
- Never identify exact fonts, icon packages, CSS values, breakpoints, motion curves, or implementation libraries from resemblance alone.
- Do not create page inventories, role families, speculative screens, or target-project visual rules.
- Never let a target use case rewrite source observations. Destination-specific rules absent from matching captures remain proposed.
- Never imply that a dashboard establishes a corporate marketing architecture, or that a desktop/web capture establishes a mobile-native shell. Reuse only explicitly routed visible grammar.
- Never use a capture outside its `only` or `exclude` evidence boundary, even when another prompt would normally inspect it.
- Do not reduce deep extraction to palette, spacing, and generic components. Preserve typed component anatomy, variants, states, composition, content constraints, adaptation, accessibility, anti-patterns, data meaning, trust boundaries, and coverage gaps whenever supported.
- A target-project path may inform later technical installation, never extraction.
- Do not install artifacts from this skill.
- Never mark the draft accepted on behalf of the human. The orchestrated workflow records the one mandatory human acceptance separately.
