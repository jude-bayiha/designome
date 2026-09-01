# Index source evidence

Read `_shared-contract.md` before executing this stage.

## Inputs

- Screenshot files
- Normalized request contract, including target use case and per-source evidence directives
- User-provided source context
- Run configuration

## Task

Inventory every screenshot, preserve dimensions and ordering, identify visible regions without interpreting design intent, and assign stable evidence IDs. Record cropping, blur, occlusion, duplicated views, and whether screenshots form a known sequence. Apply each source directive before routing evidence: `only` and `exclude` constrain admissible concepts and token or rule categories; `prefer` affects priority but not truth; `all` retains normal routing.

Infer each source's likely surface or page family only from visible evidence, with confidence and limitations. Compare those source families with any user-supplied target use case. In `direct` mode, require relevant matching evidence before claiming destination-specific accuracy. When evidence is missing, name the missing families or regions and allow base Design DNA extraction to continue without a destination-specific fidelity claim. Cross-surface proposals require explicit `adapt` mode.

## Output

Produce `source-manifest.json`, `evidence-index.json`, `run-context.json`, and `compatibility-report.json`. Evidence entries include screenshot ID, region ID, bounding description, visible text summary, quality limitations, source notes, and the applicable source directive. The compatibility report lists inferred source families, target use case, matching coverage, missing evidence, mode, and whether destination-specific synthesis may proceed.

## Guardrails

- Do not convert an interpretation into evidence.
- Do not treat filenames, ordering, or adjacent screenshots as proof of a flow unless supplied context confirms it.
- Never inspect a target project for visual evidence.
- Preserve unreadable or cropped areas as unknown.
- Do not reinterpret `only` as `prefer`, or use an excluded source to support a claim indirectly.
