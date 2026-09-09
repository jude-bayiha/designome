# Fidelity Contract 1.0

Designome must preserve enough source-specific logic to guide reconstruction, while admitting what a screenshot cannot establish. Fidelity Contract `1.0.0` is an additive contract on Design DNA `0.3.0`. Documentation layout `2.1.0` keeps the same 52 paths and improves their contents.

## Coverage that means something

A complete facet needs at least one non-unknown canonical token, rule or component routed to its axis. A complete domain needs an applicable domain, a non-unknown artifact routed to that domain and no unresolved gaps. Unknown or not-applicable records need a reason. Evidence references and empty documents do not establish semantic coverage. The runtime checks references and routing; a host must still review whether the actual prose answers the question.

## Independent assertions

The optional root `fidelity` object enables independently scoped claims. New run plans declare this contract and require it before accepting a draft. The standalone validator opts into that requirement with:

```bash
designome validate-dna --file /absolute/design-dna.json --require-fidelity
```

Each rule has `assertions.requirements`. Components have assertion arrays for `compositionRules`, `contentConstraints`, `adaptationRules`, `accessibilityRequirements` and `antiPatterns`. Anatomy parts have `assertions.contentConstraints`; variants have `assertions.conditions` and `assertions.differences`. Each entry is a full claim with status, confidence, evidence, routing, scope, exceptions and validation. Existing string arrays remain exact ordered mirrors for compatibility; mismatches fail validation.

Each state has six independent claims: `appearance`, `trigger`, `behavior`, `feedback`, `exit` and `programmaticState`. The legacy state status and evidence refer only to appearance. A visible selected treatment may be observed while keyboard activation and programmatic semantics remain unknown or proposed. The five other assertion statements exactly mirror their corresponding legacy fields.

Legacy DNA remains readable and installable under its existing acceptance rules. Documentation labels untyped behavioral notes `unknown`; it does not silently inherit an observed parent label. Upgrading requires source review and explicit assertions, not a mechanical migration. Existing historical run plans remain compatible; newly created plans require the new fidelity contract.

## Signature qualities and calibration

`fidelity.qualities` records a small set of distinctive relationships with `critical`, `important` or `supporting` priority, canonical artifact references, a full claim and concrete failure modes. Prioritize what makes the supplied UI recognizable, such as a dense row rhythm, a dominant analysis region or restrained status color.

`fidelity.constraints` records target role, property, unit, expected design value and tolerance. An optional `relativeTo` expresses a ratio between two measured roles. Bounds estimated for implementation remain `proposed`, with a confidence basis and review method. Qualities or constraints that cannot be supplied require an explicit limitation; empty lists never mean visual readiness.

Each constraint has separate `acceptance.status` (`pending`, `accepted`, `rejected`) and `acceptance.basis`. Acceptance never changes epistemic status. A pending calibration is diagnostic; accepted constraints participate in benchmark requirements; rejected ones remain recorded but excluded. Constraints do not automatically rewrite CSS tokens. A reviewed implementation value must still be represented through the existing token value/export contract.

`evaluateFidelityConstraints` evaluates host-supplied role/property measurements, compatible units, ranges, ratios and tolerance. Missing measurements, incompatible units and relationships needing perceptual review remain incomplete. The runtime does no OCR, pixel inference or font identification. Readiness always reports `visualFidelity: not-established`; it is eligibility for a benchmark, not a visual pass.

## Documentation projection

Token relationships, applies-to scopes, rationale, failures, dependencies, exceptions and validation status survive projection. Domain documents contain full relevant token, rule and component contracts, including dependency closure, anatomy, selection conditions, concrete differences and independently labeled behavior. Related signature qualities and calibration bounds appear with the recipe and in governance documentation.

`projectDocumentation(dna)` provides the same dossier without target inspection, installation or acceptance. The benchmark uses this pure projection. It strips source paths from generator packets and preserves source evidence identifiers, confidence and limitations.

## Delivery priorities

| Priority | Change                                                                                                       | Proof boundary                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| P0       | Reject hollow completeness; preserve relational grammar; introduce docs-only reconstruction                  | Contract tests and rendered corpus                             |
| P1       | Independent assertions, numeric proposals, signature priorities, autonomous recipes, type character guidance | Schema/runtime checks plus scoped visual review                |
| P2       | Repeat with independent generators, different source families and component libraries                        | Hash-bound artifacts and separate fidelity/finish observations |

The [example](../examples/design-dna.fidelity.reference.json) illustrates the contract; it is not a fresh source extraction or a benchmark result. See the [benchmark workflow](fidelity-benchmark.md) for executed evidence and remaining limits.
