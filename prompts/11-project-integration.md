# Integrate accepted Design DNA

Read `_shared-contract.md` and `docs/installation-contract.md` before executing this stage.

## Inputs

- Accepted, schema-valid `design-dna.json`
- Authorized target-project path
- Integration policy, including documentation directory, existing-rule paths, rule precedence, styling strategy, UI-kit preference, and optional dry-run flag

## Task

Run `designome doctor` as a read-only diagnostic, inspect only technical project facts, build a preflight and installation plan, then install managed Designome artifacts through the transactional prepare, validate, apply, verify, manifest-commit, and cleanup sequence. Detect repository-native styling systems such as Tailwind and shadcn/ui without treating their visual output as evidence. Compile every entry in the concept matrix `documentationProjection` into the target project and add its generated index. Every projected document is mandatory even when its only honest content is an `unknown` boundary or `proposed` stress test. Also generate a proposed component mapping, namespaced token CSS, a compact agent-guidance block, optional skill files, a manifest with checksums, and a human-owned overrides file. Run a dry-run before writes and verify a second run produces no diff.

## Output

Produce the read-only diagnostic, `integration-plan.json`, explicit transaction phases, the complete versioned documentation layout, managed generated files, resolved styling and rule-precedence context, `.designome/manifest.json`, and an installation report with created, updated, deleted, unchanged, conflicted, rolled-back, and skipped paths.

## Guardrails

- Installation requires an explicit target path and accepted Design DNA.
- Never overwrite a manually modified managed file; report a checksum conflict.
- Remove an obsolete generated documentation path only when the previous manifest owns it and its checksum still matches. A manual edit remains a blocking conflict.
- Use stable markers and replace one managed block instead of appending duplicates.
- Never edit user overrides, merge target styles into the Design DNA, or add duplicate CSS imports.
- Existing UI documentation influences precedence and implementation only; it is never screenshot evidence and is never rewritten silently.
- Prefer detected repository-native styling primitives over a parallel raw-CSS component system.
- Reuse only installed shadcn/ui source components. A greenfield `shadcn` preference is a proposed setup step and never authorizes initialization, dependency installation, or component overwrite.
- Stop when applicable nested agent instructions prohibit the planned write.
- Require `package.json` before any target write and report its checked path, missing prerequisite, safe resolution, and `writesPerformed: false` when absent.
- Stage and validate desired files outside the target, write the manifest last, and rollback every applied action when application or verification fails.
- Persist enough transaction information to recover an interrupted apply; a diagnostic detects recovery needs without mutating the project.
