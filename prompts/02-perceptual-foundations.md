# Analyze perceptual foundations

Read `_shared-contract.md` and the `axis.perceptual-foundations` matrix slice.

## Inputs

- Screenshots and evidence index
- Axis 1 focus areas and referenced concepts

## Task

Extract composition, regions, containment, grid, alignment, spacing rhythm, density, hierarchy, typography roles, color roles, surfaces, borders, radii, elevation, iconography, imagery, and data-visual language. Prefer relationships and ranges over unsupported exact values. For typography and spacing, name the affected UI roles and identify which relationships need proposed implementation bounds so that terms such as "compact" or "generous" cannot produce unreadable or collapsed output.

## Output

Return the shared stage JSON for `prompt.perceptual-foundations`, including candidate semantic tokens, visible exceptions, and stress-test handoffs.

## Guardrails

- Do not identify a font, icon library, or exact CSS value from visual resemblance alone.
- Separate reusable patterns from one-off content geometry.
- Treat responsive behavior and overflow strategy as inferred, proposed, or unknown unless shown.
- Do not mistake aesthetic similarity for a component contract.
- Do not invent measured values. Candidate readability floors, preferred values, and section-gap bounds remain `proposed` until forward-tested and explicitly accepted.
