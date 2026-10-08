# Next.js and shadcn/ui evaluation

Evaluation recorded on 2026-10-07 and re-read on 2026-10-08 against the visual-grammar criterion. It compares coding agents that build the same five-screen app from different design inputs. It is a scoped host-agent experiment, not a universal quality score, and its draft Design DNA was never accepted. The reusable protocol, prompts, scripts and rubric are in [`benchmarks/next-shadcn/`](../benchmarks/next-shadcn/README.md).

**Observed:** in the first round, brief-only runs clearly beat a run with no visual reference. In the second round, the original review ranked screenshots with the brief first, screenshots alone second and the two brief-only runs third and fourth. That ranking also counted reproduced logos and project glyphs, which are assets of the source product, not grammar.

**Inferred:** counted on grammar alone, the gap between brief-only runs and runs that saw the screenshots narrows to one rule: chart bar weight. The dossier carried palette, surface tiers, card anatomy and chart conventions to four new screens without the screenshots. The runs that saw the screenshots broke other rules instead. The bar miss came from a rule phrased as an adjective, so the fix belongs in extraction, not in handing screenshots to generators.

## Setup

- **Sources:** three promotional captures of one project-management web app (project details, tasks overview, tasks list). They are cropped on the right, at an unknown scale, and kept out of the repository.
- **Target:** a fresh Next.js 16.3.8 app with React 19.2.8, Tailwind CSS 4, and shadcn/ui radix-nova with 30 preinstalled components plus lucide-react and recharts. Each generator worked in its own copy and could not add dependencies.
- **Brief:** five routes (`/tasks`, `/team`, `/calendar`, `/reporting`, `/settings`) with fake data. `/tasks` reproduced one source screen with fixed content; the other four screens were new and tested grammar transfer. A reproduction is only a diagnostic for missing rules, so the re-reading below does not rank arms on `/tasks`.
- **Generators:** each was a fresh agent context, built with `npm run build` and never saw a rendered page.
- **Review:**
  - every app was rendered in Chromium at 1440×1024;
  - a separate reviewer compared the anonymized first-screen captures with the sources;
  - in round 1, the project owner also ranked the same anonymized boards.

| Arm         | Design input                                       |
| ----------- | -------------------------------------------------- |
| Designome   | The projected dossier only, without the sources    |
| Screenshots | The three sources only                             |
| Combined    | The sources and the dossier, starting at its brief |
| None        | No visual reference (round 1 only)                 |

## Round 1: full dossier, 52 files

Extraction followed `designome-extract` in one agent context. It took about 24 minutes and 381k subagent tokens as reported by the host. It produced a 1 MB draft DNA (650 claims) and a 3.1 MB dossier, about 800k tokens. The two Designome generators reported reading about 4 dossier files fully and about a dozen partially.

The reviewer ranked: screenshots 1, screenshots 2, Designome 1, Designome 2, none. The project owner ranked: screenshots 1, Designome 1, Designome 2, screenshots 2, none. The variation between two runs of the same arm was as large as the variation between arms.

Two generator runs and the no-reference run were interrupted by a usage limit and resumed, so their token counts are incomplete and are not compared.

## Round 2: compact brief and authoring shorthand

This round used the flow from the compact README brief, `matrix-brief` and `expand-dna`. Every run was a separate `claude -p` session on the same model at medium reasoning effort, so the four generator runs share one configuration.

| Run         | Wall time | Output tokens | Cache-read tokens | Cache-write tokens | List cost |
| ----------- | --------: | ------------: | ----------------: | -----------------: | --------: |
| Extraction  |    15 min |        99,574 |         5,598,638 |            261,454 |     $5.20 |
| Designome 1 |    12 min |        81,841 |         3,511,070 |            148,155 |     $3.52 |
| Designome 2 |     8 min |        56,393 |         2,587,675 |            116,196 |     $2.58 |
| Screenshots |    10 min |        63,068 |         3,707,587 |            121,340 |     $2.97 |
| Combined    |    10 min |        62,089 |         3,434,545 |            138,209 |     $3.03 |

The extraction wrote a 529 KB authoring draft that `expand-dna` completed into a 945 KB canonical DNA and validated with `--require-fidelity`. The projected brief was 61 KB, about 15k tokens, inside a 2.4 MB dossier. Round-1 extraction tokens were reported by a different mechanism and are not comparable with this table; wall time fell from about 24 to 15 minutes.

