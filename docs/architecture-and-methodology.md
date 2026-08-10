# Architecture and methodology — Designome v0.2

## Architecture principles

- The host coding agent performs multimodal reasoning; Designome supplies contracts and workflow.
- Screenshots remain immutable inputs and the only source of visual truth.
- Every artifact is serializable, versioned, and traceable to a prompt stage.
- Observations, inferences, proposals, and unknowns never share a status.
- Framework-neutral extraction is separate from target-specific installation.
- Generated content is replaceable; human overrides are preserved.
- Missing evidence produces an unknown or proposal, never a fabricated observation.

## Modular pipeline

```mermaid
flowchart LR
    A["Screenshots"] --> B["01 Evidence intake"]
    B --> C["02-09 Eight axis analyses"]
    C --> D["10 Synthesis"]
    D --> E["Review and acceptance"]
    E --> F["Accepted Design DNA"]
    F --> G["11 Optional project integration"]
    G --> H["Generated UI task"]
    H --> I["12 Generation audit"]
    I --> J["Revision proposal"]
    J --> D
```

`00-orchestrator.md` validates inputs and routes stages. It does not perform every analysis itself. Each stage reads the shared contract, its matrix slice, and the minimum upstream artifacts it needs.

## Stage responsibilities

| Stage                         | Responsibility                                               | Main output                        |
| ----------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| 00 Orchestrator               | Plan, route, stop, and report                                | `run-plan.json`                    |
| 01 Source evidence            | Inventory screenshots and stable evidence regions            | source manifest and evidence index |
| 02 Perceptual foundations     | Composition, rhythm, hierarchy, visual language              | axis fragment                      |
| 03 Task architecture          | Orientation, priority, disclosure, context                   | axis fragment                      |
| 04 Interactions and states    | Controls, business states, feedback, optional motion         | state fragment and coverage table  |
| 05 Business and data patterns | Components, tables, forms, filters, data scale               | pattern fragment                   |
| 06 Adaptation and inclusion   | Reflow, localization, modalities, accessibility implications | adaptation fragment                |
| 07 Performance and resilience | Loading, stability, degradation, recovery                    | resilience fragment                |
| 08 Content, trust, privacy    | Language, consequences, provenance, permissions              | content fragment                   |
| 09 System and governance      | Tokens, contracts, exceptions, enforcement                   | governance fragment                |
| 10 Synthesis                  | Resolve claims into one canonical contract                   | `design-dna.json` and reports      |
| 11 Integration                | Install accepted artifacts idempotently                      | managed files and manifest         |
| 12 Generation audit           | Compare generated work with accepted rules                   | findings and revision proposal     |

## Evidence and claim model

Every canonical claim contains:

- a stable ID and one testable statement;
- matrix concept references;
- one epistemic status;
- confidence score and basis;
- evidence references when observed or inferred;
- explicit scope and exceptions;
- an implementation validation method and status.

Confidence and status are independent. A direct observation can have low confidence because of crop or compression. An unknown can have high certainty because the relevant state is absent.

## Status promotion

| Status     | Admission rule                                                                        | Promotion path                                 |
| ---------- | ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `observed` | Directly visible or explicitly supplied; localized evidence required                  | Remains scoped to its evidence                 |
| `inferred` | Best explanation of repeated visible relationships; evidence and uncertainty required | Human review or further evidence               |
| `proposed` | Useful behavior or rule absent from the screenshots                                   | Forward test and explicit acceptance           |
| `unknown`  | Insufficient evidence for a defensible claim                                          | New evidence or an authorized product decision |

Synthesis may merge compatible claims and preserve scoped exceptions. It must expose contradictions and may never promote status merely because several prompts repeated the same unsupported idea.

## Motion modes

- `off`: no motion output.
- `observed-only`: retain motion only when the user supplies a sequence, recording, specification, or implementation evidence.
- `auto`: propose functional motion where it clarifies state or spatial continuity.

Static screenshots never establish timing, easing, path, interruption, or reduced-motion behavior. In `auto`, those rules remain `proposed` and must be functional, interruptible, layout-stable, and compatible with `prefers-reduced-motion`.

## Extraction and installation boundary

Extraction may run without a target project. When a target path is supplied, the integration stage may inspect:

- package manager and framework;
- source and CSS entry points;
- aliases and build scripts;
- installed icon or motion libraries;
- applicable repository and nested agent instructions.

It may not treat existing CSS, components, tokens, or rendered UI as Design DNA evidence. Technical compatibility can change the export shape, never the extracted design meaning.

## Run artifacts

```text
.designome/runs/<run-id>/
├── run-plan.json
├── source-manifest.json
├── evidence-index.json
├── stages/
│   ├── 02-perceptual-foundations.json
│   └── ...
├── design-dna.json
├── design-rules.md
├── confidence-report.md
├── unknowns.md
├── integration-plan.json
└── audit/
    ├── report.md
    └── findings.json
```

Run artifacts are local working evidence and should not be committed by default. Accepted, sanitized outputs may be promoted deliberately.

## Validation layers

1. **Structural:** JSON Schema, JSON parsing, matrix references, prompt headings, and workflow YAML.
2. **Semantic:** claim evidence, status rules, concept coverage, conflicts, and unresolved unknowns.
3. **Installation:** dry-run, applicable instructions, checksums, duplicate markers/imports, and second-run no diff.
4. **Static implementation:** generated code references accepted tokens and rules.
5. **Rendered:** visual comparison, reflow, content stress, and state rendering.
6. **Interaction and accessibility:** keyboard, focus, assistive technology, motion, and recovery behavior.

Reports must state which layers actually ran. Static inspection is not rendered or interaction proof.

## Repository dependency rule

The concept matrix and Design DNA schema are canonical contracts. Prompts consume them. The installer consumes only accepted Design DNA. Audits consume accepted Design DNA plus implementation evidence. No artifact may silently become a new source of visual truth.

## Executable runtime boundary

The plugin packages three agent entry points:

- `designome-extract` performs multimodal evidence and synthesis work;
- `designome-install` reviews technical compatibility and invokes managed installation;
- `designome-audit` separates static, rendered, interaction, and accessibility evidence.

The dependency-light Node runtime performs only deterministic work:

- PNG, JPEG, and GIF metadata plus SHA-256 hashing;
- idempotent run initialization and input fingerprinting;
- semantic Design DNA reference and evidence checks;
- CSS entry discovery or explicit selection;
- generated CSS, user-owned overrides, and managed `AGENTS.md` blocks;
- manifest checksums, conflict detection, rollback, and verification.

The runtime cannot interpret screenshot design intent. Skills cannot bypass runtime ownership checks. This boundary keeps model reasoning flexible and file mutation predictable.
