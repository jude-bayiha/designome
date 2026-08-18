# Product foundation — Designome v0.2

## Product thesis

Modern coding agents can already inspect screenshots and write UI code. Their recurring weakness is not raw generation; it is preserving a coherent design grammar across later tasks, unseen states, real content, and implementation constraints. Designome supplies that missing, durable contract.

Designome converts screenshot evidence into:

- semantic visual relationships and candidate tokens;
- component anatomy, variants, and cross-cutting patterns;
- loading, empty, error, success, warning, partial, stale, and disabled expectations;
- content, data-scale, responsive, localization, accessibility, motion, and resilience guidance;
- explicit unknowns and implementation validation;
- an optional agent skill and managed target-project artifacts.
- project-local human-readable design documentation and repository-native styling context.

## Scope boundary

Designome does not infer or build a catalogue of pages, roles, or product flows unless a later feature explicitly introduces that scope. A screenshot may support task-architecture observations about the visible screen, but it does not authorize speculative screens.

The target project is optional during extraction and mandatory during installation. It may be inspected for technical compatibility only. Its existing visual implementation must not influence the extracted Design DNA.

## Core success test

The primary evaluation is a forward-generation test:

1. Extract and accept Design DNA from a small screenshot set.
2. Install the artifacts in a target project.
3. Ask the same class of coding agent to generate a screen that was not supplied, such as user management.
4. Review the result against the accepted Design DNA and stress cases.

Success means the new interface follows the extracted system in hierarchy, density, composition, components, states, content behavior, and governance. Pixel similarity to a source screen is not the objective.

## Agent-native technical stack

| Concern              | Choice                                                 | Role                                                                               |
| -------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Multimodal reasoning | Installed Codex or compatible coding-agent model       | Inspects screenshots and performs reasoning with the user's existing agent session |
| Workflow             | Modular Markdown prompts                               | Keeps tasks focused, reviewable, and replaceable                                   |
| Knowledge contract   | JSON Schema 2020-12 + JSON                             | Validates the matrix and Design DNA without a framework dependency                 |
| Guidance             | Markdown                                               | Serves humans and coding agents                                                    |
| Generated styling    | CSS custom properties and `@layer`                     | Provides portable, namespaced implementation primitives                            |
| Local tooling        | Node.js 24 + pnpm                                      | Runs screenshot metadata, validation, installation, and verification logic         |
| Validation           | Ajv + semantic checks                                  | Detects schema failures, broken references, and prompt-contract drift              |
| Repository quality   | Prettier, markdownlint, Husky, lint-staged, Commitlint | Enforces formatting and contribution hygiene                                       |
| Delivery             | GitHub Actions + Release Please                        | Runs checks and prepares conventional releases                                     |

No Python, NumPy, OpenCV, OCR engine, vector database, training pipeline, or standalone model API is required for the current product. A later capability may add code only when an agent prompt cannot reliably or safely perform the job.

## Product risks and controls

| Risk                                                         | Control                                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| The model invents exact values or unseen behavior            | Epistemic statuses, evidence references, screenshot-limit rules, and synthesis gates             |
| One giant prompt becomes unstable                            | Stage routing and specialized prompt files                                                       |
| Guidance is too aesthetic to improve real code               | State, edge-case, content, data, accessibility, and audit contracts                              |
| Relational guidance permits unreadable implementation values | Forward-test calibration, bounded preferred values, and computed-style audits                    |
| Target-project style contaminates extraction                 | Technical-only inspection policy and explicit source separation                                  |
| Generated CSS competes with Tailwind or project primitives   | Detect the styling stack and prefer repository-native utilities before component CSS             |
| Existing UI rules are silently replaced                      | Explicit precedence policy, read-only declared rule paths, and conflict reporting                |
| Reinstallation duplicates or overwrites work                 | Managed markers, checksums, separate overrides, dry-run, and second-run no-diff test             |
| `AGENTS.md` is treated as enforcement                        | Pair guidance with schema checks, generation audits, and future installer validation             |
| Static screenshots imply false accessibility confidence      | Separate visible cues from DOM, keyboard, assistive-technology, and runtime verification         |
| Automated repair silently changes product or design intent   | Explicit authorization, bounded passes, finding IDs, stop conditions, and immutable accepted DNA |

## v0.2 deliverables

This specification slice is complete when:

- the eight-axis matrix and cross-cutting concepts validate;
- all modular prompt files follow the shared output contract;
- the Design DNA example validates against the v0.2 schema;
- installation has an explicit idempotency and ownership contract;
- repository content and delivery metadata are English;
- local checks pass twice without changing tracked files.

The source-based Codex plugin, installer, executable audit planner, mechanical evidence evaluator, bounded repair plan, and initial CSS, Tailwind, and shadcn/ui adapter matrix are implemented. Browser control remains owned by the host or target project; Designome does not silently install or operate a second browser stack.
