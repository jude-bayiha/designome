# Next.js and shadcn/ui benchmark

This benchmark measures whether a coding agent reaches the design quality of a set of screenshots on new screens with its own content. It compares design inputs ("arms") on the same five-route app and records the token cost of each run. It also tests per-source routing written in plain language: the person who chose the screenshots says what they like in each one, and the run checks that the extraction turned those words into the right routing and that the apps follow it. It produced the [Next.js and shadcn/ui evaluation](../../docs/next-shadcn-evaluation.md) and is kept here so anyone can rerun it on their own screenshots.

The benchmark judges grammar, not copy. Every route carries the benchmark's own content from [`brief.md`](brief.md), and [`rubric.md`](rubric.md) never rewards matching logos, icons, copy or pixels.

## Contents

| Path                                    | Role                                                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `brief.md`                              | Cabinet, the five-route app every generator builds, with fictional content                                     |
| `rubric.md`                             | The blind review grid: grammar aspects, finish, copy, guardrail, narrow-width and override verdicts, rule gaps |
| `prompts/extract.md`                    | The extraction run, through the `designome` skill's extract operation                                          |
| `prompts/generator.md`                  | The task shared by every generator arm                                                                         |
| `prompts/input-<arm>.md`                | The only paragraph that differs between arms                                                                   |
| `prompts/reviewer.md`                   | The blind reviewer task                                                                                        |
| `prompts/routing.example.md`            | What each source screenshot should teach, in the chooser's own words                                           |
| `prompts/routing.example.expected.json` | The per-source routing those words should produce                                                              |
| `prompts/override.example.md`           | A request that contradicts the accent budget, for the override case                                            |
| `scripts/prepare-scaffold.sh`           | Creates the neutral Next.js and shadcn/ui scaffold every generator copies                                      |
| `scripts/run-arm.mjs`                   | Runs one arm as a fresh `claude -p` session and records time, tokens and hashes                                |
| `scripts/render.mjs`                    | Builds each app and captures every route in Chromium at 1440 × 1024, then the full page at 390 px              |
| `scripts/boards.mjs`                    | Anonymizes the apps, composes one board per route and prepares the review folder                               |

`project-dossier.mjs`, `check-routing.mjs` and `summarize.mjs` are shared with the other benchmarks in [`../shared/`](../shared/README.md).

## Arms

| Arm           | Design input                                      |
| ------------- | ------------------------------------------------- |
| `designome`   | The projected dossier only, starting at its brief |
| `screenshots` | The source screenshots only                       |
| `combined`    | The dossier and the screenshots                   |
| `none`        | No visual reference; the floor of the comparison  |

The `designome` arm is the product's target: Designome does not make screenshots a generation input in target projects. The `screenshots` and `combined` arms are references that show how much of the grammar the dossier carries on its own. Every generator receives the same brief, the same scaffold and the same instruction to keep the brief's content.

## App domain

Cabinet is a collections registry for a natural-history museum. Its domain is unrelated to the source screenshots on purpose: only a product the sources never showed proves that their grammar transfers. Pick a brief whose domain is far from your own screenshots while keeping the same data shapes: a dense grouped table, cards with figures, a calendar, charts and a settings form. The [evaluation](../../docs/next-shadcn-evaluation.md) of 2026-10-07 used an earlier project-management brief, Relay, which shared its domain with its source; it remains in the repository history.

## Routing in plain language

The routing file holds, for each screenshot prefix, what the person who chose it likes about it, in their own words; [`prompts/routing.example.md`](prompts/routing.example.md) is the reference run's file. It does not name evidence modes. The extraction must read those words and write the request contract's per-source routing itself: `only` when a screenshot should teach one subject, `prefer` when it should lead on some subjects and still teach what else it shows, `exclude` when a subject must not come from it. The screenshot arms and the reviewer receive the same words. In the reference run, "what I like here is…" alone was read as `only`; adding "use it as the base for everything else" made it `prefer`.

After the extraction, compare its routing with the routing you expected:

```bash
node benchmarks/shared/check-routing.mjs \
  --contract "$WORK/runs/extract-1/output/request-contract.json" \
  --expected benchmarks/next-shadcn/prompts/routing.example.expected.json
```

The check lists each source's evidence mode, UI domains and axes, and exits 1 when one differs from the expected file. A subject that no screenshot may teach is recorded as `unknown` in the draft's coverage, and generators invent it as `proposed`; name a screenshot for it, or let one screenshot `prefer` rather than `only`, when that matters.

## Override case

