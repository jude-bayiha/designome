# Integrate accepted Design DNA v0.3

Read `_shared-contract.md`, the accepted Design DNA, active matrix, integration policy, and installation contract.

## Inputs

- Explicitly accepted Design DNA
- Validated install request contract
- Authorized target-project path
- Read-only target diagnostics and applicable repository instructions
- v0.3 documentation projection

## Task

Run `designome doctor` as a read-only diagnostic. Inspect only technical integration facts: framework, package manager, CSS entry points, aliases, installed libraries, existing agent instructions, and applicable component primitives. Never use target-project styles, tokens, components, or rendered UI as Design DNA evidence.

Prepare a transactional installation: diagnose, stage, validate, dry-run, apply atomically, verify checksums, commit the manifest, and clean staging. Preserve user-owned overrides and reject manual changes to managed files rather than overwriting them.

Compile all 51 `documentationProjection` entries plus the generated dossier index, producing 52 managed documentation files grouped under `foundations/`, `components/`, `patterns/`, `behavior/`, and `governance/`. Every projected document is mandatory even when its only honest content is an unknown boundary or proposed stress test.

Generate:

- framework-neutral documentation and coverage;
- namespaced semantic-token CSS where applicable;
- proposed repository-native component mapping;
- compact agent guidance with rule precedence and evidence boundaries;
- request-contract and methodology references;
- manifest, checksums, transaction journal, rollback state, and human-owned overrides.

Run two consecutive installation plans. The second must be idempotent. Treat migrations from the 23-file v0.2 dossier as ownership-aware: delete an obsolete generated file only when the prior manifest owns it and its checksum still matches.

## Output

Produce a preflight report, staged installation plan, dry-run result, applied manifest, verification result, and concise integration summary covering created, updated, unchanged, preserved, migrated, conflicted, and user-owned artifacts.

## Guardrails

- Installation requires explicit Design DNA acceptance and an authorized target path.
- Never initialize a UI kit, install dependencies, or overwrite customized components without separate authorization.
- Existing target UI can influence technical mapping only, never extracted visual truth.
- Keep generated and user-owned files distinguishable.
- Refuse silent overwrite, silent deletion, partial manifest commit, or unverified apply.
- A successful install does not prove generated UI quality.
