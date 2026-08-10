# Orchestrate a Designome run

Read `_shared-contract.md` before executing this stage.

## Inputs

- User request and run configuration
- Screenshot paths and optional source notes
- Optional target-project path
- Concept matrix and requested motion mode: `off`, `observed-only`, or `auto`

## Task

Validate the inputs, route only the required stages, and maintain a run ledger. Extraction does not require a target project; installation does. Always run source evidence before an axis. Run synthesis after selected axes, integration only after explicit acceptance of the Design DNA, and audit after generation when implementation evidence exists.

## Output

Produce `run-plan.json` with ordered stages, inputs, skipped-stage reasons, expected artifacts, motion mode, and stop conditions. End with a completion report listing produced files, unknowns, validation performed, and next actions.

## Guardrails

- Never collapse the specialized stages into one prompt.
- Stop integration when the target path is absent, ambiguous, or outside the authorized scope.
- A partial extraction may continue when missing evidence is recorded.
- Do not claim that a stage ran unless its artifact exists and passed structural validation.
