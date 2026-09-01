# Orchestration and host-agent contract

`designome run` coordinates the complete Designome workflow without moving visual reasoning or UI generation into the deterministic runtime.

## Responsibility boundary

| Actor             | Responsibilities                                                                                                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Designome runtime | Environment diagnostic, run initialization, semantic validation, persistent state transitions, transactional installation, capture plan, evidence normalization checks, mechanical evaluation, report generation |
| Host agent        | Conversational request normalization, screenshot reasoning through `designome-extract`, target-interface implementation, real browser control, interaction execution, perceptual comparison                      |
| Human             | One mandatory normal-workflow decision: accept or reject the draft Design DNA                                                                                                                                    |
| Browser adapter   | Stable typed recording surface that normalizes host-browser observations into audit evidence 1.0                                                                                                                 |

The runtime never claims to generate the target interface, control the host's integrated browser, or make a deterministic perceptual judgment.

## Persistent workflow

Start a run from the directory that should own the local active-run pointer:

```bash
designome run \
  --source /absolute/reference.png \
  --request /absolute/request-contract.json \
  --project /absolute/target-project \
  --css-entry src/styles/globals.css
```

The command creates `.designome/runs/<workflow-id>/workflow-state.json`. Every step records an owner, status, attempts, artifacts, timestamps, and an actionable error. `run-plan.json` separately records request-routed axes/domains, all five facet IDs for each axis stage, and whether final visual routing is deferred to source evidence. `designome run --resume` loads `.designome/active-run.json`, validates version `1.0.0`, and resumes the first non-completed step.

The ordered steps are:

1. `doctor`
2. `initialize-run`
3. `extract-design-dna` — host-agent handoff
4. `accept-design-dna` — human handoff
5. `install-design-dna`
6. `implement-interface` — host-agent handoff
7. `capture-browser-evidence` — host-agent and adapter handoff
8. `evaluate-audit`
9. `finalize`

Inside `extract-design-dna`, the host follows the 18-stage v0.3 prompt plan: orchestration, source evidence, 13 independently routed specialist axes, synthesis, optional integration, and later audit. An all-purpose source defers specialist admission until visible regions are classified. A request made exclusively of `only` directives can pre-route the affected axes and UI domains. System governance always runs, and final synthesis still emits all 65 facet and 20 domain coverage records.

The state machine uses `pending`, `in-progress`, `awaiting`, `completed`, `failed`, and `skipped` per step. Workflow state uses `running`, `awaiting-human`, `awaiting-host`, `failed`, or `completed`. Completed steps are not rerun. A failed deterministic step is replanned and retried on resume.

## Normal handoffs

After the host agent writes the draft `design-dna.json` to the path in the extraction handoff:

```bash
designome run --resume
designome run --resume --accept-dna
```

The second command is the explicit human acceptance. It records the actor, time, workflow ID, document ID, and revision under `extensions.designomeAcceptance` before installation.

After the host agent completes the target interface:

```bash
designome run --resume --host-event implementation-complete
```

The returned capture handoff contains `planPath`, the `designome/audit` adapter export, and the required evidence output path. After the adapter finalizes real observations:

```bash
designome run --resume \
  --host-event evidence-complete \
  --evidence /absolute/target-project/.designome/runs/<workflow-id>/audit/external-evidence.json
```

Additional human approval is required only for a destructive write, ownership conflict, applicable repository instruction, or real product decision. Host handoffs are execution boundaries, not approval prompts.

## Interrupted and resumed example

If installation fails after application starts, the transaction rolls back and the step is stored as `failed`. The next `designome run --resume` re-runs read-only diagnostic and planning, recovers an interrupted journal if present, and retries from installation. It does not repeat extraction or acceptance.

An executable integration test covers this sequence in `tests/runtime/orchestration-transaction-audit.test.mjs`.