The original review ranked the arms as follows. It is kept as recorded; the next section re-reads it.

| Rank | Arm         | `/tasks` aspects passed | Team, Calendar, Reporting, Settings (1–5) |
| ---: | ----------- | ----------------------: | ----------------------------------------- |
|    1 | Combined    |                     6/7 | 4, 4, 3, 5                                |
|    2 | Screenshots |                     6/7 | 4, 4, 3, 5                                |
|    3 | Designome 2 |                     5/7 | 4, 3, 4, 4                                |
|    4 | Designome 1 |                     4/7 | 4, 4, 4, 4                                |

**Observed reviewer findings:**

- **Brief-only identity:** both brief-only runs replaced the source logo and colored project glyphs with invented marks.
- **Brief-only charts:** both drew thick stacked bars of similar height instead of the source's hairline bars.
- **Combined vs screenshots:** the combined run kept the source identity and hairline bars, but drew legend chips without color dots and a black donut on Reporting. The screenshot-only run used initials as avatar fallbacks and saturated status colors that the sources never show.

## Re-reading with the grammar criterion

The original review rewarded resemblance to the sources. Under the [project philosophy](../AGENTS.md#philosophy), logos, glyphs, illustrated avatars, copy and data are replaceable assets: matching them is not success, and replacing them is not a failure. This section re-reads the recorded findings with that criterion. It is `inferred` from the findings above; no app was re-reviewed, and the per-aspect `/tasks` evidence was not kept.

| Recorded finding                          | Arm         | Kind    | Grammar reading                                                         |
| ----------------------------------------- | ----------- | ------- | ----------------------------------------------------------------------- |
| Invented logo and project glyphs          | Brief-only  | Asset   | Not a miss: assets are replaceable                                      |
| Thick stacked bars instead of hairlines   | Brief-only  | Grammar | Miss: chart mark weight                                                 |
| Source logo and glyphs kept               | Combined    | Asset   | Not credit: copying assets is not the goal                              |
| Legend chips without color dots           | Combined    | Grammar | Miss: legend chip anatomy                                               |
| Black donut on Reporting                  | Combined    | Grammar | Miss: chart color roles                                                 |
| Initials as avatar fallbacks              | Screenshots | Asset   | Not a miss: avatar artwork is an asset; the fallback anatomy is unknown |
| Saturated status colors absent in sources | Screenshots | Grammar | Miss: status color roles                                                |

**Inferred:**

- On the four new screens, the recorded scores total 16 for combined, 16 for screenshots, 15 for Designome 2 and 16 for Designome 1. With one or two runs per arm, these do not separate the arms.
- Each arm broke one or two grammar rules. The brief-only runs broke the same one, bar weight; the runs that saw the screenshots broke legend, donut and status-color rules.
- The original order between brief-only and screenshot runs rested mainly on the reproduced `/tasks` screen and on assets. Neither is a measure of grammar transfer, so this evaluation does not show that screenshots improve generation once assets are set aside.
- Whether the brief-only marks followed the source's rule for project marks, such as colored rounded-square tiles, was not recorded. The [rubric](../benchmarks/next-shadcn/rubric.md) now scores that rule separately from the asset.

## Limits

- **Small sample:** one product, one or two runs per arm, one model and one reviewer agent; round 2 has no human ranking.
- **Effort confound:** round 1 and round 2 ran at different reasoning effort, so they are not compared with each other.
- **Fixed content:** the brief fixes the `/tasks` content, which narrows differences on that screen.
- **Not evaluated:** responsiveness, accessibility, interaction behavior and content resilience.
- **Captures:** they are first-screen only; lower page regions were not reviewed.
- **Criterion changed after the fact:** the grammar re-reading uses recorded findings, not a new blind review with the grammar rubric.

## Proposed next steps

- **Proposed:** make extraction write chart and legend rules as measurable relationships, such as the ratio of bar width to gap and to plot height, legend chip anatomy and the color role of each series. The one miss shared by both brief-only runs came from "thin bars".
- **Proposed:** keep source screenshots out of generation inputs in target projects. This evaluation gives no grammar-based reason to add them, and they carry the assets the grammar is meant to replace.
- **Proposed:** rerun the [benchmark](../benchmarks/next-shadcn/README.md) with the grammar rubric, two runs per arm, a human ranking and a second product before changing defaults further.
