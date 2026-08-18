# Integrate accepted Design DNA

Read `_shared-contract.md` and `docs/installation-contract.md` before executing this stage.

## Inputs

- Accepted, schema-valid `design-dna.json`
- Authorized target-project path
- Integration policy, including documentation directory, existing-rule paths, rule precedence, styling strategy, UI-kit preference, and optional dry-run flag

## Task

Inspect only technical project facts, plan changes, and install managed Designome artifacts idempotently. Detect repository-native styling systems such as Tailwind and shadcn/ui without treating their visual output as evidence. Generate human-readable UI documentation inside the target project, a proposed component mapping, namespaced token CSS, a compact agent-guidance block, optional skill files, a manifest with checksums, and a human-owned overrides file. Run a dry-run before writes and verify a second run produces no diff.

## Output

Produce `integration-plan.json`, managed generated files, project-local design documentation, resolved styling and rule-precedence context, `.designome/manifest.json`, and an installation report with created, updated, unchanged, conflicted, and skipped paths.

## Guardrails

- Installation requires an explicit target path and accepted Design DNA.
- Never overwrite a manually modified managed file; report a checksum conflict.
- Use stable markers and replace one managed block instead of appending duplicates.
- Never edit user overrides, merge target styles into the Design DNA, or add duplicate CSS imports.
- Existing UI documentation influences precedence and implementation only; it is never screenshot evidence and is never rewritten silently.
- Prefer detected repository-native styling primitives over a parallel raw-CSS component system.
- Reuse only installed shadcn/ui source components. A greenfield `shadcn` preference is a proposed setup step and never authorizes initialization, dependency installation, or component overwrite.
- Stop when applicable nested agent instructions prohibit the planned write.
