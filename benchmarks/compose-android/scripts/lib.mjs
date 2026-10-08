import path from 'node:path';
import { fileURLToPath } from 'node:url';

export * from '../../shared/lib.mjs';

export const benchmarkRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

// Screen ids, in brief order; they match BenchmarkScreen in the scaffold contract.
export const screens = [
  'home',
  'spending',
  'bills',
  'bill-detail',
  'compare',
  'add-bill',
  'goals',
  'settings',
];
// A 412 × 915 dp phone at 2x density, as the capture test renders it.
export const capture = { widthDp: 412, heightDp: 915, density: 2 };
export const tile = {
  width: capture.widthDp * capture.density,
  height: capture.heightDp * capture.density,
};
// Gradle state and build output never count toward an app's hash.
export const hashIgnore = ['.gradle', '.kotlin', 'build'];
// Files a generator must not change; render.mjs restores them before capturing.
export const contractFiles = [
  'app/src/main/java/bench/tally/BenchmarkContract.kt',
  'app/src/test/java/bench/tally/BenchmarkCaptureTest.kt',
];
