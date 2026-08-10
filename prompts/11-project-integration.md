# Integrate accepted Design DNA

Read `_shared-contract.md` and `docs/installation-contract.md` before executing this stage.

## Inputs

- Accepted, schema-valid `design-dna.json`
- Authorized target-project path
- Integration policy and optional dry-run flag

## Task

Inspect only technical project facts, plan changes, and install managed Designome artifacts idempotently. Generate namespaced CSS, a compact agent-guidance block, optional skill files, a manifest with checksums, and a human-owned overrides file. Run a dry-run before writes and verify a second run produces no diff.

## Output

Produce `integration-plan.json`, managed generated files, `.designome/manifest.json`, and an installation report with created, updated, unchanged, conflicted, and skipped paths.

## Guardrails

- Installation requires an explicit target path and accepted Design DNA.
- Never overwrite a manually modified managed file; report a checksum conflict.
- Use stable markers and replace one managed block instead of appending duplicates.
- Never edit user overrides, merge target styles into the Design DNA, or add duplicate CSS imports.
- Stop when applicable nested agent instructions prohibit the planned write.
