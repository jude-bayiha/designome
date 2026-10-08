# Executed UI fidelity evaluation

Evaluation recorded on 2026-09-08 for Fidelity Contract 1.0.0 and documentation layout 2.1.0. This is a scoped host-agent experiment, not a universal quality score or an acceptance of its draft DNA.

**Observed:** polished output did not reliably preserve the distinctive source details. Across 20 default reconstructions, the final evaluation recorded 15 failed runs and five incomplete runs; none passed the full benchmark. Five defaults satisfied all seven static visual aspects, but lacked content-resilience evidence. The two grammar-transfer runs are included in those five; they have no exact source counterpart.

**Inferred:** a component library can help implementation consistency, but the tested libraries did not repair missing collection density, altered content semantics or simplified KPI/chart anatomy. The quality of extraction, its faithful application, library theming and actual browser rendering all matter.

## Corpus and isolation

The host analyzed five supplied screenshots across three visual identities. Separate draft DNA documents kept the identities apart. Two generator contexts received only a brief and the projected 52 Markdown documents. A separate reviewer compared the supplied references with actual browser captures. Generators did not receive screenshots, source paths, raw DNA, sibling output or review findings as design input. Neutral library scaffolding and official API documentation were permitted technical inputs.

| Source group                         | Scoped tasks                                                                         | Default runs | Additional content captures |
| ------------------------------------ | ------------------------------------------------------------------------------------ | -----------: | --------------------------: |
| Learning workspace, three references | Course detail, learner analytics, assignment workflow, new-content course transfer   |            8 |                           0 |
| Company table, one reference         | Table structure, navigation, columns and density; three implementations              |            6 |                           4 |
| Traffic dashboard, one reference     | Upper sidebar, KPI row, Analytics card and channel comparison; three implementations |            6 |                           4 |
| Total                                | Five declared case families; two repetitions per implementation/case                 |           20 |                           8 |

The learning cases used HTML/CSS. The supplemental table and dashboard used HTML/CSS, React with actual shadcn/ui components, and React with actual Material UI components. Both library builds passed. Component imports, theme adaptations and lockfiles were recorded; these were actual library implementations, not HTML with library-like styling. There was no additional MUI installer integration in the Designome runtime.

| Dependency                          | Installed version / configuration |
| ----------------------------------- | --------------------------------- |
| React / React DOM                   | 19.2.8                            |
| shadcn CLI / registry configuration | 4.16.0; Radix Nova, Radix base    |
| Radix UI                            | 1.6.7                             |
| Tailwind CSS                        | 4.3.3                             |
| Lucide React                        | 1.27.0                            |
| Material UI                         | 9.3.1                             |
| Emotion React / Styled              | 11.14.0 / 11.14.1                 |

These versions describe the installed experiment, not a recommendation to upgrade a target project. The runtime required matching dependency metadata, complete build-directory hashes, native capture dimensions, source hashes, packet hashes and independent generator/reviewer identities.

## Results

The following counts are reviewer observations for the seven static visual aspects, within each case's declared scope. They are not percentages of pixel accuracy or complete benchmark passes. Content resilience is a separate eighth aspect. Visual finish grades did not raise fidelity grades.

| Case                    | Implementation | Repetition 1 | Repetition 2 | Content resilience                             |
| ----------------------- | -------------- | ------------ | ------------ | ---------------------------------------------- |
| Course detail           | HTML/CSS       | 2/7          | 7/7          | Incomplete: no alternate-content capture       |
| Learner analytics       | HTML/CSS       | 2/7          | 7/7          | Incomplete: no alternate-content capture       |
| Assignment workflow     | HTML/CSS       | 4/7          | 7/7          | Incomplete: no alternate-content capture       |
| Course grammar transfer | HTML/CSS       | 7/7          | 7/7          | Incomplete; no exact reference for new content |
| Company table           | HTML/CSS       | 1/7          | 1/7          | Incomplete: no alternate-content capture       |
| Company table           | shadcn/ui      | 1/7          | 1/7          | Incomplete: matched scroll access unverified   |
| Company table           | MUI            | 1/7          | 1/7          | Incomplete: matched scroll access unverified   |
| Traffic dashboard       | HTML/CSS       | 5/7          | 5/7          | Incomplete: no alternate-content capture       |
| Traffic dashboard       | shadcn/ui      | 4/7          | 4/7          | Failed on executed extreme-content cases       |
| Traffic dashboard       | MUI            | 5/7          | 5/7          | Failed on executed extreme-content cases       |

**Observed — collection density:** all table implementations reduced the source's long populated collection to four or five rows and simplified its navigation and company marks. Primary-action and selection accents also differed. The source-only inventory check identified 16 fully visible rows plus one cropped row; this count describes the screenshot and does not prove total data volume. A shallow generic table did not reproduce that occupied-space relationship.

**Observed — component anatomy:** dashboard outputs preserved the broad upper-card arrangement but changed KPI delta/period placement and replaced the channel card's segmented marks and table structure with a continuous stacked bar and simplified rows. Library defaults also introduced discrepancies such as a black primary action or excessive outlines. Matching broad layout and familiar controls was insufficient to establish source-specific fidelity.

**Observed — semantic color:** every supplemental dashboard implementation swapped the source's Invalid-orange and Referral-yellow series mapping. Reusing the same purple, orange and yellow swatches therefore did not preserve the source's visual meaning.

**Observed — generation variation:** the same learning dossier produced substantial omissions in the first context and closer scoped reconstruction in the second. The first table generator also substituted revenue and employee-count columns even though the dossier documented funding and creation-date semantics. The evidence therefore does not attribute every failure to missing extraction detail: a generator can also fail to apply available guidance.

