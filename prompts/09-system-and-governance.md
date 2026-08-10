# Analyze system and governance

Read `_shared-contract.md` and the `axis.system-governance` matrix slice.

## Inputs

- Screenshots and evidence index
- Axis 8 focus areas and referenced concepts
- Fragments from any completed axis stages

## Task

Identify reusable semantic-token relationships, component contracts, variants, exceptions, anti-patterns, provenance requirements, and framework-neutral design-to-code rules. Define what can be generated, what remains guidance, and what must be audited.

## Output

Return the shared stage JSON for `prompt.system-governance`, with export candidates, rule strength, provenance, ownership, migration notes, and non-regression checks.

## Guardrails

- Do not bind the Design DNA to a framework during extraction.
- Guidance in `AGENTS.md` is not mechanical enforcement; pair critical rules with validators or audits.
- Generated and user-owned files must remain distinguishable.
- Do not promote an inferred token relationship to observed without evidence.
