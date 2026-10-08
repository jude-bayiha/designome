# Next.js and shadcn/ui benchmark

This benchmark measures whether a coding agent reaches the design quality of a set of screenshots on new screens with its own content. It compares design inputs ("arms") on the same five-route app and records the token cost of each run. It produced the [Next.js and shadcn/ui evaluation](../../docs/next-shadcn-evaluation.md) and is kept here so anyone can rerun it on their own screenshots.

The benchmark judges grammar, not copy. Every route carries the benchmark's own content from [`brief.md`](brief.md), and [`rubric.md`](rubric.md) never rewards matching logos, icons, copy or pixels.

## Contents

| Path                          | Role                                                                             |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `brief.md`                    | The five-route app every generator builds, with fictional content                |
| `rubric.md`                   | The blind review grid: grammar aspects, finish, copy flags and rule gaps         |
| `prompts/extract.md`          | The extraction run, through the `designome` skill's extract operation            |
| `prompts/generator.md`        | The task shared by every generator arm                                           |
| `prompts/input-<arm>.md`      | The only paragraph that differs between arms                                     |
| `prompts/reviewer.md`         | The blind reviewer task                                                          |
| `scripts/prepare-scaffold.sh` | Creates the neutral Next.js and shadcn/ui scaffold every generator copies        |
| `scripts/run-arm.mjs`         | Runs one arm as a fresh `claude -p` session and records time, tokens and hashes  |
| `scripts/project-dossier.mjs` | Projects the Markdown dossier of a draft Design DNA, without accepting it        |
| `scripts/render.mjs`          | Builds each app and captures every route in Chromium at 1440 × 1024              |
| `scripts/boards.mjs`          | Anonymizes the apps, composes one board per route and prepares the review folder |
| `scripts/summarize.mjs`       | Prints the run table with wall time, tokens and list cost                        |

## Arms

| Arm           | Design input                                      |
| ------------- | ------------------------------------------------- |
| `designome`   | The projected dossier only, starting at its brief |
| `screenshots` | The source screenshots only                       |
| `combined`    | The dossier and the screenshots                   |
| `none`        | No visual reference; the floor of the comparison  |

The `designome` arm is the product's target: Designome does not make screenshots a generation input in target projects. The `screenshots` and `combined` arms are references that show how much of the grammar the dossier carries on its own. Every generator receives the same brief, the same scaffold and the same instruction to keep the brief's content.

## Requirements

- Node.js 24 or newer, npm, and the `claude` CLI signed in.
- Playwright with Chromium, resolvable from the work directory (`npm install playwright` there) or through `NODE_PATH`.
- Network access for the scaffold only. The scaffold pins `create-next-app`, `shadcn`, `lucide-react` and `recharts`; override them with `NEXT_VERSION`, `SHADCN_VERSION`, `LUCIDE_REACT_VERSION` and `RECHARTS_VERSION`.

## Run it

Keep the work directory and the screenshots outside this repository. Runs, captures and reviews are immutable: each script refuses to overwrite an existing output.

```bash
BENCH=$PWD/benchmarks/next-shadcn/scripts
WORK=~/designome-bench/2026-10-08
SOURCES=~/designome-bench/sources   # your screenshots, never committed

# 1. Neutral scaffold, shared by every generator.
"$BENCH/prepare-scaffold.sh" "$WORK"

# 2. Extract a draft Design DNA, then project its dossier.
node "$BENCH/run-arm.mjs" --work "$WORK" --arm extract --run extract-1 \
  --sources "$SOURCES" --describe "a project-management web app" --effort medium
node "$BENCH/project-dossier.mjs" --dna "$WORK/runs/extract-1/output/design-dna.json" \
  --output "$WORK/dossier/designome"

# 3. Generators: at least two runs per arm, same model and effort.
for run in designome-1 designome-2 screenshots-1 screenshots-2 combined-1 combined-2 none-1; do
  node "$BENCH/run-arm.mjs" --work "$WORK" --arm "${run%-*}" --run "$run" \
    --sources "$SOURCES" --dossier "$WORK/dossier/designome" --effort medium
done

# 4. Render, anonymize and review.
node "$BENCH/render.mjs" --work "$WORK"
node "$BENCH/boards.mjs" --work "$WORK" --sources "$SOURCES"
(cd "$WORK/review" && claude -p --output-format json --permission-mode bypassPermissions \
  <prompt.md >review-result.json)

# 5. Run table.
node "$BENCH/summarize.mjs" --work "$WORK"
```

Pass `--model` to `run-arm.mjs` to pin a model. Pass `--dry-run` to prepare a run folder and its exact command without starting a session.

`run-arm.mjs` writes `runs/<id>/run.json` with the arm, model, effort, the exact command, the input hash, the output hash, wall time and usage. Usage sums the session's `modelUsage`, so subagent tokens count. `key.json` maps letters to runs; keep it from the reviewer until scoring is done. A human ranking of the same boards, with the same rubric, is the stronger result.

## Report

Report results in the shape of the [evaluation](../../docs/next-shadcn-evaluation.md): setup and versions from `scaffold.json`, the run table, per-arm aspect averages with their spread, finish, copy flags, the rule gaps and the limits. Record the SHA-256 of each source screenshot instead of the screenshot itself.

## Limits

- **Isolation is a discipline, not a sandbox.** Each run gets its own copies of its inputs and a fresh session, but runs use `bypassPermissions` and could read other paths. Keep unrelated material out of the work directory.
- **Small samples:** one or two runs per arm vary as much as arms do. Report the spread and do not rank arms inside it.
- **Static first screens:** captures do not show responsiveness, accessibility, interaction or content resilience. Full-page captures are kept for lower regions.
- **One reviewer agent is one opinion.** Add a human ranking before changing product defaults.
