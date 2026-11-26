import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { inspectImageBuffer } from '../../src/runtime/images.mjs';
import {
  measureSource,
  scanSourceRegion,
} from '../../src/runtime/source-measurement.mjs';

// A 24 × 16 PNG with two neutral surfaces split down the center.
const fixture = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABgAAAAQCAAAAAApT+BJAAAAF0lEQVQY02OUYEAAHiQ2EwMOMCpBSwkAUhwARIk5GrQAAAAASUVORK5CYII=',
  'base64',
);

async function writeFixture(t) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'designome-measure-'),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const imagePath = path.join(directory, 'source.png');
  await fs.writeFile(imagePath, fixture);
  return { directory, imagePath };
}

test('measures aligned candidates in source coordinates and sampled surface colors', () => {
  const imageWidth = 24;
  const pixels = Buffer.alloc(imageWidth * 16 * 4);
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < imageWidth; x += 1) {
      const tone = y === 8 ? 8 : x < 12 ? 24 : 36;
      const offset = (y * imageWidth + x) * 4;
      pixels.fill(tone, offset, offset + 3);
      pixels[offset + 3] = 255;
    }
  }

  const result = scanSourceRegion(
    pixels,
    imageWidth,
    { x: 2, y: 2, width: 20, height: 12 },
    6,
  );
  assert.deepEqual(result.edges.x, [
    {
      position: 12,
      supportingScanlines: 11,
      sampledScanlines: 12,
      meanChannelDelta: 12,
    },
  ]);
  assert.deepEqual(
    result.edges.y.map(({ position }) => position),
    [8, 9],
  );
  assert.deepEqual(result.colors, {
    sampledPixels: 240,
    opaqueSamples: 240,
    mostFrequent: [
      { hex: '#181818', count: 110 },
      { hex: '#242424', count: 110 },
      { hex: '#080808', count: 20 },
    ],
  });
});

test('disregards isolated marks and hidden color under transparent pixels', () => {
  const pixels = Buffer.from([
    0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0, 255, 255, 255, 255,
    255, 255, 255, 255, 0, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255, 0,
  ]);
  const result = scanSourceRegion(
    pixels,
    3,
    { x: 0, y: 0, width: 3, height: 3 },
    6,
  );
  assert.deepEqual(result.edges, { x: [], y: [] });
  assert.deepEqual(result.colors, {
    sampledPixels: 9,
    opaqueSamples: 6,
    mostFrequent: [
      { hex: '#000000', count: 5 },
      { hex: '#ffffff', count: 1 },
    ],
  });
});

test('rejects an invalid region or threshold before starting the decoder', async (t) => {
  const { imagePath } = await writeFixture(t);
  for (const options of [{ region: '23,0,2,2' }, { minimumDelta: '0' }]) {
    await assert.rejects(measureSource({ imagePath, ...options }), {
      code: 'INVALID_ARGUMENTS',
    });
  }
});

test('decodes the source and creates a PNG crop without replacing an existing file', async (t) => {
  const { directory, imagePath } = await writeFixture(t);
  const annotationPath = path.join(directory, 'region.png');
  const options = { imagePath, annotationPath, region: '4,3,16,10' };
  const measured = await measureSource(options);
  assert.equal(measured.units, 'image-px');
  assert.equal(measured.edges.x[0].position, 12);
  assert.deepEqual(measured.colors.mostFrequent, [
    { hex: '#181818', count: 80 },
    { hex: '#242424', count: 80 },
  ]);
  const annotation = await fs.readFile(annotationPath);
  assert.deepEqual(inspectImageBuffer(annotation), {
    format: 'png',
    width: 16,
    height: 10,
  });
  await assert.rejects(measureSource(options), {
    code: 'SOURCE_MEASUREMENT_OUTPUT_EXISTS',
  });
  assert.deepEqual(await fs.readFile(annotationPath), annotation);
});

test('rejects interlacing, duplicate headers and corrupted PNG data', async (t) => {
  const { imagePath } = await writeFixture(t);
  const interlaced = Buffer.from(fixture);
  interlaced[28] = 1;
  const duplicateHeader = Buffer.concat([
    fixture.subarray(0, 33),
    fixture.subarray(8, 33),
    fixture.subarray(33),
  ]);
  const corrupted = Buffer.from(fixture);
  corrupted[corrupted.length - 1] ^= 1;
  for (const [image, code] of [
    [interlaced, 'UNSUPPORTED_MEASUREMENT_IMAGE'],
    [duplicateHeader, 'SOURCE_MEASUREMENT_FAILED'],
    [corrupted, 'SOURCE_MEASUREMENT_FAILED'],
  ]) {
    await fs.writeFile(imagePath, image);
    await assert.rejects(measureSource({ imagePath }), { code });
  }
});

