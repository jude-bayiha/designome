Use the extract operation of the `designome` skill to extract the design grammar of the screenshots in `{{INPUT_DIR}}/screenshots/`. They show {{SOURCE_DESCRIPTION}}. The target is a native Android app in Kotlin and Jetpack Compose; the screenshots come from other platforms, so adapt rather than claim direct fidelity. No motion.

Route the screenshots exactly as follows:

{{SOURCE_ROUTING}}

Run the extraction to a draft Design DNA that `expand-dna --require-fidelity` validates, without asking questions; this is an unattended benchmark run. Do not accept the draft and do not install it. When the draft validates, copy it to `{{OUTPUT_DIR}}/design-dna.json` and write `{{OUTPUT_DIR}}/EXTRACTION_NOTES.md` listing the commands you ran, the request contract's per-source routing and any validation that failed.
