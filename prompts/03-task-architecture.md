# Analyze task architecture

Read `_shared-contract.md` and the `axis.task-architecture` matrix slice.

## Inputs

- Screenshots and evidence index
- Axis 2 focus areas and referenced concepts

## Task

Analyze orientation, current location, information hierarchy, reading order, action priority, grouping, progressive disclosure, cognitive load, and visible context anchors. Describe how the shown screen supports a task without inventing other pages or roles.

## Output

Return the shared stage JSON for `prompt.task-architecture`, with claims about visible task structure and separately labeled proposals for missing recovery or disclosure behavior.

## Guardrails

- Do not invent navigation destinations, user journeys, permissions, or product strategy.
- A prominent control suggests priority but does not prove usage frequency.
- Do not turn a single screen into a multi-page world model.
- Preserve ambiguous action hierarchy as a conflict or unknown.
