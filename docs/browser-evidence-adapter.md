# Browser evidence adapter 1.0

The official `designome/audit` export removes manual assembly of `audit-evidence.json`. It is a normalization boundary, not a browser driver.

## Contract

The runtime writes `audit/plan.json`. The host agent uses its actual browser controller and records observations through the adapter:

```js
import { createCaptureSession } from 'designome/audit';

const session = createCaptureSession(plan, {
  provider: 'in-app-browser',
  outputPath: 'audit/external-evidence.json',
});

await session.recordCapture(capture);
await session.recordInteraction(interaction);
await session.recordConsoleMessage(consoleMessage);
await session.recordAccessibilityCheck(accessibilityCheck);
await session.recordPerceptualObservation(perceptualObservation);
await session.finalize();
```

`finalize()` validates plan routes, viewports, scenarios, LTR or RTL direction, configured flows, screenshot existence, document dimensions, element geometry and visibility, console severity, interaction outcomes, accessible names and states, focus metadata, and host-agent perceptual provenance. It normalizes and writes evidence schema `1.0.0`.

The complete runnable example is `examples/browser-adapter.reference.mjs`.

## Coverage and errors

The adapter derives expected coverage from the capture plan. Missing route, viewport, scenario, direction, or interaction coverage raises `INCOMPLETE_AUDIT_EVIDENCE` and does not finalize by default. A host may call `finalize({ allowIncomplete: true })` only when it intentionally wants the audit report to record an `incomplete` result.

Other stable errors include:

- `CAPTURE_ROUTE_NOT_PLANNED`
- `CAPTURE_VIEWPORT_NOT_PLANNED`
- `CAPTURE_SCENARIO_NOT_PLANNED`
- `CAPTURE_DIRECTION_NOT_PLANNED`
- `CAPTURE_SCREENSHOT_MISSING`
- `PERCEPTUAL_ASPECT_NOT_PLANNED`
- `INVALID_CAPTURE_OBSERVATION`
- `INCOMPATIBLE_AUDIT_EVIDENCE_VERSION`
- `AUDIT_EVIDENCE_PROVIDER_MISMATCH`
- `AUDIT_EVIDENCE_PLAN_MISMATCH`

Evidence `0.1.0` remains accepted by the CLI through an explicit in-memory migration to `1.0.0`. Unknown versions fail closed.

## Perceptual observations

Perceptual comparison is performed by the host agent. Each observation records one planned aspect, source and target capture references, Design DNA rule or token references, exactly one epistemic status, certainty from zero to one, result, evaluator provenance, and limitations. The runtime stores and reports these observations but never describes them as deterministic.
