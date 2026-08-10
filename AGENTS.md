# Agent Working Rules

Designome is an agent-native project that turns UI screenshots into reusable design guidance. Supplied screenshots are the only source of visual truth.

## Product scope

- Write repository content, code comments, commit messages, branch metadata, and pull-request content in English.
- Do not reconstruct unrequested page families or user roles.
- Do not introduce a heavy local CV, OCR, or ML pipeline. The host's multimodal model performs the analysis.
- A target project is a technical integration destination only. Never use its CSS, components, or UI as Design DNA evidence.
- Every claim uses exactly one status: `observed`, `inferred`, `proposed`, or `unknown`.
- Behavior absent from a screenshot may be proposed, but never presented as observed.

## Required workflow

1. Read the matrix and only the prompts needed for the task.
2. Preserve the evidence, confidence, exceptions, and limits of every claim.
3. Keep prompts specialized; do not recreate a monolithic prompt.
4. Update the matrix, schema, prompts, and documentation together when a contract changes.
5. Run `pnpm check` before delivery.

## Git and delivery

- Create branches from `main` as `<type>/task-<short-description>`.
- Use Conventional Commits with short scopes such as `repo`, `matrix`, `prompts`, `installer`, or `docs`.
- Produce coherent micro-commits; do not mix governance, contracts, prompts, and documentation without a reason.
- Deliver every change through a pull request. Document the objective, changes, validation, risks, and limitations.
- Never commit secrets, `.env` files, private screenshots, target projects, or `.designome/runs/` artifacts.

## Proportionate validation

- Documentation only: formatting, markdownlint, references, and `git diff --check`.
- Matrix or schema: `pnpm validate` and `pnpm test`.
- Prompts: structural validation, then a forward test on known screenshots before promotion.
- Installation: test two consecutive runs, preservation of overrides, and detection of manual changes.

`README.md` is the product entry point. `docs/architecture-and-methodology.md` describes the pipeline, and `docs/concept-matrix.md` explains the matrix.