**Observed — finish versus fidelity:** 17 default renders received a strong finish grade and three a mixed grade. These subjective visual grades coexist with source-fidelity failures. They do not establish interaction quality, accessibility or production readiness.

**Observed — content pressure:** all four library dashboard stress cases showed materially disrupted KPI/channel hierarchy under long labels and extreme values. The four library table stress cases remain incomplete: bounded wrapping or horizontal scrolling is not itself a failure, and access to continued columns was not verified at the matched capture viewport. HTML/CSS runs had no alternate-content capture and cannot pass resilience by comparison with a library's stress result.

**Observed — calibration:** 71 browser measurements were recorded for supplemental default renders. Some reconstructions met five or six numerical proposals while still failing visual aspects. All private calibration constraints remained pending and diagnostic. Missing learning-workspace measurements remained incomplete. No numerical proposal became an observed source fact or an accepted installation value.

## Controls, corrections and limits

- **Observed:** the initial generic sans-serif stack in one learning generation resolved to the host's installed serif face, TT Marxiana Trial Elzevir. The source-blind generator changed only that technical fallback to Arial/Helvetica and preserved its original output. The final comparison used corrected captures; early captures and pre-correction review were retained privately.
- **Observed:** final native captures were 1024×768, 1440×1024 or 1440×1080, as planned. At the recorded browser scale of approximately 0.99, their CSS viewports were respectively 1034×775, 1454×1034 and 1454×1090. Comparison uses the declared product-region scope and does not establish source CSS dimensions or pixel-exact recovery. Earlier captures at a different scale were excluded.
- **Observed:** all 28 canonical captures were nonblank, with no recorded browser warning/error entries. Measurements came from separate semantic DOM probes, not screenshot pixel analysis. A later scroll probe at a different scale was excluded from conclusions about matched-condition access.
- **Observed:** reviewer passes were challenged where their statements established generic polish without a source-specific comparison. Earlier reviews were retained; the final findings account for semantic accents, KPI/channel anatomy and series-role consistency. This revision exposes review sensitivity rather than concealing it.
- **Unknown:** model-level independence, undisclosed model/runtime settings and repeatability on other hosts are not established. Isolation used separate agent contexts and declared access discipline, not an OS sandbox. The same generator contexts continued across cases and library conditions, so context carryover is a confound. The HTML/CSS baseline and React library builds also differ in framework. This is not a randomized library trial or a human rating panel.
- **Unknown:** responsive behavior, keyboard and screen-reader access, source interactions, map behavior, motion, native mobile and unrelated page families remain outside the executed evidence. Extreme percentages test visual pressure, not plausible domain data.

## Changes informed by the experiment

The implemented P0–P2 work adds nonempty routed coverage gates, independent component assertions, preserved token relationships, complete domain recipes, prioritized visual qualities, pending calibration bounds and repeated documentation-only benchmarking. The [contract](fidelity-contract.md) and [workflow](fidelity-benchmark.md) describe the deterministic behavior and compatibility boundaries.

The final prompt refinements request visible table inventory and occupancy, preserve content semantics, describe typography character and actual font fallback checks, and require source-derived theme mapping instead of silent library defaults. A source-only forward check on the two supplemental screenshots produced 22 schema-valid claim candidates for the revised shared, spatial, typography, component and synthesis instructions. A further table-inventory check produced five schema-valid claims with canonical concept routing.

**Observed:** these focused forward checks exercised the refined instructions and retained explicit limits. **Unknown:** they do not demonstrate a new full extraction, regeneration and visual pass after those refinements. Frozen benchmark DNA, packets and generations were not rewritten to improve the reported results. All benchmark DNA remains draft.

**Observed:** projecting the three frozen DNA documents again with the final runtime preserved all 52 documents' contents apart from the claim label changing from `Status` to `Epistemic status`. The benchmark's source guidance was therefore unchanged by the final projection fixes; the original packets remain intact.

**Proposed next validation:** regenerate the table and KPI/channel cases from a new frozen extraction with explicit source inventories and series-role mappings, then rerun the same library conditions and matched content-access probes. This proposal is not counted as executed evidence.

## Private evidence linkage

Screenshots, raw DNA, generated target applications, browser captures and detailed private review files are intentionally excluded from the repository. The private experiment contains five plans, evidence files and evaluated reports, plus generation manifests, capture metadata and preserved review revisions. The following fingerprints identify those plans without publishing local paths or image contents.

| Plan                         | SHA-256 fingerprint                                                |
| ---------------------------- | ------------------------------------------------------------------ |
| Learning workspace           | `dd0ac1b4034ed7bbb98ed7c19617830b095f810ccd3688867710cd99fc19f61a` |
| Company table, HTML/CSS      | `a6dd76160393fa9082783e4ecf52dd32b9a247927f366e1264e1eb0e844ac399` |
| Traffic dashboard, HTML/CSS  | `391addce1a44ab3775896866c5b43c12c0b2a5cdea00b725f5a6a179a38742e2` |
| Company table, libraries     | `b1e211cbed6593ce33fbec9871ff5815902281281da21cc78b30a0feff0d9a43` |
| Traffic dashboard, libraries | `52fb1d34e837bfdf5481976f30e2aa7117b0e4f03bd1c02504aad9783f2bc895` |

Repository tests use synthetic artifacts to check contracts and integrity. They are separate from the executed browser experiment and cannot substitute for its private visual evidence.
