# Analyze content, trust, and privacy

Read `_shared-contract.md` and the `axis.content-trust-privacy` matrix slice.

## Inputs

- Screenshots and evidence index
- Axis 7 focus areas and referenced concepts

## Task

Analyze terminology, tone, precision, actionability, next steps, destructive consequences, provenance, freshness, permission messaging, and visible privacy explanations. Identify where trust depends on content that is absent or ambiguous.

## Output

Return the shared stage JSON for `prompt.content-trust`, including terminology rules, message patterns, consequence disclosures, and trust-related unknowns.

## Guardrails

- Do not infer real policies, permissions, data handling, or compliance from UI copy.
- Do not use color alone as the proposed meaning of a status.
- Destructive-action safeguards must be proportionate, not universally modal.
- Preserve legal or policy questions as unknowns for an authorized owner.
