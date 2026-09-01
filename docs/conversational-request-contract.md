# Conversational request contract

Designome skills accept ordinary conversational instructions, but the deterministic runtime never interprets natural language. The host agent normalizes each request once into `request-contract.json`; the runtime validates that artifact against [`request-contract.schema.json`](../schemas/request-contract.schema.json) and refuses mismatched execution inputs.

The contract is shared by `designome-extract`, `designome-install`, and `designome-audit`. It records the operation, a concise normalized summary, constraints, ambiguities, ignored fragments, and operation-specific parameters. It does not silently turn vague language into a path, scope, design claim, repair authorization, dependency authorization, or target write.

## Interpretation states

- `ready`: every material choice needed for the bounded operation is resolved.
- `partial`: safe work can continue, but optional or destination-specific intent remains ambiguous.
- `blocked`: a missing or contradictory choice changes the operation, target, evidence boundary, or authorization.

Meaningless fragments are recorded under `ignoredFragments`. They do not block otherwise safe work and never become a use case, evidence selector, design claim, or permission.

## Extraction intent and compatibility

An extraction request may include a target use case and one of two adaptation modes:

- `direct` requires reference evidence that matches the requested destination before Designome claims destination-specific accuracy;
- `adapt` permits an explicit cross-surface transfer, but every destination pattern absent from the references remains `proposed` and requires a forward test.

The host agent infers likely source surfaces and page families from the screenshots with evidence, confidence, and limitations. A narrow screenshot may support an inferred mobile interface, but it does not by itself prove native mobile, responsive web, or a WebView. The source-evidence stage writes `compatibility-report.json` with matching coverage and the exact missing references.

## Per-source evidence routing

Every extraction source declares one evidence mode:

- `all`: use the capture for every visibly supported subject;
- `only`: use it only for the selected concepts and token or rule categories;
- `prefer`: prioritize it for the selected subjects without excluding other admissible evidence;
- `exclude`: prohibit it from supporting the selected subjects.

`only` and `exclude` are hard constraints. A directive controls evidence admission; it cannot make an absent property observable. Conflicting admitted sources remain a conflict instead of being averaged silently.

For example, a conversational request may say:

```text
Use $designome-extract for a corporate website.
Use dashboard-1.png and dashboard-2.png only for statistics and charts.
Use theme.png only for colors, borders, and elevation.
```

The host maps ordinary terms to canonical matrix concepts and Design DNA token or rule categories. It then validates the resulting contract:

```bash
designome validate-request \
  --file /absolute/request-contract.json \
  --operation extract
```

Initialization copies the validated contract into the run and fingerprints it with the screenshot inputs:

```bash
designome init-run \
  --output /absolute/run-directory \
  --request /absolute/request-contract.json \
  --image /absolute/dashboard-1.png \
  --image /absolute/theme.png
```

Changing a source path, motion mode, or normalized request while reusing the same run fails instead of mutating the evidence boundary silently.

## Installation and audit authorization

An install contract records the exact project and accepted Design DNA paths, integration preferences, constraints, and whether writes were explicitly requested. The skill always performs a dry-run first. It stops after the preview when `writesAuthorized` is false.

An audit contract records its focus concepts, provider, `report` or `repair` mode, and independent implementation and browser-install authorizations. Repair requires `implementationAuthorized: true`. Managed browser installation requires `browserInstallAuthorized: true`. Ambiguous conversation sets neither value.

The skills pass the validated contract to the matching runtime command. The runtime checks bounded execution values against it before performing the operation.
