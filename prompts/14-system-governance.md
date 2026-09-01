# Analyze design system grammar and governance

Read `_shared-contract.md`, the `axis.system-governance` matrix slice, all completed specialist fragments, and the full UI-domain taxonomy.

## Inputs

- Admitted screenshot evidence and source directives
- Completed axis fragments, claims, facet coverage, conflicts, and unknowns
- Five system and governance facets
- v0.3 Design DNA and documentation contracts

## Task

Turn specialist observations into reusable, auditable candidates without performing synthesis:

1. Identify semantic token roles, scales, aliases, pairings, modes, derivations, exceptions, and proposed calibration bounds across color, space, size, typography, radius, border, elevation, opacity, layer, motion, iconography, data visualization, and assets.
2. Identify component and UI-domain contracts: purpose, anatomy, variants, states, composition, content limits, adaptation, accessibility, anti-patterns, rule references, and token references.
3. Verify provenance and coverage. Every one of the 65 matrix facets must have one status and every one of the 20 UI domains must be detected, requested, not detected, or unknown. Document gaps, excluded evidence, and next evidence required.
4. Separate framework-neutral generation guidance, target-integration proposals, mechanical validation, perceptual audit, usage validation, and human acceptance. Target-project UI remains excluded from visual evidence.
5. Define rule strength, ownership, migration, managed versus user-owned artifacts, checksums, overrides, rollback, validation, and non-regression needs.

Reject vague rules such as “use clean spacing” or “make charts clear.” A reusable rule identifies affected roles or domains, the relationship or bounded condition, exceptions, failure modes, and a concrete verification method.

## Output

Return the shared stage JSON for `prompt.system-governance` with:

- exactly five facet-coverage records;
- v0.3 token, rule, and typed component candidates;
- complete axis-facet and UI-domain coverage candidates;
- export, ownership, migration, validation, and non-regression guidance;
- unresolved conflicts and promotion blockers for synthesis.

## Guardrails

- Do not bind extraction to a framework, UI kit, CSS architecture, or target-project aesthetics.
- Do not promote inferred or proposed values to observed.
- Documentation presence is not semantic completeness.
- Agent guidance is not mechanical enforcement.
- Code-level agreement does not prove visual fidelity, accessibility, performance, or usability.
