Use the extract operation of the `designome` skill to extract the design grammar of the screenshots in `{{INPUT_DIR}}/screenshots/`. They show {{SOURCE_DESCRIPTION}}. No motion.

Run the extraction to a draft Design DNA that `expand-dna --require-fidelity` validates, without asking questions; this is an unattended benchmark run. Do not accept the draft and do not install it. When the draft validates, copy it to `{{OUTPUT_DIR}}/design-dna.json` and write `{{OUTPUT_DIR}}/EXTRACTION_NOTES.md` listing the commands you ran and any validation that failed.