Designome ranks instructions in a fixed order: the person's explicit request, then the rules measured on their screenshots, then Designome's defaults. The override case checks the first step. A `designome` run receives, on top of the dossier, a request that deliberately contradicts the measured accent budget and the defaults; [`prompts/override.example.md`](prompts/override.example.md) asks for the accent everywhere. Pass it with `--request`. The generator sees the request as the product owner's own words, with no hint about precedence, so only the dossier's brief can tell it that the request wins. The reviewer finds the request next to that app's captures and records whether the app `obeyed`, `partly obeyed`, `ignored` or `overreached` it.

## Requirements

- Node.js 24 or newer, npm, and the `claude` CLI signed in.
- Playwright with Chromium, resolvable from the work directory (`npm install playwright` there) or through `NODE_PATH`.
- Network access for the scaffold only. The scaffold pins `create-next-app`, `shadcn`, `lucide-react` and `recharts`; override them with `NEXT_VERSION`, `SHADCN_VERSION`, `LUCIDE_REACT_VERSION` and `RECHARTS_VERSION`.

## Run it

Keep the work directory and the screenshots outside this repository. Runs, captures and reviews are immutable: each script refuses to overwrite an existing output.

```bash
BENCH=$PWD/benchmarks/next-shadcn/scripts
SHARED=$PWD/benchmarks/shared
WORK=~/designome-bench/2026-10-08
SOURCES=~/designome-bench/sources   # your screenshots, never committed
ROUTING=$PWD/benchmarks/next-shadcn/prompts/routing.example.md

# 1. Neutral scaffold, shared by every generator.
"$BENCH/prepare-scaffold.sh" "$WORK"

# 2. Extract a draft Design DNA, then project its dossier.
node "$BENCH/run-arm.mjs" --work "$WORK" --arm extract --run extract-1 \
  --sources "$SOURCES" --routing "$ROUTING" \
  --describe "a project-management list view and an automation dashboard" --effort medium
node "$SHARED/project-dossier.mjs" --dna "$WORK/runs/extract-1/output/design-dna.json" \
  --output "$WORK/dossier/designome"

# 3. Generators: at least two runs per arm, same model and effort.
for run in designome-1 designome-2 screenshots-1 screenshots-2 combined-1 combined-2 none-1; do
  node "$BENCH/run-arm.mjs" --work "$WORK" --arm "${run%-*}" --run "$run" \
    --sources "$SOURCES" --routing "$ROUTING" --dossier "$WORK/dossier/designome" --effort medium
done

# Override case: the dossier plus a request that contradicts its accent budget.
node "$BENCH/run-arm.mjs" --work "$WORK" --arm designome --run override-1 \
  --dossier "$WORK/dossier/designome" --routing "$ROUTING" \
  --request benchmarks/next-shadcn/prompts/override.example.md --effort medium

# 4. Render, anonymize and review.
node "$BENCH/render.mjs" --work "$WORK"
node "$BENCH/boards.mjs" --work "$WORK" --sources "$SOURCES" --routing "$ROUTING"
(cd "$WORK/review" && claude -p --output-format json --permission-mode bypassPermissions \
  <prompt.md >review-result.json)

# 5. Run table.
node "$SHARED/summarize.mjs" --work "$WORK"
```

Pass `--model` to `run-arm.mjs` to pin a model. Pass `--dry-run` to prepare a run folder and its exact command without starting a session.

`run-arm.mjs` writes `runs/<id>/run.json` with the arm, model, effort, the exact command, the input hash, the output hash, wall time and usage. Usage sums the session's `modelUsage`, so subagent tokens count. `key.json` maps letters to runs; keep it from the reviewer until scoring is done. A human ranking of the same boards, with the same rubric, is the stronger result.

## Report

Report results in the shape of the [evaluation](../../docs/next-shadcn-evaluation.md): setup and versions from `scaffold.json`, the run table, the routing check, per-arm aspect averages with their spread, finish, copy flags, routing verdicts, the rule gaps and the limits. Record the SHA-256 of each source screenshot instead of the screenshot itself.

## Limits

- **Isolation is a discipline, not a sandbox.** Each run gets its own copies of its inputs and a fresh session, but runs use `bypassPermissions` and could read other paths. Keep unrelated material out of the work directory.
- **Small samples:** one or two runs per arm vary as much as arms do. Report the spread and do not rank arms inside it.
- **Static captures:** two widths, 1440 and 390 px, show layout regimes but not continuous resizing, accessibility, interaction or content resilience. Full-page captures are kept for lower regions.
- **One reviewer agent is one opinion.** Add a human ranking before changing product defaults.
