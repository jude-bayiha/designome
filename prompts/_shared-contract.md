# Shared prompt contract

Every Designome stage follows this contract.

## Source policy

- Supplied screenshots are the only source of visual truth.
- A target project may reveal technical integration facts only: framework, package manager, CSS entry points, aliases, installed libraries, and applicable agent instructions.
- Never use an existing target-project UI, stylesheet, token, or component as evidence for the extracted design.
- Do not infer exact pixel values, font families, icon packages, breakpoints, easing curves, or implementation libraries unless explicit evidence establishes them.

## Epistemic status

Use exactly one status per claim:

- `observed`: directly visible or explicitly supplied, with evidence references.
- `inferred`: the strongest explanation of visible evidence, with evidence references and uncertainty.
- `proposed`: a useful rule not visible in the source, clearly labeled as a recommendation.
- `unknown`: evidence is insufficient; preserve the question instead of guessing.

## Stage output

Return structured JSON with this shape unless the stage defines an additional artifact:

```json
{
  "stageId": "prompt.example",
  "status": "complete",
  "claims": [
    {
      "id": "claim.stable-id",
      "conceptRefs": ["concept.example"],
      "statement": "One testable design statement.",
      "epistemicStatus": "observed",
      "confidence": {
        "score": 0.9,
        "basis": "Why this score is justified."
      },
      "evidenceRefs": ["evidence.screenshot-01.region-02"],
      "scope": ["dashboard"],
      "exceptions": [],
      "validation": {
        "method": "How a later implementation can verify the claim.",
        "status": "pending"
      }
    }
  ],
  "unknowns": [],
  "conflicts": [],
  "handoff": []
}
```

Allowed stage statuses are `complete`, `partial`, and `blocked`. Allowed validation statuses are `pending`, `passed`, `failed`, and `not-applicable`.

## Quality rules

- One claim expresses one testable rule.
- `observed` and `inferred` claims require evidence references.
- `proposed` claims state that they are not visible in the screenshots.
- Record contradictions; do not silently average them.
- Keep unknowns explicit and actionable.
- Axis stages produce fragments. Only synthesis may deduplicate, resolve conflicts, and promote canonical rules.
- Do not generate page inventories, role families, or speculative screens.
