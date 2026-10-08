// Print the run table as Markdown from every runs/<id>/run.json.
// Usage: node summarize.mjs --work <dir>
import fs from 'node:fs/promises';
import path from 'node:path';
import { exists, parseArgs, readJson, required } from './lib.mjs';

const options = parseArgs(process.argv.slice(2));
const work = path.resolve(required(options, 'work'));
const format = (value) =>
  value === null || value === undefined ? 'n/a' : value.toLocaleString('en-US');

const rows = [
  '| Run | Arm | Status | Wall time | Output tokens | Cache-read tokens | Cache-write tokens | List cost |',
  '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |',
];
for (const runId of (await fs.readdir(path.join(work, 'runs'))).sort()) {
  const file = path.join(work, 'runs', runId, 'run.json');
  if (!(await exists(file))) continue;
  const run = await readJson(file);
  const usage = run.usage ?? {};
  const minutes =
    run.wallTimeSeconds === undefined
      ? 'n/a'
      : `${Math.round(run.wallTimeSeconds / 60)} min`;
  const cost =
    usage.listCostUsd === null || usage.listCostUsd === undefined
      ? 'n/a'
      : `$${usage.listCostUsd.toFixed(2)}`;
  rows.push(
    `| ${runId} | ${run.arm} | ${run.status} | ${minutes} | ${format(usage.outputTokens)} | ${format(usage.cacheReadTokens)} | ${format(usage.cacheWriteTokens)} | ${cost} |`,
  );
}
console.log(rows.join('\n'));
