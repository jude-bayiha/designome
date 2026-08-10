# Target-project installation contract

Installation converts an accepted Design DNA into technical artifacts for a specific project. It is optional for extraction and mandatory before Designome writes to a target project.

## Ownership boundary

| Artifact                            | Owner                               | Rewrite policy                                                 |
| ----------------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| Accepted `design-dna.json`          | Designome run plus human acceptance | Replace only with a newly accepted revision                    |
| Generated CSS                       | Designome                           | Replace only when the stored checksum matches the current file |
| Designome agent guidance block      | Designome                           | Replace the single managed block in place                      |
| Designome skill export              | Designome                           | Regenerate as a versioned unit                                 |
| Overrides CSS                       | Target-project user                 | Create once if absent; never rewrite                           |
| Existing project CSS and components | Target-project user                 | Do not mine for visual rules or overwrite                      |

## Required sequence

1. Resolve and validate the explicit target path.
2. Read repository and nested agent instructions applicable to planned files.
3. Inspect technical facts only: framework, package manager, source roots, CSS entry points, aliases, scripts, and installed compatible libraries.
4. Produce `integration-plan.json` and a dry-run diff.
5. Stop on ambiguity, prohibited scope, manual modification conflict, or duplicate unmanaged integration.
6. Write managed files and record their hashes in `.designome/manifest.json`.
7. Run relevant project checks.
8. Execute the installer again and require a zero-diff result.

The current helper exposes the plan as JSON on standard output. The invoking skill may save that output in the extraction run as `integration-plan.json`.

## Portable CSS rules

- Prefix custom properties with `--designome-`.
- Place generated rules in a named layer such as `@layer designome.tokens` and `@layer designome.components`.
- Support an optional `[data-designome]` scope when the user does not want global tokens.
- Keep generated CSS separate from `designome.overrides.css`.
- Add an import once, using stable managed markers when an existing entry file must be edited.
- Emit semantic relationships from accepted Design DNA; do not invent exact values during installation.

The first adapter accepts exactly `:root` or `[data-designome]` as scope. It discovers one supported global CSS entry or requires an explicit project-relative `--css-entry` when discovery is missing or ambiguous.

Example managed import:

```css
/* designome:generated-import:start */
@import './designome.generated.css';
/* designome:generated-import:end */
```

## Managed agent guidance

The installer may add one compact block to the applicable `AGENTS.md`:

```markdown
<!-- designome:guidance:start -->

## Designome-generated UI

Read `.designome/design-dna.json` and the installed Designome skill before generating UI. Preserve claim status, use the generated CSS tokens, cover applicable business states and stress cases, and run the Designome audit after generation.
<!-- designome:guidance:end -->
```

On later runs, replace the content between the same markers. Never append a second block. If no safe applicable instruction file exists, create a scoped file only when repository rules allow it.

Guidance is not enforcement. Critical requirements also need schema validation, project checks, and generation audit.

## Manifest and conflict handling

The manifest records at least:

- Design DNA ID, revision, and content hash;
- matrix and installer versions;
- managed path, ownership class, and last written hash;
- import target and marker IDs;
- target-project technical adapter;
- creation time and latest successful verification.

Before replacing a managed file, compare its current hash with the manifest. A mismatch means the file was modified outside Designome. The default action is `conflict`: preserve the file, write nothing to it, and report the exact resolution choices. Adoption or forced replacement requires explicit authorization.

Writes require `--instructions-reviewed`. A conflict blocks the complete installation and returns exit code 2. The manifest is written last, and a failed write or post-install verification rolls completed changes back.

## Regeneration behavior

New screenshots create a new candidate Design DNA; they do not mutate an accepted contract silently. After review and acceptance:

- update managed files in place;
- preserve all user-owned overrides;
- replace, never duplicate, marker blocks and imports;
- list semantic changes and migration impact;
- rerun project validation and the second-run no-diff test.

Removing Designome should be equally bounded: delete only manifest-owned generated files and managed marker blocks, then report any preserved overrides or conflicts.
