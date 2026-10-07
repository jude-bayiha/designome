# Next.js and shadcn/ui evaluation

Evaluation recorded on 2026-10-07. It compares coding agents that build the same five-screen app from different design inputs. It is a scoped host-agent experiment, not a universal quality score, and its draft Design DNA was never accepted.

**Observed:** in the second round, giving the generator the screenshots together with the compact design brief ranked first. Screenshots alone ranked second, and the two brief-only runs ranked third and fourth. In the first round, brief-only runs clearly beat a run with no visual reference, but did not beat screenshots.

**Inferred:** the dossier transmits palette, surface tiers, card anatomy and chart conventions without the screenshots. Text alone does not carry brand marks, illustrated avatars or exact mark weights. Screenshots carry those, and the brief adds rules a generator can follow on screens the screenshots do not show.

## Setup

- **Sources:** three promotional captures of one project-management web app (project details, tasks overview, tasks list). They are cropped on the right, at an unknown scale, and kept out of the repository.
- **Target:** a fresh Next.js 16.3.8 app with React 19.2.8, Tailwind CSS 4, and shadcn/ui radix-nova with 30 preinstalled components plus lucide-react and recharts. Each generator worked in its own copy and could not add dependencies.
- **Brief:** five routes (`/tasks`, `/team`, `/calendar`, `/reporting`, `/settings`) with fake data. `/tasks` reproduces one source screen with fixed content; the other four screens are new and test grammar transfer.
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

## Limits

- **Small sample:** one product, one or two runs per arm, one model and one reviewer agent; round 2 has no human ranking.
- **Effort confound:** round 1 and round 2 ran at different reasoning effort, so they are not compared with each other.
- **Fixed content:** the brief fixes the `/tasks` content, which narrows differences on that screen.
- **Not evaluated:** responsiveness, accessibility, interaction behavior and content resilience.
- **Captures:** they are first-screen only; lower page regions were not reviewed.

## Proposed next steps

- **Proposed:** let installation optionally copy reviewed source captures, or crops of their evidence regions, next to the brief. In this run the combined input ranked best, and text did not carry brand marks or exact mark weights. This must stay opt-in, since captures can be private.
- **Proposed:** repeat round 2 with a human ranking and a second product before changing defaults further.