test('replays normalized composition evidence and reports missing landmarks', async (t) => {
  const { measureComposition } =
    await import('../../src/runtime/composition.mjs');
  const { imagePath } = await writeFixture(t);
  const plan = {
    version: 1,
    probes: {
      start: { axis: 'x', boundary: 'start' },
      end: { axis: 'x', boundary: 'end' },
      separator: { axis: 'x', region: [0, 0, 1, 1] },
    },
    relations: [
      {
        id: 'split',
        kind: 'ratio',
        probes: ['start', 'separator', 'start', 'end'],
        tolerance: 0,
      },
    ],
  };
  const equal = await measureComposition(plan, imagePath, imagePath);
  assert.equal(equal.relations[0].expected, 0.5);
  assert.equal(equal.relations[0].status, 'within-tolerance');
  assert.equal(equal.source.image.contentHash, equal.render.image.contentHash);
  const framed = await measureComposition(
    { ...plan, sourceFrame: '6,2,18,12', renderFrame: '2,0,20,16' },
    imagePath,
    imagePath,
  );
  assert.equal(framed.relations[0].expected, 6 / 18);
  assert.equal(framed.relations[0].actual, 10 / 20);
  assert.deepEqual(framed.source.probes.separator.region, framed.source.frame);
  await assert.rejects(
    measureComposition({ ...plan, sourceFrame: '6,0,24,16' }, imagePath),
  );
  plan.probes.separator.renderRegion = [0, 0, 0.25, 1];
  assert.equal(
    (await measureComposition(plan, imagePath, imagePath)).relations[0].status,
    'incomplete',
  );
  plan.relations[0].probes[1] = 'missing';
  await assert.rejects(measureComposition(plan, imagePath), {
    code: 'INVALID_COMPOSITION_PLAN',
  });
});

test('detects raster formats from bytes and measures their decoded edges', async (t) => {
  const { imagePath } = await writeFixture(t);
  const encodings = {
    jpeg: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAAMABABAREA/8QAFQABAQAAAAAAAAAAAAAAAAAACgn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAA/AJVFUCrlUP/Z',
    gif: 'R0lGODlhEAAMAPABAAAAAP///yH5BAAAAAAALAAAAAAQAAwAAAIZhG+hq4jM3IFLJhoswNly/XkYOIoUeZpQAQA7',
    webp: 'UklGRigAAABXRUJQVlA4IBwAAABQAQCdASoQAAwAAgA0JaQABHQAAP2z//vd4AAA',
  };
  for (const [format, encoded] of Object.entries(encodings)) {
    await fs.writeFile(imagePath, Buffer.from(encoded, 'base64'));
    const result = await measureSource({ imagePath });
    assert.equal(result.source.format, format);
    assert.equal(result.source.width, 16);
    assert.ok(result.edges.x.some((edge) => edge.position === 8));
  }
});

test('rejects incomplete GIF frame data without emitting a measurement or warning on stdout', async (t) => {
  const { imagePath } = await writeFixture(t);
  const { default: gif } = await import('#gif-codec');
  const encoded = Buffer.alloc(256);
  const writer = new gif.GifWriter(encoded, 3, 1, { palette: [0, 0xffffff] });
  writer.addFrame(0, 0, 2, 1, [0, 1]);
  const complete = encoded.subarray(0, writer.end());
  const frame = new gif.GifReader(complete).frameInfo(0);
  // The descriptor width precedes height, packed flags and the LZW data.
  const widthOffset = frame.data_offset - 5;
  const cli = fileURLToPath(
    new URL('../../bin/designome.mjs', import.meta.url),
  );
  const invalidFrames = [1, 3].map((declaredWidth) => {
    const mismatched = Buffer.from(complete);
    mismatched.writeUInt16LE(declaredWidth, widthOffset);
    return mismatched;
  });
  // Leave the sub-block and file terminators intact but drop its last LZW byte.
  const sizeOffset = frame.data_offset + 1;
  const lastDataByte = sizeOffset + complete[sizeOffset];
  const truncated = Buffer.concat([
    complete.subarray(0, lastDataByte),
    complete.subarray(lastDataByte + 1),
  ]);
  truncated[sizeOffset] -= 1;
  invalidFrames.push(truncated);
  for (const invalid of invalidFrames) {
    await fs.writeFile(imagePath, invalid);
    const run = spawnSync(
      process.execPath,
      [cli, 'measure-source', '--image', imagePath],
      { encoding: 'utf8' },
    );
    assert.equal(run.status, 1);
    assert.equal(run.stdout, '');
    assert.equal(JSON.parse(run.stderr).error, 'SOURCE_MEASUREMENT_FAILED');
  }
});
