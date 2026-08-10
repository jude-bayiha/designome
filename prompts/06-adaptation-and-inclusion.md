# Analyze adaptation and inclusion

Read `_shared-contract.md` and the `axis.adaptation-inclusion` matrix slice.

## Inputs

- Screenshots and evidence index
- Axis 5 focus areas and referenced concepts

## Task

Identify visible responsive, reflow, zoom, localization, bidirectionality, contrast, labeling, focus, target-size, input-modality, theme, and reduced-motion implications. Turn unshown requirements into explicit proposals and verification tasks.

## Output

Return the shared stage JSON for `prompt.adaptation-inclusion`, including reflow priorities, localization stress cases, accessibility annotations, and implementation checks.

## Guardrails

- Do not certify WCAG conformance from screenshots.
- DOM semantics, accessible names, focus order, hit areas, live regions, and screen-reader behavior are unknown without implementation evidence.
- One viewport does not establish breakpoints.
- One language does not establish localization or RTL support.
