import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
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
