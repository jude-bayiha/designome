# Kotlin and Jetpack Compose benchmark

This benchmark measures whether a coding agent reaches the design quality of a set of mobile screenshots on new native Android screens with its own content. It reuses the method of the [Next.js and shadcn/ui benchmark](../next-shadcn/README.md) on an eight-screen Jetpack Compose app, and it exercises per-source routing: the sources come from several products, and each one teaches only the subjects it is routed to.

The brief describes Plotline, a community-garden app, so its domain has nothing in common with the sources: only an unrelated product shows whether rules inferred from other screenshots carry over to someone else's project. Keep that distance when you swap in your own screenshots.

The benchmark judges grammar, not copy. Every screen carries the benchmark's own content from [`brief.md`](brief.md), and [`rubric.md`](rubric.md) never rewards matching logos, icons, copy or pixels.

## Contents

| Path                          | Role                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `brief.md`                    | The eight-screen app every generator builds, with fictional content                 |
| `rubric.md`                   | The blind review grid: grammar aspects, finish, platform fit, copy flags, rule gaps |
| `prompts/routing.example.md`  | Which subjects each source screenshot teaches, in plain language                    |
| `scaffold/`                   | The neutral Compose project every generator copies, with the capture harness        |
| `prompts/extract.md`          | The extraction run, through the `designome` skill's extract operation               |
| `prompts/generator.md`        | The task shared by every generator arm                                              |
| `prompts/input-<arm>.md`      | The only paragraph that differs between arms                                        |
| `prompts/reviewer.md`         | The blind reviewer task                                                             |
| `scripts/prepare-scaffold.sh` | Copies the scaffold, writes the Gradle wrapper and proves one build and capture     |
| `scripts/run-arm.mjs`         | Runs one arm as a fresh `claude -p` session and records time, tokens and hashes     |
| `scripts/render.mjs`          | Builds each app and captures every screen with Robolectric and Roborazzi            |
| `scripts/boards.mjs`          | Anonymizes the apps, composes one board per screen and prepares the review folder   |

`project-dossier.mjs` and `summarize.mjs` are shared with the other benchmark in [`../shared/`](../shared/README.md).

## Arms

| Arm           | Design input                                                |
| ------------- | ----------------------------------------------------------- |
| `designome`   | The projected dossier only, starting at its brief           |
| `screenshots` | The source screenshots only, with the same routing in words |
| `combined`    | The dossier and the screenshots                             |
| `none`        | No visual reference; the floor of the comparison            |

The `designome` arm is the product's target: Designome does not make screenshots a generation input in target projects. The `screenshots` arm receives the routing as plain language, so it competes on the same instructions. Every generator receives the same brief, the same scaffold and the same instruction to keep the brief's content.

## Routing

The routing file tells the extraction, the screenshot arms and the reviewer which subjects each source teaches. [`prompts/routing.example.md`](prompts/routing.example.md) is the routing of the reference run: one product sets the base identity, a second teaches forms, grouped cards and the navigation shell, and a third teaches status and progress displays. Name your screenshots so the routing can refer to them, and pass your own file with `--routing`. Without it, every screenshot may support every subject it shows.

## Screens and captures

The scaffold fixes the contract every app follows. `BenchmarkContract.kt` lists the eight screen ids, and the generator implements `BenchmarkScreenHost(screen)`, which renders each screen with the brief's data and its app chrome. `BenchmarkCaptureTest.kt` renders every screen on the JVM with Robolectric in native graphics mode, at 412 × 915 dp and 2x density, then again at 2400 dp high, and Roborazzi writes the images. `render.mjs` restores both contract files from the scaffold before capturing and records any file it had to restore.

The captures need no emulator. They show what Compose draws, without Android system bars, gestures or interaction.

## Requirements

- Node.js 24 or newer and the `claude` CLI signed in.
- JDK 17 or newer, Gradle on `PATH` to write the wrapper, and an Android SDK in `ANDROID_HOME` with the platform and build tools of `scaffold/app/build.gradle.kts`. For example: `sdkmanager "platforms;android-37.0" "build-tools;37.0.0"`.
- Playwright with Chromium for `boards.mjs`, resolvable from the work directory (`npm install playwright` there) or through `NODE_PATH`.
- Network access for Gradle dependencies. Versions are pinned in `scaffold/gradle/libs.versions.toml`; override the Gradle version with `GRADLE_VERSION`.

## Run it

Keep the work directory and the screenshots outside this repository. Runs, captures and reviews are immutable: each script refuses to overwrite an existing output.

```bash
BENCH=$PWD/benchmarks/compose-android/scripts
SHARED=$PWD/benchmarks/shared
WORK=~/designome-bench/compose-2026-10-08
SOURCES=~/designome-bench/compose-sources   # your screenshots, never committed
ROUTING=$PWD/benchmarks/compose-android/prompts/routing.example.md

# 1. Neutral scaffold, shared by every generator.
"$BENCH/prepare-scaffold.sh" "$WORK"

# 2. Extract a draft Design DNA with per-source routing, then project its dossier.
node "$BENCH/run-arm.mjs" --work "$WORK" --arm extract --run extract-1 \
  --sources "$SOURCES" --routing "$ROUTING" \
  --describe "three mobile apps: a subscription tracker, a password vault and a health app" \
  --effort medium
node "$SHARED/project-dossier.mjs" --dna "$WORK/runs/extract-1/output/design-dna.json" \
  --output "$WORK/dossier/designome"

# 3. Generators: at least two runs per arm, same model and effort.
for run in designome-1 designome-2 screenshots-1 screenshots-2 combined-1 combined-2 none-1; do
  node "$BENCH/run-arm.mjs" --work "$WORK" --arm "${run%-*}" --run "$run" \
    --sources "$SOURCES" --routing "$ROUTING" \
    --dossier "$WORK/dossier/designome" --effort medium
done

# 4. Render, anonymize and review.
node "$BENCH/render.mjs" --work "$WORK"
node "$BENCH/boards.mjs" --work "$WORK" --sources "$SOURCES" --routing "$ROUTING"
(cd "$WORK/review" && claude -p --output-format json --permission-mode bypassPermissions \
  <prompt.md >review-result.json)

# 5. Run table.
node "$SHARED/summarize.mjs" --work "$WORK"
```

Pass `--model` to `run-arm.mjs` to pin a model. Pass `--dry-run` to prepare a run folder and its exact command without starting a session. Boards include only runs whose eight screens were all captured.

`run-arm.mjs` writes `runs/<id>/run.json` with the arm, model, effort, the exact command, the input hash, the output hash, wall time and usage. Hashes leave out Gradle state and build output. `key.json` maps letters to runs; keep it from the reviewer until scoring is done. A human ranking of the same boards, with the same rubric, is the stronger result.

## Limits

- The reference sources are iOS screens; every Android-specific convention stays `proposed` in the extraction, and the rubric rates platform fit separately.
- Robolectric renders are static and use the fonts Compose resolves on the JVM. A font a generator bundles under `res/font/` is rendered; a system font that exists only on devices is not.
- See the [rubric limits](rubric.md#limits) for sampling and reviewer limits.
