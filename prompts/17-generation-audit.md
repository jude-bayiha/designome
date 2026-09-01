# Audit generated UI against Design DNA v0.3

Read `_shared-contract.md`, the accepted Design DNA, active matrix, normalized audit request, and applicable stress cases.

## Inputs

- Accepted v0.3 or supported legacy Design DNA
- Validated audit request with axis, concept, and UI-domain focus
- Generated implementation and changed files
- Rendered screenshots and host-browser evidence when available
- Facet, state, content, reflow, platform, accessibility, localization, scale, trust, and performance stress cases
- Audit configuration with routes, viewports, scenarios, directions, flows, and resolved provider

## Task

Initialize executable and perceptual plans from normalized focus, explicit authorizations, Design DNA coverage gaps, and routed UI domains. Keep four independent layers:

1. Installation: managed ownership, checksums, versions, references, and overrides.
2. Mechanical: schema, tokens, rules, DOM-observable state, overflow, console, accessible names and states, and configured invariants.
3. Perceptual: host-agent comparison of hierarchy, composition, typography, color, components, UI-domain grammar, exceptions, and visual stability.
4. Usage: real navigation, input, filtering, selection, overlays, focus, responsive behavior, platform conditions, localization, accessibility, recovery, and task continuity.

The host agent controls the real browser and records captures, console messages, interactions, accessibility checks, responsive checks, and perceptual observations through `createCaptureSession`; never ask it to assemble internal evidence JSON manually. The deterministic runtime validates and normalizes adapter output, advances provider state, and evaluates mechanical and usage observations. Perceptual comparison remains explicitly non-deterministic with provenance, certainty, referenced captures, and limitations.

Audit every accepted required rule plus explicitly focused axis facets and UI domains. Use matrix domain stress tests for statistics, charts, tables, forms, mobile shell, overlays, media, commerce, authentication, settings, files, and other applicable patterns. A missing implementation needed by an accepted rule is a finding; a missing proposed pattern is a calibration or product decision, not a defect.

Classify deviations by layer, impact, confidence, scope, provenance, and affected axis, facet, concept, UI domain, token, rule, or component. Propose the smallest corrective change. In explicitly authorized repair mode, limit the loop to one to three passes, patch only observed scoped findings, run target checks, and recapture affected evidence.

## Output

Produce `audit/plan.json`, adapter-generated evidence, canonical report JSON and Markdown, findings, coverage deltas, a revision proposal, and proposed calibration patches. Keep failures, incomplete evidence, unknowns, and calibration candidates distinct.

## Guardrails

- Do not claim rendered, responsive, keyboard, screen-reader, motion, platform, performance, or runtime validation unless executed.
- A code-level match does not prove perceptual fidelity or usability.
- Proposals are not failures until accepted as requirements.
- Preserve documented exceptions and source-routing limits.
- Do not mutate the implementation without separate repair authorization.
- Never mutate accepted Design DNA during repair.
- Missing configured routes, viewports, scenarios, directions, or flows produce `incomplete`.
- A passing mechanical layer never implies a passing perceptual or usage layer.
