# Shared prompt contract

Every Designome stage follows this contract.

## Source policy

- Supplied screenshots are the only source of visual truth.
- A target project may reveal technical integration facts only: framework, package manager, CSS entry points, aliases, installed libraries, and applicable agent instructions.
- Never use an existing target-project UI, stylesheet, token, or component as evidence for the extracted design.
- Do not infer exact pixel values, font families, icon packages, breakpoints, easing curves, or implementation libraries unless explicit evidence establishes them.

## Normalized request policy

- The host agent interprets conversational instructions and writes a schema-valid `request-contract.json` before the operation. The deterministic runtime validates and persists that contract; it does not interpret natural language.
- Normalize only Designome-relevant intent, paths, evidence routing, constraints, preferences, and explicit authorization. Record ambiguous instructions under `interpretation.ambiguities` and meaningless fragments under `interpretation.ignoredFragments`; never convert either into a design claim or permission.
- Execute paths, modes, preferences, and authorization only when they match the validated request contract. A contract never expands the user's scope.
- For extraction sources, `only` and `exclude` are hard evidence-routing constraints, `prefer` is a priority, and `all` permits every visibly supported subject. A directive cannot make absent evidence observable.
- Route conversational intent through canonical axis, concept, UI-domain, token-category, and rule-category references from the active matrix. A UI-domain label such as `stats-kpis` narrows what to inspect; it never supplies missing visual evidence.
- A user-supplied target use case is product context, not screenshot evidence. Keep source observations canonical and express unsupported cross-surface adaptation as `proposed`.

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
      "uiDomainRefs": ["domain.example"],
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
  "facetCoverage": [
    {
      "facetRef": "facet.axis.subject",
      "coverageStatus": "partial",
      "claimRefs": ["claim.stable-id"],
      "gaps": ["Which evidence is still missing?"]
    }
  ],
  "uiDomainContributions": [],
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
- Every axis stage returns exactly one coverage record for every facet declared by its matrix slice. A facet may be `complete`, `partial`, `unknown`, or `not-applicable`; document presence alone never means complete.
- Every claim identifies applicable UI domains. Use an empty UI-domain list only for genuinely system-wide guidance.
- A detected UI domain is an evidence-routing classification, not a claim that every pattern in that domain exists.
- Richness means answering every admissible facet with precise relationships, exceptions, and verification needs. It never means manufacturing exact values, states, behaviors, product strategy, or unseen screens.
- Axis stages produce fragments. Only synthesis may deduplicate, resolve conflicts, and promote canonical rules.
- Do not generate page inventories, role families, or speculative screens.
