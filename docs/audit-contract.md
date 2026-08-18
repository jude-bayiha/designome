# Rendered audit contract

Designome audits accepted Design DNA against implementation evidence without turning implementation values into screenshot evidence. The executable helper initializes deterministic artifacts and evaluates normalized measurements; the host agent or a target-project browser runner performs the actual navigation and capture work.

## Evidence layers

| Layer                   | Evidence required                              | What it can establish                                       |
| ----------------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| Managed installation    | Manifest and checksum verification             | The audited rules are the installed accepted revision       |
| Static implementation   | Changed code and repository checks             | Referenced tokens, components, and obvious code risks       |
| Rendered browser        | Screenshots plus computed geometry and styles  | Reflow, clipping, overflow, typography, and avatar geometry |
| Interaction             | Executed input and observed programmatic state | Navigation, disclosure, filtering, selection, and dialogs   |
| Accessibility semantics | Keyboard or accessibility-tree assertions      | Names, roles, states, focus movement, and relationships     |

Reports state which layers actually ran. Missing layers remain `pending` or `not-available`; static success never implies rendered or interaction success.

## Browser provider order

1. Use the Codex in-app browser when the host agent can execute and record the audit.
2. Reuse Playwright already installed in the target project.
3. Use Designome-managed Playwright only after explicit dependency authorization.
4. Fall back to a clearly labeled static-only audit.

The CLI does not silently install Playwright. `in-app-browser` means the host agent owns captures. `existing-playwright` means the project owns its runner and dependencies.

## Mechanical measurements

Normalized evidence supports the following implementation-level risks:

- document `scrollWidth` greater than `clientWidth`, while preserving explicit local scrollers;
- clipped or unavailable actions, labels, and statuses;
- avatars that lose square geometry, shrink in flexible rows, or fail to center fallback initials;
- browser console or page errors;
- executed interactions whose observable or programmatic result does not change;
- failed keyboard, focus, accessible-name, role, state, or relationship checks.

These are observed mechanical risks when the browser measurement actually ran. They are not screenshot-observed visual rules.

Typography bounds linked to accepted `observed` or `inferred` Design DNA tokens can produce design-deviation findings. A value linked only to a `proposed` token remains a calibration candidate. Without an accepted token, table-text and section-gap heuristics can propose a candidate but cannot fail the implementation.

## Interaction contracts

| Contract      | Minimum executed result                                            |
| ------------- | ------------------------------------------------------------------ |
| Navigation    | URL or location changes and the matching navigation item is active |
| Disclosure    | Content visibility and `aria-expanded` change together             |
| Filter/search | The collection changes, including a no-results case                |
| Selection     | Visual selection and programmatic selected or pressed state agree  |
| Modal         | Dialog opens, closes, traps appropriate focus, and returns focus   |
| Master-detail | Selecting an item updates the associated detail surface            |

The evidence artifact records expected and actual outcomes. Failed executed contracts are `observed` findings. Unexecuted contracts are not findings.

## Artifact ownership

- `.designome/audit.config.json` is project-owned and preserved after its first creation.
- `audit/plan.json` records routes, viewports, provider, and expected layers.
- `audit/evidence.json` records normalized captures and executed checks.
- `audit/findings.json` separates observed findings from proposed calibration candidates.
- `audit/report.md` summarizes evidence boundaries and counts.

Audit output is working evidence and should not be committed by default. Use a new output directory per independent run or pass `--overwrite` only when replacing a known audit run intentionally.

## Bounded repair mode

Repair requires `--mode repair --implementation-authorized`. The generated `repair-plan.json` contains only observed finding IDs, excludes proposed calibration candidates, limits the loop to one-to-three passes, and sets `designDnaMutationAllowed` to `false`. The agent applies the smallest implementation patch, runs target checks, and recaptures affected evidence. The loop stops on success, the configured pass limit, or a new authorization or product decision.

Managed Playwright remains a separate setup decision. `--browser-install-authorized` records an authorized proposal for `@playwright/test` and Chromium, but the audit command itself never edits dependencies or downloads a browser.
