# Orchestrate a Designome run

Read `_shared-contract.md` before executing this stage.

## Inputs

- User request and run configuration
- Schema-valid normalized request contract
- Screenshot paths and optional source notes
- Optional target-project path
- Concept matrix and requested motion mode: `off`, `observed-only`, or `auto`
- Thirteen axis definitions, 65 required facets, and 20 UI-domain definitions

## Task

Interpret the user request once, normalize it into `request-contract.json`, validate it with the deterministic helper, then route only the required stages from that contract. Do not repeatedly reinterpret the original conversation downstream. Maintain the persistent `workflow-state.json` ledger used by `designome run`. Extraction does not require a target project; installation does. Always run source evidence before an axis. Run synthesis after selected axes, integration only after explicit human acceptance of the Design DNA, and audit after generation when implementation evidence exists.

Route each source through canonical `axisRefs`, `conceptRefs`, `uiDomainRefs`, token categories, and rule categories before any axis sees it. Run every axis required by admitted evidence or an explicit global focus. The system-governance axis always runs. Unrouted facets remain visible in coverage as `unknown` or `not-applicable`; never omit them.

Treat UI domains as reusable visible pattern families, not page inventories. A capture can contribute to several domains, such as `domain.stats-kpis`, `domain.cards-collections`, and `domain.charts-data-visualization`. Route only the visible regions relevant to each domain.

For incomplete language, retain safe executable instructions, list ambiguities, and ignore meaningless fragments. Mark the request `blocked` only when a missing or contradictory decision changes the authorized operation, target, evidence scope, or mutation boundary. A nonsensical optional use case does not block base extraction.

Record every boundary explicitly: the deterministic runtime initializes, validates, installs, verifies, and evaluates normalized evidence; the host agent performs screenshot reasoning, interface implementation, real browser control, and perceptual comparison; the human accepts the draft Design DNA. A normal workflow has no other mandatory approval. Pause only for that acceptance, an unsafe write, a checksum conflict, or a real product decision.

## Output

Produce validated `request-contract.json`, `run-plan.json`, plus persistent `workflow-state.json` with ordered steps, owner, status, attempts, inputs, artifacts, failures, resumable handoffs, motion mode, routed axes and UI domains, expected facet-coverage records, and stop conditions. End with a consolidated result that preserves each audit layer and lists produced files, unknowns, validation performed, and remaining host-agent work.

## Guardrails

- Never collapse the specialized stages into one prompt.
- Do not skip a facet silently. Missing evidence is a coverage result.
- Stop integration when the target path is absent, ambiguous, or outside the authorized scope.
- A partial extraction may continue when missing evidence is recorded.
- Do not claim that a stage ran unless its artifact exists and passed structural validation.
- Never claim that the deterministic runtime extracted visual meaning, generated the target interface, controlled an unavailable browser, or performed perceptual reasoning.
- Resume from persisted artifacts and validated state; never repeat a completed destructive step blindly.
