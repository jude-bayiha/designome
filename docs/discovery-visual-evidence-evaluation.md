# Discovery and visual-evidence investigation

Evidence date: 2026-10-29. Baseline: `ffa00a9` on `origin/main`. The consumer
repository was inspected read-only. No consumer UI, skill, DNA, overrides or
private images were installed, modified or committed. Fixtures use synthetic
content. Local raw evidence is under `/tmp/designome-evidence-20261029/`; it is
intentionally excluded from Git and requires separate retention by its owner.

## Causes and boundaries

| Status     | Classification                   | Evidence and consequence                                                                                                                                                                                                                                                                                                   |
| ---------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `observed` | Incorrect discovery              | Baseline installation planning at the workspace root with the explicit nested CSS entry selected Tailwind and `uiKit.status: not-detected`, despite the frontend's components.json. Baseline audit selected static; doctor reported existing Playwright unavailable.                                                       |
| `observed` | Obsolete installation ruled out  | Consumer and main bundle fingerprints were identical: `3698ab3fdb1ff740f3a4cf0ad2a92e4c264e7031b90fa128bee0d524c05febd1`.                                                                                                                                                                                                  |
| `observed` | Installation integrity only      | All 61 managed artifacts verified; readiness reported five qualities, seven pending calibrations and `visualFidelity: not-established`. All eleven tokens were relationships. No exact CSS values were fabricated.                                                                                                         |
| `observed` | Component implementation history | Consumer commit `7fc46c5` already included components.json and Base UI/shadcn declarations, but no UI source-component directory. Commit `cfa19df` subsequently added the source library components and replaced the custom implementation. A configuration is not proof that a reusable source component already existed. |
| `inferred` | Model judgment contributed       | Root-only detection can explain a missed library context, but cannot by itself explain the initial component choice. The model also had explicit library expectations and later implemented the library. No complete historical model trace was used to attribute a unique cause.                                          |
| `observed` | Missing visual execution         | Consumer tests capture images, check overflow, navigation, fonts and selected geometry. They do not execute a region-by-region perceptual verdict or compare rendered relief and optical density. Capturing a file and attaching a source hash do not establish fidelity.                                                  |
| `observed` | Responsive drift mechanism       | Consumer CSS changes root type to 0.89vw at min-width 1800px while its sidebar remains fixed. The real-browser synthetic regression below reproduces the dependent row-height drift. It does not claim fresh consumer runtime measurements.                                                                                |
| `observed` | Corrected request attribution    | The user clarified that they asked to reduce the sidebar; the model selected 220px. The consumer documentation's claim of an explicit 220px user decision is therefore not authoritative. C059 remains an explicit font substitution. No consumer value was arbitrarily reset.                                             |
| `observed` | Existing mechanisms reused       | Managed Playwright already reported provider-unavailable. Benchmark packets, source hashes, independent contexts and four audit layers already existed; the changes extend these mechanisms.                                                                                                                               |

The install root was appropriate for root-level DNA and docs. Its nested CSS entry
should have selected the frontend's technical context. Requiring the user to move
DNA into that app would hide the discovery defect rather than fix it.

## Implemented behavior

Discovery resolves declared workspaces, the selected frontend and shared UI
packages; inventories JSONC aliases, exports, imports, component paths and theme
entries; and preserves target ambiguity. Installation projects concrete reuse
paths to agent guidance and the integration dossier, without library resets.
Discovery remains bounded and technical; dynamic import semantics, custom bundler
resolution and deep config inheritance may still require host review.

Provider inventory separates declarations, resolvability, configuration,
executable presence, navigation and capture success. The existing capture session
accepts a real authorized Playwright page, waits for defined readiness and captures
actual geometry, styles, platform fonts, console observations, scale and hashes.
No consumer dependency or browser is installed. Managed setup remains optional
and unavailable until separately supplied; native rendering is not forced to web.

New audit plans require [regional evidence](audit-contract.md). Unsupported model
verdicts become incomplete, and perceptual findings retain model certainty and
limitations. Source images referenced by a complete regional review are rehashed.
The completeness gate checks records, not how carefully a model looked: image
opening and context independence remain host assertions rather than certification.

[Draft calibration](fidelity-benchmark.md) is executable through
`calibration-prepare`, with existing benchmark packets and evaluator. It produces
no acceptance or installation. The context compiler and specialized prompts carry
these boundaries through synthesis, integration and audit.

## Browser distribution regression

The test builds the standalone bundle, installs it twice through pinned
`skills add`, imports its copied runtime, installs synthetic DNA twice, discovers
a nested frontend and executes Chromium 156.0.8078.4 captures with Playwright 1.64.1. The Playwright
package is linked only in that frontend, modeling pnpm workspace-local resolution.
A loopback fixture server, actual browser and installed adapter are used; this is
not a mock browser or a checkout-only CLI test. Separate permission-bound tests
also deny the installed CLI access to the development checkout.

