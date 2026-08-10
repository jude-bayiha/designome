# Index source evidence

Read `_shared-contract.md` before executing this stage.

## Inputs

- Screenshot files
- User-provided source context
- Run configuration

## Task

Inventory every screenshot, preserve dimensions and ordering, identify visible regions without interpreting design intent, and assign stable evidence IDs. Record cropping, blur, occlusion, duplicated views, and whether screenshots form a known sequence.

## Output

Produce `source-manifest.json`, `evidence-index.json`, and `run-context.json`. Evidence entries include screenshot ID, region ID, bounding description, visible text summary, quality limitations, and source notes.

## Guardrails

- Do not convert an interpretation into evidence.
- Do not treat filenames, ordering, or adjacent screenshots as proof of a flow unless supplied context confirms it.
- Never inspect a target project for visual evidence.
- Preserve unreadable or cropped areas as unknown.
