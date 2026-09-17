# Context compiler non-regression assessment

Date: 2026-09-07

## Scope

Context Contract `1.0.0` adds deterministic projections, compact host views, source admission, stage envelopes and opt-in orchestration. DNA and Request Contract versions remain unchanged. Full context remains the default. Matrix, schema, prompts, skills, runtime and documentation change together because they implement one transport contract, not separate visual grammars.

## Automated validation

`pnpm check` passes all 37 tests: formatting, Markdown lint, repository/schema validation and runtime tests. All three skill entrypoints also pass the skill-creator structural validator. These checks ran with Node subprocess execution available; an earlier sandboxed run hid subprocess output and was not treated as reliable final validation.

The added tests cover:

- exact canonical JSON-pointer values and complete specialist/domain records;
- all 20 UI domains and all 13 axes/65 facet obligations;
- compact-view reconstruction and tamper rejection;
- missing, altered and injected nodes, even with recalculated hashes;
- changed canonical prompts, missing originals and full fallback;
- source hashes, duplicate-image aliases with different directives, and deterministic reuse;
- only/exclude/prefer admission and conservative uncertain routing;
- pending/skipped stage honesty, five-facet bindings and missing/blocked/stale synthesis dependencies;
- complete fragments, conflicts, exceptions and accepted-DNA retention;
- CLI validation, opt-in initialization and refusal of premature workflow acceptance;
- audit focus preservation and capture-fingerprint mismatch rejection.

Existing tests still cover two consecutive installations, preservation of overrides, managed-file change detection, migration ownership, transactional rollback, deterministic resume, CSS/Tailwind/shadcn adapters and independent audit layers. Browser evidence in automated tests is synthetic adapter data, not a live browser or usability evaluation.

## Measured host-view size

These are serialized UTF-8 bytes of the compact host view, not actual model tokens, billing or complete-session consumption:

| Phase/input                                                               | Full view | Lossless view |         Reduction |
| ------------------------------------------------------------------------- | --------: | ------------: | ----------------: |
| Request discovery                                                         |   164,199 |        68,267 | approximately 58% |
| Data-display specialist, three supplied captures with restricted subjects |   158,048 |        72,429 | approximately 54% |

Integrity metadata remains in a separate machine-readable pack. The host reads the validated view, not hundreds of repeated hashes and JSON pointers. Shared conversation context is not evicted automatically; end-to-end savings require measuring actual host execution. Governance, synthesis, installation and audit deliberately retain global contracts in this version.

## Independent visual forward test

Two isolated host-agent passes analyzed the same three user-supplied dashboard crops, normalized request and region index. One received the full data-display context; the other received the lossless view. Each inspected all original images. Neither received the other output or an intended answer. The test was deliberately limited to the data-display specialist, not a complete extraction, generated website or browser audit. Private images and raw artifacts remain outside the repository.

The request admitted captures 1 and 2 only for statistics/charts and capture 3 only for colors, with a corporate-site use case in direct mode. Both passes produced structurally valid, hash-bound partial envelopes. Independent runtime revalidation of both envelopes and both views passed.

| Review dimension         | Full context                                                       | Lossless view                                         |
| ------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------- |
| Five facet records       | Four partial, tables/lists unknown                                 | Same coverage distribution                            |
| Primary analysis         | KPI anatomy, comparisons, engagement chart, revenue panel          | Same subject families                                 |
| Data evidence references | Admitted regions from captures 1 and 2                             | Same source boundary                                  |
| Unsupported behavior     | Accessibility/reflow proposed; data and interaction gaps retained  | Same distinction, with explicit static-callout caveat |
| Destination              | Corporate intent treated as context, not observed website evidence | Same distinction                                      |

Review did **not** establish complete semantic equivalence. The reduced pass included more explicit visible callout/period details; the full pass separately described supporting copy and dividers. Candidate structure and epistemic labels differed. Raw claim counts were not used as a quality score.

The baseline also demonstrated why structural validation is insufficient: its confidence prose mentioned the color-only crop despite using only admitted numeric evidence IDs, and its short assessment suggested partial table coverage although the envelope correctly said unknown. These are baseline narrative inconsistencies, not acceptable reference behavior to reproduce. Neither output may be promoted to accepted DNA without semantic review. Corporate-adaptation proposals remain unaccepted and do not authorize generation or cross-surface implementation.

Outcome: exact transport integrity and retained specialist obligations are demonstrated; one bounded visual comparison is available, with explicitly recorded differences. No full-pipeline, repeated-run, held-out corporate/native-mobile, rendered UI, assistive-technology or usability equivalence is claimed.

## Promotion decision

No automatic test sets semantic parity to passed. Universal no-regression and broad corporate/native-mobile fidelity are not established by these tests. Promotion requires repeated independent runs on a held-out multi-family corpus and downstream rendered-interface evaluation. Keep `full` as the default until that evidence exists.
