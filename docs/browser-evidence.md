# Executable browser evidence

Prefer an environment-authorized browser. For a project Playwright page, import
`createCaptureSession` and `capturePlaywrightPage` from the distributed runtime's
`src/index.mjs`. Reuse the project's fixtures, configuration, browser/channel,
server, scenario setup and test cwd. Discovery reports paths but does not execute
configuration or arbitrary start commands. If needed, `launchProjectPlaywright`
launches the selected app's resolvable Chromium; it never installs a package or
browser. Launch success and server navigation are distinct from executable-file
existence. Other authorized browser providers can use `recordCapture` directly.

```js
const session = createCaptureSession(plan);
const capture = await capturePlaywrightPage(session, page, {
  id: 'overview-ready',
  routeId: 'overview',
  viewport: { width: 1440, height: 1000 },
  screenshotPath: 'evidence/new-run/overview.png',
  navigate: true,
  readiness: {
    selectors: ['main[data-loaded="true"]', '[data-chart-ready="true"]'],
    fonts: ['400 13px "Project Sans"', '600 13px "Project Sans"'],
  },
  elements: [{ id: 'row', role: 'data-row', selector: 'tbody tr:first-child' }],
});
await session.finalize({ outputPath: 'evidence.json', allowIncomplete: true });
```

Selectors must resolve uniquely and become visible. Readiness can instead live
on the route in audit config. The host defines meaningful completion signals for
charts and async data; neither network idle nor stable geometry proves their
completion. Native apps use their authorized renderer and capture tools instead.
Non-default scenarios must be established by the host before capture; the helper
refuses automatic navigation that would silently reset them.

The adapter waits for document/font readiness, requested font probes, decoded
image dimensions and geometry stable across animation frames. A timeout produces
no recorded capture. It records CSS viewport, image dimensions/hash, device scale,
scenario, direction, URL, rendered geometry and styles, loaded font faces and,
where supported by Chromium CDP, actual used font faces. A computed font-family
stack alone never establishes the rendered face. Browser errors during the call
are recorded; earlier navigation and interaction errors require host recording.
`document.fonts.check` does not prove that every requested weight has a distinct
font file: inspect loaded and actual faces for synthesized weights.

Existing output paths are refused. Use a new run directory, never overwrite a
baseline or approve current pixels automatically. Optional `measurements` bind
`selector`, `metric`, `target`, `property`, `unit: 'px'` and the planned measurement
`checkRef`; lengths use px and ratios require both roles from the same capture.
Pending calibrations remain diagnostic. Geometric measurements cannot establish
optical density, relief or aesthetic quality.

Repository browser tests use an explicit development-only Playwright dependency.
Install its browser with `pnpm exec playwright install chromium`, then run
`pnpm test:browser` or `pnpm check`. CI installs browser/system prerequisites
explicitly. No consumer installation is triggered by discovery or audit.
