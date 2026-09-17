# Integration and calibration matrix

This document separates three decisions that must not be collapsed:

1. Design DNA defines evidence-backed UI meaning.
2. Calibration proposes operational bounds after a forward test.
3. The target adapter maps accepted meaning to repository-native technical primitives.

Target CSS, components, and documentation never become screenshot evidence. They can determine implementation precedence, file placement, component reuse, and validation commands.

## Forward-test calibration candidates

The Growly forward test preserved hierarchy and component character but exposed under-specified density rules. These are proposed calibration candidates, not screenshot observations and not yet a new accepted DNA revision.

| Candidate          | Proposed scope                               | Proposed bound or relationship                                                                     | Verification                                       |
| ------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Table primary text | people and resource tables                   | 13–15 px, preferred 14 px                                                                          | computed style plus desktop and 200% text render   |
| Table metadata     | roles, owners, timestamps                    | 11–13 px, preferred 12 px                                                                          | computed style and contrast review                 |
| Table headings     | compact column labels                        | 11–12 px                                                                                           | computed style and uppercase legibility review     |
| Status labels      | badges and compact state text                | at least 11 px with a non-color cue                                                                | computed style, contrast, and forced-colors review |
| Major section gap  | hero, statistics, and following work regions | greater than internal row gaps and at least as large as panel padding                              | rendered bounding-box measurement                  |
| Avatar fallback    | initials without an image                    | stable square or circle, centered in both axes, `line-height: 1`, one-to-three-initial stress case | rendered geometry and visual review                |

Accepted bounded values may use a range value with `minimum`, `preferred`, `maximum`, and `strategy: bounded`. Audit-only requirements use `strategy: audit-only`. Neither strategy changes the claim's epistemic status.

## Target integration matrix

| Target situation                                | Support state                                        | Detection evidence                                                        | Default adapter                                | Designome behavior                                                                                                                                     | Requires explicit approval                                                                          |
| ----------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Greenfield repository with no UI stack          | Explicit preference planning implemented             | no CSS entry, no styling dependency, no component manifest                | guidance-only planning until a stack is chosen | `--ui-kit shadcn` records a proposed initialization step but performs no dependency or project mutation                                                | choosing or installing Tailwind, shadcn/ui, an icon library, or another component system            |
| Existing project with native CSS or CSS Modules | Implemented                                          | CSS entry exists, no Tailwind or shadcn marker                            | `css-variables`                                | install a namespaced token bridge and use existing project primitives                                                                                  | adopting a new component library                                                                    |
| Existing Tailwind project                       | Detection implemented; theme mapping remains planned | Tailwind dependency or CSS directive                                      | `tailwind-utilities`                           | prefer existing utilities; map accepted utility-facing tokens to Tailwind theme variables where appropriate; avoid a parallel raw-CSS component system | replacing namespaces, theme scales, or existing tokens                                              |
| Existing shadcn/ui project                      | Detection and source-inventory mapping implemented   | `components.json`                                                         | `shadcn-components`                            | inventory installed UI source files, generate proposed component mappings, and respect aliases, RSC mode, primitive base, icon library, and variables  | initialization, preset changes, registry additions, component overwrite, or dependency installation |
| Existing design system or UI documentation      | Implemented                                          | declared project-relative rule paths                                      | chosen styling adapter plus precedence policy  | keep files read-only, generate Designome docs separately, and report conflicts                                                                         | changing precedence or replacing human-owned rules                                                  |
| Mixed or ambiguous stack                        | Implemented stop condition                           | multiple CSS entries, conflicting manifests, or incompatible instructions | blocked integration plan                       | report exact ambiguity and require a resolved entry, adapter, and precedence policy                                                                    | every write until ambiguity is resolved                                                             |

Tailwind v4 exposes design tokens through `@theme` namespaces that generate utilities, while ordinary `:root` variables remain appropriate when no utility should be generated. Designome should therefore map only accepted utility-facing tokens into `@theme`; other values stay in the namespaced token bridge. See the official [Tailwind theme-variable documentation](https://tailwindcss.com/docs/theme).

shadcn/ui installs component source into the project and uses `components.json` to describe Tailwind configuration, CSS-variable theming, aliases, RSC mode, style, and registries. Its documentation recommends CSS variables for theming, and the CLI exposes project context through `shadcn info`. Designome should treat this as a reusable implementation substrate, not as visual evidence. See the official [components.json reference](https://ui.shadcn.com/docs/components-json), [CLI reference](https://ui.shadcn.com/docs/cli), and [theming guide](https://ui.shadcn.com/docs/theming).

## Invocation and enforcement matrix

| Mode                  | Trigger                                                                                        | Suitable use                                          | Enforcement level                                            |
| --------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| Explicit skill        | user invokes `$designome-extract`, `$designome-install`, or `$designome-audit`                 | one-off extraction, controlled installation, or audit | workflow enforcement for that task only                      |
| Repository guidance   | root `AGENTS.md` requires Designome documentation for UI work                                  | all UI generation in the repository                   | agent instruction; must still be paired with checks          |
| Scoped guidance       | nested `AGENTS.md` under the frontend or design-system directory                               | monorepos or mixed ownership                          | applies only to files under that scope                       |
| Installation manifest | `.designome/manifest.json` records adapter, documentation directory, precedence, and checksums | deterministic reinstall and conflict detection        | executable ownership and integrity checks                    |
| UI validation command | repository script validates accepted bounds and required artifacts                             | repeated local and CI checks                          | deterministic gate for machine-checkable rules               |
| Rendered audit        | browser checks computed styles, geometry, states, and interactions                             | forward tests and release review                      | rendered evidence; human approval still governs DNA revision |

## Recommended default sequence

1. Read applicable repository instructions.
2. Extract and accept Design DNA without using target visuals as evidence.
3. Resolve documentation directory, existing-rule paths, precedence, and styling adapter.
4. Install documentation and token guidance without adding dependencies.
5. Generate UI with repository-native primitives.
6. Run static, rendered, interaction, and accessibility checks separately.
7. Turn under-specified outcomes into proposed calibration patches.
8. Require explicit acceptance before producing a new Design DNA revision.

An explicitly authorized repair loop may patch observed implementation findings for at most three passes. It excludes proposed calibration candidates and never changes accepted Design DNA.

The default precedence is `complement`. Existing rules remain authoritative where they speak, Designome fills documented gaps, and contradictions stop automatic promotion.