| Viewport width | Drift fixture root type | Drift row height | Corrected fixture row height | Sidebar |
| -------------: | ----------------------: | ---------------: | ---------------------------: | ------: |
|         1799px |                    13px |             39px |                         39px |   220px |
|         1800px |                 16.02px |      48.046875px |                         39px |   220px |
|         1801px |               16.0289px |      48.078125px |                         39px |   220px |
|         1920px |                17.088px |          51.25px |                         39px |   220px |

Status: `observed` in synthetic browser captures. These exact values belong to
the test fixture, not to an accepted source-derived calibration. A synthetic
accepted 38–40px row constraint fails after the breakpoint and passes after the
fixture correction. The sidebar value is a test choice, not a user-approved
requirement or a Designome recommendation. The recorded period-change interaction
passes in both cases. The perceptual layer remains incomplete; correcting geometry
does not prove optical density or elevation.

The same test refuses premature capture for a pending chart or FontFace, checks
actual font inspection, and retains immutable screenshots. Runtime regressions
cover simple and nested projects, shared UI with and without shadcn, nonstandard
aliases, exports, multiple frontend ambiguity, config-only Playwright, missing
packages/browsers, declaration without use, override preservation, second-install
idempotence, changed managed files and changed original source hashes.

## Independent transfer experiment

A diagnostic draft copy of the consumer DNA was prepared outside the consumer;
its original acceptance and all seven pending calibrations stayed unchanged. Two
separate generator contexts received only their own immutable brief/dossier packet.
A third context that generated neither implementation opened the original source
and all four actual captures, including alternate long-content states. The public
source's promotional surround was excluded. Generated content concerned different
products; no source branding, assets, names or data were required.

- Plan fingerprint: `48304ae91b8c7941728d288a6b5ad25112b98b11ebbdae6d06e98e4ffb8bc7dd`.
- Source SHA-256: `c64aaa73bcbb70b7296f7fadd93c3a15631117335b19a9b8663223e7f9b0df89`.
- Repetition 1 capture SHA-256: `6ca23e384729b7a02db63bb47c9cd3fcfcbd6377e792be59986f2e169b8af522`.
- Repetition 2 capture SHA-256: `d410c27f34649c2acac046bd691ca8e7e3c40b0b3d7bb52819962f19a4ba7207`.

The installed standalone runtime evaluated this evidence as **failed** for both
repetitions. Status: `observed` evaluator output. The independent review identified
full dashboards despite the requested small board, and typography judged too
compact. It recorded several transferred surface/component relationships, while
content resilience remained incomplete beyond the executed alternate states.
These are scoped model judgments, not objective aesthetic measurements. All seven
constraints remain calibration diagnostics. No threshold, mask, accepted baseline
or DNA mutation was used to obtain a pass.

The run exposes both usable grammar and continuing model errors. Relationship-only
CSS is not automatically defective, but these typography/scope failures prevent
claiming that the rules have been fully proved applicable. Revisions need a new
draft/packet experiment and explicit human review. This was a forward render test
of the existing extracted grammar and the added calibration path, not a fresh
thirteen-axis extraction or proof of all source families, libraries or native UIs.

## Consumer skill update procedure

This procedure was not executed on the read-only consumer. No release is needed
for reviewing the PR branch.

1. Preserve local skill changes and user-owned overrides; record the current
   bundle fingerprint, accepted DNA hash and installation manifest. Do not change
   acceptance or convert pending calibrations to accepted values.
2. Install only the reviewed Designome skill revision with the normal pinned
   `skills add` workflow. Before merge, use the PR branch URL or a checkout of its
   exact head; after merge, use main. Keep the host selection and copy mode.
3. Run the copied runtime's `discover --project <workspace-root>` and `doctor`.
   Verify the nested app, configured shared components and test cwd. Use the actual
   nested `--css-entry` in the install dry-run; an audit can explicitly set its
   user-owned `frontend` field when several apps exist.
4. Review the dry-run with the original accepted DNA and integration policy.
   Modified managed files are conflicts, never overwritten. Only an already
   authorized install may proceed; retain `designome.overrides.css` byte-for-byte.
5. Run `verify-install`, then an identical install requiring zero creates, updates
   or deletes. This establishes installation integrity only.
6. Regenerate the audit plan and recapture with the current adapter. Open original
   and new images by applicable region, record the real request versus chosen
   sidebar width, C059 consequences, breakpoint probes and unresolved mismatches.
   Older screenshots or a green interaction suite cannot establish the new review.
7. Run a small draft calibration probe when rules remain ambiguous. Preserve
   immutable packets and independent review; present its failures and limitations
   before any human acceptance decision.

Validation commands: `pnpm test:browser`, `pnpm check`, `git diff --check`. Browser
prerequisites are explicit in [browser execution](browser-evidence.md). Hosted CI
and consumer/deployed runtime verification are separate evidence; no consumer
build, UI test rerun or deployed visual pass is claimed here.

Local final gate: `pnpm check` passed all 88 tests with no skips, including
formatting, Markdown/schema validation, bundle consistency, permission-bound
installation tests and the real browser regression. This technical pass does not
change the separate failed transfer-benchmark verdict or pending calibrations.
