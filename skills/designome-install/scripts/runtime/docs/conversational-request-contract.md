# Conversational request contract

Designome skills accept ordinary conversational instructions. The host agent interprets that language once and serializes it as `request-contract.json`; the deterministic runtime validates the contract and executes only its bounded values. Downstream prompts consume the normalized contract instead of repeatedly reinterpreting the chat.

Request contract v1.1 is shared by `designome-extract`, `designome-install`, and `designome-audit`. It records the active matrix version, operation, summary, constraints, ambiguities, ignored fragments, and operation-specific parameters. It never turns vague language into a path, evidence scope, design claim, target write, implementation repair, dependency installation, or human acceptance.

## Interpretation states

- `ready`: every material decision for the bounded operation is resolved.
- `partial`: safe work can continue, but optional or destination-specific intent remains ambiguous.
- `blocked`: a missing or contradictory decision changes the operation, path, hard evidence boundary, or authorization.

Meaningless fragments belong in `ignoredFragments`. They do not block otherwise safe work and never become a use case, selector, claim, or permission. For example, `for a corporate website` is a usable target-use-case phrase; `jjjggjgmsmssnfndndndnsnddjdjd` is not.

## Target use case and source compatibility

An extraction request may carry one optional natural-language target use case and one adaptation mode:

- `direct` allows destination-specific accuracy claims only when representative source families match the destination;
- `adapt` allows an explicit cross-surface transfer, but every destination behavior or pattern absent from matching references remains `proposed` and requires a forward test.

The source-evidence stage classifies each screenshot as `website`, `web-app`, `mobile-app`, `desktop-app`, `other`, or `unknown`, with an optional archetype, confidence, basis, and limitations. Classification is evidence-backed:

- a dashboard-shaped web-app capture does not establish a corporate marketing/editorial architecture;
- a narrow screenshot may suggest a mobile interface, but dimensions alone do not establish native mobile, responsive web, or WebView;
- a mobile-native destination needs representative mobile-app captures for direct fidelity;
- a corporate website destination needs representative corporate/marketing website captures for direct fidelity.

A mismatch does not discard all evidence. A dashboard can still contribute its explicitly routed KPI, chart, table, card, control, color, typography, or surface grammar. The compatibility report identifies what matches, what can be reused only by subject, and which destination references are missing.

## Global focus and per-source routing

Global extraction focus uses:

- `focusAxisRefs` for specialist axes;
- `focusUiDomainRefs` for recognizable interface parts.

Every source then declares:

- `axisRefs`;
- `conceptRefs`;
- `uiDomainRefs`;
- `tokenCategories`;
- `ruleCategories`;
- one evidence mode.

The evidence modes are:

- `all`: use the capture for every visibly supported subject;
- `only`: use it exclusively for the selected axes, concepts, domains, token categories, or rule categories;
- `prefer`: prioritize it for selected subjects without excluding other visibly supported use;
- `exclude`: prohibit it from supporting selected subjects.

`only` and `exclude` are hard admission constraints. They cannot make an absent property observable. Conflicting admitted sources remain a conflict; the system does not average them silently.

This conversational instruction is valid:

```text
$designome-extract capture-1.png capture-2.png capture-3.png for a corporate website.
Use capture-1.png and capture-2.png only for statistics and charts.
Use capture-3.png only for the theme, colors, borders, and elevation.
```

The host can normalize it to:

- target use case: corporate website;
- direct or adapt mode according to the user's words;
- capture 1 and 2: `only`, routed to `axis.data-display-visualization`, `domain.stats-kpis`, `domain.charts-data-visualization`, and data-display/visualization categories;
- capture 3: `only`, routed to `axis.color-surface-identity` and the requested token/rule categories.

If the captures are dashboard-only and mode is `direct`, the compatibility result must explicitly request representative corporate website references before promising corporate-site accuracy. The scoped KPI and theme grammar remains usable.

## UI-domain vocabulary

The 20 canonical UI domains cover:

- application shell/navigation and marketing/editorial content;
- actions/controls, forms/data entry, search/filter/sort;
- tables/lists, cards/collections, statistics/KPIs, charts/visualization, status/progress;
- overlays/disclosure, media/galleries, messaging/notifications;
- calendars/timelines, maps/spatial UI, commerce/transactions;
- authentication/onboarding, settings/configuration;
- mobile-native shell and files/content management.

Ordinary language is mapped to these stable IDs. A screenshot may support several domains, and the host should route visible regions rather than classifying the whole image as one monolithic type.

## Validation and fingerprinting

Validate before visual analysis:

```bash
designome validate-request \
  --file /absolute/request-contract.json \
  --operation extract
```

Initialization copies the validated contract into the run and fingerprints it with source hashes, motion mode, target path, matrix version, and tool version:

```bash
designome init-run \
  --output /absolute/run-directory \
  --request /absolute/request-contract.json \
  --image /absolute/dashboard-1.png \
  --image /absolute/theme.png
```

Changing a source path, normalized request, motion mode, target, matrix, or tool version while reusing the run fails instead of silently changing the evidence boundary. Runtime migration accepts legacy request contract v1.0 and materializes empty v1.1 axis/domain routing fields, but new artifacts must use v1.1.

## Installation authorization

An install contract records:

- exact target-project and accepted Design DNA paths;
- whether target writes are explicitly authorized;
- CSS entry and scope;
- documentation directory;
- existing-rule paths and precedence;
- styling strategy and UI-kit preference.

The skill always runs `doctor` and a dry-run first. It stops after preview when `writesAuthorized` is false. A target path or styling preference inferred from ambiguous language never authorizes mutation.

## Audit focus and authorization

An audit contract records:

- exact project and optional Design DNA paths;
- focus axes, concepts, and UI domains;
- provider and report/repair mode;
- independent implementation and browser-install authorizations.

Repair requires `implementationAuthorized: true`. Managed browser setup requires `browserInstallAuthorized: true`. Ambiguous conversation sets neither. Audit focus narrows inspection; it does not erase applicable coverage, exceptions, or stress cases.

The skills pass the validated contract to the matching runtime command. The runtime checks the contract against execution inputs before any bounded operation.
