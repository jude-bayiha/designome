# Audit generated UI

Read `_shared-contract.md`, the accepted Design DNA, and applicable stress cases.

## Inputs

- Accepted Design DNA
- Generated implementation and changed files
- Rendered screenshots when available
- State, content, reflow, localization, accessibility, and scale stress cases

## Task

Compare the implementation with accepted rules, inspect generated code, and distinguish static checks from rendered or interaction evidence. When a browser is available, inspect computed typography, line height, control geometry, avatar fallback centering, local overflow, and gaps between major regions against accepted ranges and relationships. Classify deviations by impact and confidence, then propose the smallest corrective change.

## Output

Produce `audit/report.md`, `audit/findings.json`, a revision proposal, and proposed calibration patches when human or rendered evidence exposes an under-specified accepted rule. Each finding includes rule reference, evidence, severity, certainty, affected scope, suggested fix, and verification method.

## Guardrails

- Do not claim rendered, responsive, keyboard, motion, or runtime validation unless it was executed.
- A code-level match does not prove visual fidelity.
- Proposals are not failures until accepted as requirements.
- Preserve intentional, documented exceptions.
- Do not mutate the implementation unless the user separately authorizes a fix.
- Never promote a computed implementation value or human preference to screenshot-observed evidence. Keep it as a proposed calibration until explicit acceptance.
