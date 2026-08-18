# Audit generated UI

Read `_shared-contract.md`, the accepted Design DNA, and applicable stress cases.

## Inputs

- Accepted Design DNA
- Generated implementation and changed files
- Rendered screenshots when available
- State, content, reflow, localization, accessibility, and scale stress cases
- Audit configuration with routes, viewports, flows, and an explicitly resolved browser provider

## Task

Initialize the executable audit plan, compare the implementation with accepted rules, inspect generated code, and distinguish static checks from rendered or interaction evidence. Resolve providers in this order: host in-app browser when the host can execute it, an existing target-project Playwright setup, explicitly authorized managed Playwright, then a clearly labeled static-only fallback. When a browser is available, inspect computed typography, line height, control geometry, avatar fallback centering, local overflow, and gaps between major regions against accepted ranges and relationships. Classify deviations by impact and confidence, then propose the smallest corrective change.

## Output

Produce `audit/plan.json`, `audit/evidence.json`, `audit/report.md`, `audit/findings.json`, a revision proposal, and proposed calibration patches when human or rendered evidence exposes an under-specified accepted rule. Each finding includes rule reference, evidence, severity, certainty, affected scope, suggested fix, and verification method. Separate observed design deviations and mechanical risks from proposed calibration candidates that still require explicit acceptance.

## Guardrails

- Do not claim rendered, responsive, keyboard, motion, or runtime validation unless it was executed.
- A code-level match does not prove visual fidelity.
- Proposals are not failures until accepted as requirements.
- Preserve intentional, documented exceptions.
- Do not mutate the implementation unless the user separately authorizes a fix.
- Never promote a computed implementation value or human preference to screenshot-observed evidence. Keep it as a proposed calibration until explicit acceptance.
- Do not install Playwright or another browser dependency without explicit authorization.
