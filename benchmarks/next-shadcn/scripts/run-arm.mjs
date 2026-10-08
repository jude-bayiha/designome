// Run one benchmark arm as a fresh `claude -p` session and record its token usage.
// Usage:
//   node run-arm.mjs --work <dir> --arm <extract|designome|screenshots|combined|none> --run <id>
//     [--sources <dir>] [--dossier <dir>] [--describe <text>]
//     [--model <id>] [--effort <level>] [--dry-run]
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  benchmarkRoot,
  exists,
  fill,
  hashTree,
  listImages,
  parseArgs,
  repositoryRoot,
  required,
  writeJson,
} from './lib.mjs';

const arms = {
  extract: { screenshots: true, dossier: false },
  designome: { screenshots: false, dossier: true },
  screenshots: { screenshots: true, dossier: false },
  combined: { screenshots: true, dossier: true },
  none: { screenshots: false, dossier: false },
};

const options = parseArgs(process.argv.slice(2), { flags: ['dry-run'] });
const work = path.resolve(required(options, 'work'));
const arm = required(options, 'arm');
const runId = required(options, 'run');
if (!arms[arm]) throw new Error(`Unknown arm ${arm}`);
if (!/^[a-z0-9][a-z0-9-]*$/u.test(runId))
  throw new Error('--run must be lowercase letters, digits and hyphens');

const runDirectory = path.join(work, 'runs', runId);
if (await exists(runDirectory))
  throw new Error(`${runDirectory} already exists; runs are immutable`);
const inputDirectory = path.join(runDirectory, 'input');
const projectDirectory = path.join(
  runDirectory,
  arm === 'extract' ? 'workspace' : 'app',
);

// Each arm receives only its own inputs, copied so it never needs a path outside the run.
await fs.mkdir(inputDirectory, { recursive: true });
if (arms[arm].screenshots) {
  const sources = path.resolve(required(options, 'sources'));
  const target = path.join(inputDirectory, 'screenshots');
  await fs.mkdir(target);
  for (const name of await listImages(sources))
    await fs.copyFile(path.join(sources, name), path.join(target, name));
}
if (arms[arm].dossier)
  await fs.cp(
    path.resolve(required(options, 'dossier')),
    path.join(inputDirectory, 'designome'),
    { recursive: true },
  );

let prompt;
if (arm === 'extract') {
  const outputDirectory = path.join(runDirectory, 'output');
  await fs.mkdir(outputDirectory);
  await fs.mkdir(projectDirectory);
  prompt = fill(
    await fs.readFile(
      path.join(benchmarkRoot, 'prompts', 'extract.md'),
      'utf8',
    ),
    {
      INPUT_DIR: inputDirectory,
      OUTPUT_DIR: outputDirectory,
      SOURCE_DESCRIPTION: options.describe ?? 'a web app',
    },
  );
} else {
  await fs.copyFile(
    path.join(benchmarkRoot, 'brief.md'),
    path.join(inputDirectory, 'brief.md'),
  );
  const scaffold = path.join(work, 'scaffold');
  if (!(await exists(scaffold)))
    throw new Error(`Run prepare-scaffold.sh first: ${scaffold} is missing`);
  await fs.cp(scaffold, projectDirectory, {
    recursive: true,
    verbatimSymlinks: true,
  });
  const values = { INPUT_DIR: inputDirectory };
  const designInput = fill(
    await fs.readFile(
      path.join(benchmarkRoot, 'prompts', `input-${arm}.md`),
      'utf8',
    ),
    values,
  ).trim();
  prompt = fill(
    await fs.readFile(
      path.join(benchmarkRoot, 'prompts', 'generator.md'),
      'utf8',
    ),
    { ...values, DESIGN_INPUT: designInput },
  );
}
await fs.writeFile(path.join(runDirectory, 'prompt.md'), prompt);

const args = [
  '-p',
  '--output-format',
  'json',
  '--permission-mode',
  'bypassPermissions',
  '--add-dir',
  inputDirectory,
  '--disallowedTools',
  'WebFetch,WebSearch',
];
if (arm === 'extract')
  args.push(
    '--add-dir',
    path.join(runDirectory, 'output'),
    '--plugin-dir',
    repositoryRoot,
  );
if (options.model) args.push('--model', options.model);
if (options.effort) args.push('--effort', options.effort);

const record = {
  runId,
  arm,
  model: options.model ?? 'host default',
  effort: options.effort ?? 'host default',
  command: ['claude', ...args],
  inputHash: await hashTree(inputDirectory),
  startedAt: new Date().toISOString(),
};
if (options['dry-run']) {
  await writeJson(path.join(runDirectory, 'run.json'), {
    ...record,
    status: 'dry-run',
  });
  console.log(`Dry run prepared in ${runDirectory}`);
  process.exit(0);
}

const started = Date.now();
const child = spawn('claude', args, {
  cwd: projectDirectory,
  stdio: ['pipe', 'pipe', 'inherit'],
});
child.stdin.end(prompt);
let stdout = '';
child.stdout.on('data', (chunk) => (stdout += chunk));
const exitCode = await new Promise((resolve) => child.on('close', resolve));
await fs.writeFile(path.join(runDirectory, 'result.json'), stdout);

let result = null;
try {
  result = JSON.parse(stdout);
} catch {
  // Keep the raw output; the usage fields stay null.
}
// modelUsage includes subagents; usage covers the main loop only.
const models = Object.values(result?.modelUsage ?? {});
const sum = (key, fallback) =>
  models.length > 0
    ? models.reduce((total, item) => total + (item[key] ?? 0), 0)
    : (result?.usage?.[fallback] ?? null);
await writeJson(path.join(runDirectory, 'run.json'), {
  ...record,
  finishedAt: new Date().toISOString(),
  wallTimeSeconds: Math.round((Date.now() - started) / 1000),
  exitCode,
  status: exitCode === 0 && result && !result.is_error ? 'completed' : 'failed',
  sessionId: result?.session_id ?? null,
  turns: result?.num_turns ?? null,
  usage: {
    inputTokens: sum('inputTokens', 'input_tokens'),
    outputTokens: sum('outputTokens', 'output_tokens'),
    cacheReadTokens: sum('cacheReadInputTokens', 'cache_read_input_tokens'),
    cacheWriteTokens: sum(
      'cacheCreationInputTokens',
      'cache_creation_input_tokens',
    ),
    listCostUsd: result?.total_cost_usd ?? null,
  },
  outputHash:
    arm === 'extract'
      ? await hashTree(path.join(runDirectory, 'output'))
      : await hashTree(projectDirectory),
});
console.log(`${runId}: exit ${exitCode}, record in ${runDirectory}/run.json`);
process.exit(exitCode ?? 1);
