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
const baseline = JSON.parse(
  await readFile(
    path.join(root, 'public/baseline-capture-report.json'),
    'utf8',
  ),
);
if (
  (!baseline.capturedBeforeProductPalette &&
    baseline.palettePreview !== 'earlier-palette-on-current-english-app') ||
  baseline.deviceScaleFactor !== 3
)
  throw new Error('Verified pre-customization captures are required.');
const referenceHash = createHash('sha256')
  .update(await readFile(path.join(root, 'public/reference.png')))
  .digest('hex');
if (
  report.reference?.sha256 !== referenceHash ||
  report.reference.width !== 2048 ||
  report.reference.height !== 1714
)
  throw new Error(
    'The verified reference is missing or changed. Recapture before rendering.',
  );
for (const capture of [...report.captures, ...baseline.captures]) {
  if (!capture.privacy.textSlotsBlurred || capture.privacy.blurCssPixels !== 5)
    throw new Error('Missing privacy verification.');
  const bytes = await readFile(path.join(root, 'public', capture.file));
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== capture.sha256)
    throw new Error('Capture changed after privacy verification.');
  if (
    bytes.readUInt32BE(16) !== capture.pixels.width ||
    bytes.readUInt32BE(20) !== capture.pixels.height
  )
    throw new Error('PNG dimensions differ from the capture report.');
}
const required = [
  'glane-dashboard.png',
  'glane-composer.png',
  'glane-chart.png',
  'glane-cards.png',
  'glane-library.png',
  'glane-history-cards.png',
  'glane-workspace.png',
  'glane-card.png',
  'glane-history-card.png',
  'glane-library-detail.png',
];
if (
  report.deviceScaleFactor !== 3 ||
  required.some(
    (file) => !report.captures.some((capture) => capture.file === file),
  )
)
  throw new Error('All ten verified high-density app captures are required.');
for (const captureSet of [report, baseline]) {
  if (
    captureSet.viewport.width !== 1920 ||
    captureSet.viewport.height !== 1080 ||
    !captureSet.layoutPreserved
  )
    throw new Error(
      'Native 1920 × 1080 captures with unchanged layout are required.',
    );
}
// The portrait camera must end exactly on the complete native composer.
for (const [file, expected] of [
  ['glane-dashboard.png', { x: 0, y: 0, width: 1920, height: 725 }],
  ['glane-composer.png', { x: 288, y: 363, width: 531, height: 346 }],
]) {
  const actual = report.captures.find((capture) => capture.file === file)?.clip;
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(
      'Live panel geometry changed. Review the portrait camera bounds.',
    );
}
if (
  ['glane-before-dashboard.png', 'glane-before-cards.png'].some(
    (file) => !baseline.captures.some((capture) => capture.file === file),
  )
)
  throw new Error('Both original app captures are required.');
for (const capture of baseline.captures) {
  const current = report.captures.find(
    (entry) => entry.file === capture.file.replace('glane-before-', 'glane-'),
  );
  if (JSON.stringify(capture.pixels) !== JSON.stringify(current?.pixels))
    throw new Error('Before/after framing must match for the palette wipe.');
}
if (
  report.productTheme?.length !== 2 ||
  report.productTheme.some(
    (theme) =>
      theme.language !== 'en' ||
      theme.emphasis !== '#234f83' ||
      theme.activeBackground !== 'rgb(35, 79, 131)' ||
      theme.activeColor !== 'rgb(255, 255, 255)' ||
      theme.cardRadius !== '12px' ||
      theme.cardPadding !== '14px' ||
      theme.bodySize !== '14px',
  )
)
  throw new Error(
    'The shared product palette and component recipe must be verified on both routes.',
  );
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
      '--frames=0,60,195,340,390,475,510,615,660,710,755,805,850,920,985,1080,1170,1300,1379',
    );
  else
    args.push(
      '--codec=h264',
      '--pixel-format=yuv420p',
      '--crf=12',
      '--image-format=png',
      '--color-space=bt709',
    );
  const result = spawnSync('pnpm', args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
