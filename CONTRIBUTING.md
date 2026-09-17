# Contributing to Designome

English is the repository language for documentation, schemas, prompts, code comments, commit messages, and pull-request content.

## Branches and pull requests

- Keep `main` stable; direct changes are not expected outside explicit repository initialization.
- Create a short branch from `main`: `<type>/task-<short-description>`.
- Recommended types are `feature`, `fix`, `docs`, `chore`, `refactor`, `test`, and `ci`.
- A branch carries one coherent product or technical objective.
- Every delivery goes through a pull request describing the objective, changes, validation, risks, and limitations.
- Keep a pull request in draft while required contracts or validation are incomplete.

## Commits

Messages follow Conventional Commits and are checked by Commitlint:

```text
<type>(<scope>): <description>
```

Exemples :

```text
feat(matrix): add content resilience concepts
docs(prompts): define modular extraction stages
chore(repo): add commit and release guardrails
```

Keep the description short, in English, and action-oriented. A commit stays atomic and avoids mixing intentions. Common scopes are `repo`, `matrix`, `prompts`, `installer`, `docs`, and `release`.

## Local tooling

```bash
pnpm install
pnpm format
pnpm build:skills
pnpm format:check
pnpm lint
pnpm validate
pnpm test
pnpm check
pnpm designome --help
```

- Husky installs hooks through `pnpm prepare`.
- The `pre-commit` hook applies Prettier only to staged files through lint-staged.
- The `commit-msg` hook checks the message with Commitlint.
- Always inspect `git status --short` after a commit because lint-staged may have reformatted staged files.

## Skill distributions

Edit skill instructions and metadata in `skill-sources/`, and shared runtime, prompts, schemas, and documentation in their canonical directories. Never edit generated files under `skills/` directly. After formatting source changes, run `pnpm build:skills` and commit the refreshed distributions with their sources. `pnpm check:skills`, included in `pnpm check`, rejects missing, stale, or unexpected shipped files without rewriting them.

The `skills` development dependency is pinned to exercise the real installer in isolated tests. It is not a runtime dependency. See [the distribution contract](docs/skill-distribution.md) for the bundle layout and test boundaries.

## Designome discipline

- A screenshot proves only what it shows.
- Allowed statuses are `observed`, `inferred`, `proposed`, and `unknown`.
- Every claim preserves its evidence, scope, confidence, exceptions, and expected validation.
- The target project is never an implicit visual source.
- A new concept declares its axes, inspection targets, screenshot limitations, stress tests, and affected artifacts.
- A specialized prompt produces a fragment; only the synthesis prompt resolves duplication and contradictions.

## Releases

Release Please maintains the version pull request, `CHANGELOG.md`, the `vX.Y.Z` tag, and the GitHub Release from conventional commits merged into `main`.

The workflow uses `GITHUB_TOKEN` by default. Configure `RELEASE_PLEASE_TOKEN` when an organization prevents the Actions token from creating pull requests or when release pull-request workflows must be triggered by a distinct token.
