# Target-project installation contract

Installation converts an accepted Design DNA into technical artifacts for a specific project. It is optional for extraction and mandatory before Designome writes to a target project.

## Ownership boundary

| Artifact                            | Owner                               | Rewrite policy                                                   |
| ----------------------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| Accepted `design-dna.json`          | Designome run plus human acceptance | Replace only with a newly accepted revision                      |
| Generated CSS                       | Designome                           | Replace only when the stored checksum matches the current file   |
| Designome agent guidance block      | Designome                           | Replace the single managed block in place                        |
| Designome skill export              | Designome                           | Regenerate as a versioned unit                                   |
| Generated design documentation      | Designome                           | Replace only when the stored checksum matches the current file   |
| Project-local audit skill           | Designome                           | Replace only when the stored checksum matches the current file   |
| Overrides CSS                       | Target-project user                 | Create once if absent; never rewrite                             |
| Audit configuration                 | Target-project user                 | Create once if absent; preserve project routes and flows         |
| Existing design documentation       | Target-project user                 | Read only when declared; never rewrite or use as source evidence |
| Existing project CSS and components | Target-project user                 | Do not mine for visual rules or overwrite                        |

## Required sequence

1. Resolve and validate the explicit target path.
2. Read repository and nested agent instructions applicable to planned files.
3. Inspect technical facts only: framework, package manager, source roots, CSS entry points, aliases, scripts, installed compatible libraries, styling system, and declared design-documentation paths.
4. Produce `integration-plan.json` and a dry-run diff.
5. Stop on ambiguity, prohibited scope, manual modification conflict, or duplicate unmanaged integration.
6. Write managed files and record their hashes in `.designome/manifest.json`.
7. Run relevant project checks.
8. Execute the installer again and require a zero-diff result.

The current helper exposes the plan as JSON on standard output. The invoking skill may save that output in the extraction run as `integration-plan.json`.

## Project-local design documentation

Installation writes human-readable documentation inside the target repository. The default directory is `docs/designome`; repository instructions may select another visible project-relative directory with `--docs-dir`. The generated set includes an index, visual foundations, typography, iconography, components and states, proposed component mapping, canonical rules, and repository integration context.

Generated documentation is managed and checksum-protected. Existing project documentation is user-owned. Declare existing paths with repeatable `--existing-rules` options and resolve one precedence policy:

- `complement` keeps existing rules authoritative where they speak and uses Designome for documented gaps;
- `existing-first` makes existing rules authoritative on conflicts;
- `designome-first` makes accepted Designome rules authoritative for generated UI while still reporting conflicts.

Precedence never authorizes deletion or silent rewriting of existing documentation. Applicable `AGENTS.md` instructions may specify these choices in natural language; the invoking agent must pass the resolved values explicitly and the manifest records them.

Installation also exports `designome-audit` to `.agents/skills/designome-audit`. Codex sessions started inside the target repository can therefore discover the audit workflow without relying on global plugin discovery. The exported skill resolves the accepted Design DNA and generated documentation from the project; it never treats implementation code as screenshot evidence.

The installer creates `.designome/audit.config.json` once as a project-owned starting point. Projects may change the URL, routes, viewports, flows, and output directory without triggering a managed-file conflict. Verification requires the file to remain present but never rewrites its contents.

## Repository-native styling

The `auto` styling strategy detects supported technical markers. A `components.json` file selects the `shadcn-components` adapter, Tailwind dependencies or directives select `tailwind-utilities`, and other projects receive `css-variables`. An explicit strategy may be passed when repository instructions require it.

`--ui-kit auto` reuses detected shadcn/ui source components, `--ui-kit none` disables that adapter preference, and `--ui-kit shadcn` records a proposed greenfield setup when no `components.json` exists. None of these options initializes shadcn/ui or installs dependencies. Generated `component-mapping.md` remains proposed technical guidance and inventories only source components already present in the project.

The generated CSS is a semantic token bridge. In Tailwind projects, generation guidance requires existing utilities and theme conventions before new component CSS. In shadcn/ui projects, guidance also preserves installed source components, semantic variables, aliases, primitive base, and icon library. Detection changes the implementation adapter only and never turns target CSS or components into visual evidence.

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
- generated documentation directory, styling adapter, existing-rule paths, and precedence policy;
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
