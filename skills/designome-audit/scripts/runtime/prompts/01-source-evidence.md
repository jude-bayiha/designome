# Index source evidence

Read `_shared-contract.md` before executing this stage.

## Inputs

- Screenshot files
- Normalized request contract, including target use case and per-source evidence directives
- User-provided source context
- Run configuration
- UI-domain definitions and detection cues from the active matrix

## Task

Inventory every screenshot, preserve dimensions and ordering, identify visible regions without interpreting design intent, and assign stable evidence IDs. Record cropping, blur, occlusion, duplicated views, and whether screenshots form a known sequence. Apply each source directive before routing evidence: `only` and `exclude` constrain admissible axes, concepts, UI domains, and token or rule categories; `prefer` affects priority but not truth; `all` retains normal routing.

Classify each source's likely surface or page family only from visible evidence, with epistemic status, confidence, basis, and limitations. A phone-shaped viewport alone is not enough to assert a native mobile app; use system chrome, safe-area, navigation, control, and platform cues together. Compare source families with any user-supplied target use case. In `direct` mode, require relevant matching evidence before claiming destination-specific accuracy. When evidence is missing, name the missing families or regions and allow base Design DNA extraction to continue without a destination-specific fidelity claim. Cross-surface proposals require explicit `adapt` mode.

Detect UI domains per region using the matrix detection cues. A statistics area may route simultaneously to `domain.stats-kpis`, `domain.cards-collections`, and `domain.charts-data-visualization`; a theme-only source can route to color and surface facets without becoming layout evidence. Record negative routing decisions when an `only` or `exclude` directive suppresses an otherwise visible subject.

## Output

Produce `source-manifest.json`, `evidence-index.json`, `run-context.json`, and `compatibility-report.json`. Evidence entries include screenshot ID, region ID, bounding description, visible text summary, axis references, concept references, UI-domain references, quality limitations, rejected routes, source notes, and the applicable source directive. The compatibility report lists inferred source families, target use case, matching coverage, missing evidence, mode, and whether destination-specific synthesis may proceed.

## Guardrails

- Do not convert an interpretation into evidence.
- Do not treat filenames, ordering, or adjacent screenshots as proof of a flow unless supplied context confirms it.
- Never inspect a target project for visual evidence.
- Preserve unreadable or cropped areas as unknown.
- Do not classify a page family, platform, or UI domain without naming the visible cues and uncertainty.
- Do not reinterpret `only` as `prefer`, or use an excluded source to support a claim indirectly.
