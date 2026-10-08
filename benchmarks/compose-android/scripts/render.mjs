// Build every generated app and capture each screen on the JVM with Robolectric and Roborazzi.
// Usage: node render.mjs --work <dir> [--run <id>]...
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  capture,
  contractFiles,
  exists,
  parseArgs,
  required,
  screens,
  sha256File,
  writeJson,
} from './lib.mjs';

const options = parseArgs(process.argv.slice(2), { lists: ['run'] });
const work = path.resolve(required(options, 'work'));
const scaffold = path.join(work, 'scaffold');
const runsDirectory = path.join(work, 'runs');
const runIds =
  options.run ??
  (await fs.readdir(runsDirectory)).filter((id) => !id.startsWith('.'));

function gradle(app, args) {
  return spawnSync('./gradlew', ['--console=plain', ...args], {
    cwd: app,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

for (const runId of runIds.sort()) {
  const app = path.join(runsDirectory, runId, 'app');
  if (!(await exists(app))) continue;
  const output = path.join(work, 'captures', runId);
  if (await exists(output)) {
    console.log(`${runId}: captures exist, skipped`);
    continue;
  }
  await fs.mkdir(output, { recursive: true });

  // The capture harness is part of the benchmark, not of the generated app.
  const restored = [];
  for (const file of contractFiles) {
    const original = path.join(scaffold, file);
    const generated = path.join(app, file);
    if (
      !(await exists(generated)) ||
      (await sha256File(generated)) !== (await sha256File(original))
    ) {
      await fs.mkdir(path.dirname(generated), { recursive: true });
      await fs.copyFile(original, generated);
      restored.push(file);
    }
  }

  const build = gradle(app, ['assembleDebug']);
  const test =
    build.status === 0
      ? gradle(app, [
          'testDebugUnitTest',
          '--tests',
          'bench.app.BenchmarkCaptureTest',
          '-Proborazzi.test.record=true',
        ])
      : null;
  await fs.writeFile(
    path.join(output, 'build.log'),
    build.stdout + build.stderr + (test ? test.stdout + test.stderr : ''),
  );
  if (build.status !== 0) {
    await writeJson(path.join(output, 'capture.json'), {
      runId,
      build: 'failed',
      restoredContractFiles: restored,
    });
    console.log(`${runId}: build failed, see ${output}/build.log`);
    continue;
  }

  const rendered = path.join(app, 'app', 'build', 'benchmark-captures');
  const captures = [];
  for (const screen of screens) {
    const entry = { screen };
    for (const [key, suffix] of [
      ['firstScreen', '.png'],
      ['tallScreen', '.tall.png'],
    ]) {
      const source = path.join(rendered, screen + suffix);
      if (!(await exists(source))) {
        entry[key] = null;
        continue;
      }
      const target = path.join(output, screen + suffix);
      await fs.copyFile(source, target);
      entry[key] = { path: screen + suffix, hash: await sha256File(target) };
    }
    captures.push(entry);
  }
  const missing = captures.filter((entry) => !entry.firstScreen).length;
  await writeJson(path.join(output, 'capture.json'), {
    runId,
    build: 'passed',
    captureTest: test.status === 0 ? 'passed' : 'failed',
    restoredContractFiles: restored,
    device: capture,
    colorScheme: 'light',
    captures,
  });
  console.log(
    `${runId}: ${captures.length - missing} of ${screens.length} screens captured`,
  );
}
