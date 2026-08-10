# Analyze interactions and states

Read `_shared-contract.md` and the `axis.interactions-state-machine` matrix slice.

## Inputs

- Screenshots and evidence index
- Axis 3 focus areas and referenced concepts
- Motion mode: `off`, `observed-only`, or `auto`

## Task

Inventory visible control and business states, probable triggers, feedback, exits, focus implications, reversibility, and modality requirements. Propose absent loading, empty, error, success, warning, partial, disabled, and stale states only when they are necessary for robustness.

## Output

Return the shared stage JSON for `prompt.interactions-states` plus a state-coverage table linking component, state, trigger, feedback, exit, evidence status, and validation need.

## Guardrails

- A static screenshot cannot observe hover, focus, timing, gestures, keyboard behavior, or transitions.
- With motion `off`, emit no motion guidance. With `observed-only`, retain only supplied motion evidence. With `auto`, motion absent from evidence is always `proposed`.
- Motion must be functional, interruptible, layout-stable, and compatible with reduced motion.
- Never claim accessibility behavior from appearance alone.
