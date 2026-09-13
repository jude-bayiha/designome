import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCaptureSession } from '../src/index.mjs';

export async function writeBrowserEvidence({
  plan,
  screenshotPath,
  outputPath,
  provider = 'in-app-browser',
  capture = null,
  interactions = [],
  accessibilityChecks = [],
  perceptualObservations = [],
  fidelityMeasurements = [],
  allowIncomplete = true,
}) {
  const route = plan.routes[0];
  const viewport = route.viewports[0];
  const session = createCaptureSession(plan, { outputPath, provider });

  if (capture) {
    await session.recordCapture({
      ...capture,
      id: capture.id ?? `capture.${route.id}.${viewport.name}`,
      routeId: route.id,
      viewport: capture.viewport ?? viewport,
      scenario: capture.scenario ?? route.scenarios[0],
      direction: capture.direction ?? route.directions[0],
      screenshotPath,
    });
  }
  for (const interaction of interactions)
    await session.recordInteraction({
      ...interaction,
      routeId: interaction.routeId ?? route.id,
    });
  for (const check of accessibilityChecks)
    await session.recordAccessibilityCheck({
      ...check,
      routeId: check.routeId ?? route.id,
    });
  for (const observation of perceptualObservations)
    await session.recordPerceptualObservation(observation);
  for (const measurement of fidelityMeasurements)
    await session.recordFidelityMeasurement(measurement);

  return session.finalize({ allowIncomplete });
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
