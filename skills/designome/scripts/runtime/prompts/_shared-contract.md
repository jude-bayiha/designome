# Shared prompt contract

Every Designome stage follows this contract.

## Experimental context transport

When explicitly using Context Contract `1.0.0`, validated phase views transport canonical inputs without summarization. Read the complete view, including context, routing and payload; integrity metadata stays in the machine-readable pack. Full governance, synthesis, installation and audit contracts remain mandatory. Follow `docs/lossless-context.md` for hash-bound envelopes; pending/skipped scaffolds never prove execution. Request additional routing when discovery reveals missing specialist context. Context checks prove structure and admission, not visual accuracy.

## Audit verification contract

New audit plans use Audit Contract `2.0.0` as an additive capability. The host binds each established obligation to exact target contexts and the source capture IDs that may support it. A binding or planned check is an applicability declaration, not evidence. Record browser captures, measurements, interactions, accessibility checks, and one-check perceptual observations through the official adapter. The runtime verifies references, file hashes, native image metadata, context coverage, units, tolerances, and aggregation; the host agent remains responsible for visual judgment. An `unknown` or `proposed` perceptual claim is `incomplete`, never a verdict. Legacy evidence is preserved for historical runs and must be recaptured before it can satisfy a 2.0 plan.

## Source policy

- Supplied screenshots are the only source of visual truth.
- A target project may reveal technical integration facts only: framework, package manager, CSS entry points, aliases, installed libraries, and applicable agent instructions.
- Never use an existing target-project UI, stylesheet, token, or component as evidence for the extracted design.
- Do not infer exact pixel values, font families, icon packages, breakpoints, easing curves, or implementation libraries unless explicit evidence establishes them.
- Record the grammar, never the source product's assets. Product and brand names, logos, icon glyphs, illustrations, photos, people, copy and data values are replaceable. Write the rule they follow ("project marks are colored rounded-square tiles with a white glyph"; "record IDs are an uppercase prefix, a hyphen and a zero-padded four-digit number"), never the asset or value itself. Evidence references locate a value; claims and identifiers do not repeat it.

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

- A `complete` final facet or applicable domain needs at least one relevant, non-unknown canonical artifact and no unresolved gaps. A checklist, evidence pointer or document alone is insufficient. Unknown and not-applicable records explain why evidence is unavailable.
- New extraction uses Fidelity Contract `1.0.0`. Each requirement, composition/content/adaptation/accessibility note, variant condition/difference and state field has its own full claim. A visible appearance never establishes its trigger, behavior, feedback, exit or programmatic semantics. See `docs/fidelity-contract.md` for exact mirrors, compatibility and the authoring shorthand that `expand-dna` completes deterministically.
- Preserve a small ranked set of source-specific qualities: which relationships make this interface recognizable, their scope, evidence, exceptions and concrete failure modes. Priorities guide review; they do not turn preference into observation.
- Keep observed relationships separate from proposed reproduction bounds. Calibration candidates name target, property, unit, range or ratio, tolerance, validation and acceptance basis. Unknown exact values stay unknown. Never use the target project's styles as calibration evidence.
- Make every visual property that carries hierarchy or identity measurable. A generator without the screenshots reproduces only what the rules quantify and fills the rest with its own defaults, which drift toward heavier, louder and more generic output. For each such property, record a band, ratio, count or order: weight band per type role, size ratio between roles, gap and inset families, radius relative to component height, border and stroke width, elevation tier, mark thickness relative to its pitch, and the accent budget (which roles may use the accent and how many accented elements a screen carries). Adjectives such as light, bold, subtle, sparing, airy or premium may summarize a rule, never replace it.
- Separate quality guardrails from budgets. Guardrails are defects no source wants: a repeated component that changes anatomy from one place to the next, or content that overflows its container. Budgets are identity: how many status colors, chart series and accented elements a screen carries. Measure every budget on the admitted screenshots as a count, order or share, and record it as a claim like any other relationship. When a budget is not visible, leave it `unknown`; never fill it with a generic default, because the dossier brief supplies Designome's defaults at generation time, after the person's request and after measured rules.
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
