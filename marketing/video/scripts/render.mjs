import { spawnSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stills = process.argv.includes('--stills');
const format = process.argv
  .find((arg) => arg.startsWith('--format='))
  ?.slice(9);
const out = path.resolve(
  process.env.VIDEO_OUTPUT_DIR ?? path.join(root, 'output'),
);
const report = JSON.parse(
  await readFile(path.join(root, 'public/capture-report.json'), 'utf8'),
);
for (const capture of report.captures) {
  if (!capture.privacy.privateCellsMasked)
    throw new Error('Missing privacy verification.');
  const hash = createHash('sha256')
    .update(await readFile(path.join(root, 'public', capture.file)))
    .digest('hex');
  if (hash !== capture.sha256)
    throw new Error('Capture changed after privacy verification.');
}
if (report.captures.length !== 2)
  throw new Error('Both verified app captures are required.');
await mkdir(out, { recursive: true });
for (const ratio of ['16x9', '9x16']) {
  if (format && ratio !== format) continue;
  const output = stills
    ? path.join(root, 'review', ratio)
    : path.join(out, `designome-glane-${ratio}.mp4`);
  if (stills) await mkdir(output, { recursive: true });
  const args = [
    'exec',
    'remotion',
    'render',
    'src/index.ts',
    `Glane-${ratio}`,
    output,
    '--concurrency=2',
    '--muted',
  ];
  if (process.env.VIDEO_BROWSER)
    args.push(`--browser-executable=${process.env.VIDEO_BROWSER}`);
  if (stills)
    args.push(
      '--sequence',
      '--image-format=png',
      '--frames=0,60,195,390,550,690,840,925,1065,1180,1259',
    );
  else
    args.push(
      '--codec=h264',
      '--pixel-format=yuv420p',
      '--crf=18',
      '--jpeg-quality=95',
    );
  const result = spawnSync('pnpm', args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
