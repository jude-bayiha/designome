You are building a native Android app in the current directory, a Kotlin project with Jetpack Compose, Material 3, Navigation Compose and a screenshot-test harness already set up.

Read `{{INPUT_DIR}}/brief.md` and build all eight screens it describes.

{{DESIGN_INPUT}}

Rules:

- Work only in the current directory and read only `{{INPUT_DIR}}`. Do not look at other directories, other runs or the network.
- Do not add, remove or upgrade dependencies. You may add resources, such as fonts or vector drawables, under `app/src/main/res/`.
- Do not edit `BenchmarkContract.kt` or anything under `app/src/test/`. Implement `BenchmarkScreenHost(screen)` in `BenchmarkScreens.kt` so that it renders each `BenchmarkScreen` as the full screen the user would see, app chrome included, with the brief's sample data.
- Adapt the Material 3 theme where the design input asks for it; do not leave library defaults where the design input gives a rule.
- Run `./gradlew assembleDebug` until it succeeds. You may run `./gradlew testDebugUnitTest -Proborazzi.test.record=true` and look at `app/build/benchmark-captures/` to check your screens.
- When you are done, write `GENERATION_NOTES.md` at the project root: which design-input files you read fully, which you read partially, and every decision you made without guidance.
