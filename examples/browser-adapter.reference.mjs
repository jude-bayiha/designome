import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCaptureSession } from '../src/index.mjs';

export async function writeBrowserEvidence({
  plan,
  screenshotPath,
  outputPath,
  provider = 'in-app-browser',
}) {
  const route = plan.routes[0];
  const viewport = route.viewports[0];
  const session = createCaptureSession(plan, { outputPath, provider });

  await session.recordCapture({
    id: `capture.${route.id}.${viewport.name}`,
    routeId: route.id,
    viewport,
    scenario: route.scenarios[0],
    direction: route.directions[0],
    screenshotPath,
    document: {
      scrollWidth: viewport.width,
      clientWidth: viewport.width,
      scrollHeight: viewport.height,
      clientHeight: viewport.height,
    },
    elements: [
      {
        id: 'primary-action',
        role: 'action',
        visible: true,
        clipped: false,
        rect: { width: 120, height: 44 },
        accessibleName: 'Continue',
      },
    ],
    responsiveChecks: [
      {
        id: 'no-global-horizontal-overflow',
        expected: true,
        observed: true,
        passed: true,
      },
    ],
  });

  for (const flowId of route.flows) {
    await session.recordInteraction({
      id: flowId,
      flowId,
      routeId: route.id,
      kind: 'navigation',
      expected: 'The configured flow reaches its expected state.',
      observed: 'The browser reached the expected state.',
      passed: true,
      urlBefore: new URL(route.path, plan.baseUrl).toString(),
      urlAfter: new URL(route.path, plan.baseUrl).toString(),
      focus: {
        expectedReturnTarget: 'primary-action',
        observedReturnTarget: 'primary-action',
      },
    });
  }

  await session.recordAccessibilityCheck({
    id: 'primary-action-name-and-state',
    routeId: route.id,
    expected: 'The primary action exposes a button role and accessible name.',
    observed: 'The accessibility tree exposes button Continue.',
    passed: true,
    accessibleName: 'Continue',
    accessibleRole: 'button',
    accessibleState: { disabled: false },
  });

  for (const aspect of plan.perceptual.aspects) {
    await session.recordPerceptualObservation({
      id: `perceptual.${route.id}.${aspect}`,
      aspect,
      statement: `The host agent compared ${aspect} against the supplied source captures.`,
      epistemicStatus: 'observed',
      certainty: 0.8,
      result: 'passed',
      sourceCaptureRefs: plan.perceptual.sourceCaptures.map(
        (capture) => capture.id,
      ),
      targetCaptureRefs: [`capture.${route.id}.${viewport.name}`],
      limitations: ['Only the configured route and viewport were evaluated.'],
    });
  }

  return session.finalize();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [planPath, screenshotPath, outputPath] = process.argv.slice(2);
  if (!planPath || !screenshotPath || !outputPath) {
    throw new Error(
      'Usage: node examples/browser-adapter.reference.mjs <plan.json> <screenshot> <output.json>',
    );
  }
  const plan = JSON.parse(await fs.readFile(path.resolve(planPath), 'utf8'));
  const evidence = await writeBrowserEvidence({
    plan,
    screenshotPath: path.resolve(screenshotPath),
    outputPath: path.resolve(outputPath),
  });
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}
