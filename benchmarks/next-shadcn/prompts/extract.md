Use the extract operation of the `designome` skill to extract the design grammar of the screenshots in `{{INPUT_DIR}}/screenshots/`. They show {{SOURCE_DESCRIPTION}}. No motion.

The person who chose the screenshots described what they want from each one, in their own words:

{{SOURCE_ROUTING}}

Interpret these words into the request contract's per-source routing yourself; this is part of what the run tests.

Run the extraction to a draft Design DNA that `expand-dna --require-fidelity` validates, without asking questions; this is an unattended benchmark run. Do not accept the draft and do not install it. When the draft validates, copy it to `{{OUTPUT_DIR}}/design-dna.json`, copy the validated request contract to `{{OUTPUT_DIR}}/request-contract.json`, and write `{{OUTPUT_DIR}}/EXTRACTION_NOTES.md` listing the commands you ran, the request contract's per-source routing with the words that led to each mode, and any validation that failed.
