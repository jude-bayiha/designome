# Audit generated UI

Read `_shared-contract.md`, the accepted Design DNA, and applicable stress cases.

## Inputs

- Accepted Design DNA
- Generated implementation and changed files
- Rendered screenshots when available
- State, content, reflow, localization, accessibility, and scale stress cases
- Audit configuration with routes, viewports, flows, and an explicitly resolved browser provider
- Versioned normalized browser evidence produced by the official capture adapter
- Host-agent perceptual observations with provenance, certainty, and limitations

## Task

Initialize the executable audit and perceptual plans. Keep four independent layers: installation, mechanical, perceptual, and usage. The host agent controls the real browser and records captures, console messages, interactions, accessible names and states, focus behavior, scenarios, directions, and responsive checks through `createCaptureSession`; never ask it to assemble internal evidence JSON manually. The runtime validates and normalizes the adapter output, advances the provider state through `awaiting-evidence -> evidence-received -> running -> passed | failed | incomplete`, and evaluates mechanical and usage observations. The host agent performs the explicitly non-deterministic perceptual comparison and records provenance, certainty, and limitations. Classify deviations by impact and confidence, then propose the smallest corrective change. In explicitly authorized repair mode, limit the loop to one-to-three passes, patch only observed scoped findings, run target checks, and recapture affected evidence.

## Output

Produce `audit/plan.json`, adapter-generated `audit/evidence.json`, canonical `audit/report.json`, Markdown rendered from that same state, `audit/findings.json`, a revision proposal, and proposed calibration patches when human or rendered evidence exposes an under-specified accepted rule. Each finding includes its audit layer, rule reference, evidence, severity, certainty, affected scope, provenance when host-evaluated, suggested fix, and verification method. Separate observed design deviations and mechanical risks from proposed calibration candidates that still require explicit acceptance.

## Guardrails

- Do not claim rendered, responsive, keyboard, motion, or runtime validation unless it was executed.
- A code-level match does not prove visual fidelity.
- Proposals are not failures until accepted as requirements.
- Preserve intentional, documented exceptions.
- Do not mutate the implementation unless the user separately authorizes a fix.
- Never promote a computed implementation value or human preference to screenshot-observed evidence. Keep it as a proposed calibration until explicit acceptance.
- Do not install Playwright or another browser dependency without explicit authorization.
- Repair mode never mutates accepted Design DNA and excludes unaccepted calibration candidates from automatic patches.
- Missing configured routes, viewports, scenarios, directions, or flows produce `incomplete`; external evidence is never reported as an unexecuted provider.
- A passing mechanical layer must never imply a passing perceptual or usage layer.
