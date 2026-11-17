import fs from 'node:fs/promises';
import path from 'node:path';
import { DesignomeError } from './errors.mjs';
import { sha256 } from './files.mjs';
import { inspectImageBuffer } from './images.mjs';

const maxPixels = 16_777_216;
const maxDimension = 8192;
const maxInputBytes = 32 * 1024 * 1024;
const minimumSupport = 0.6;
const scanlineLimit = 192;
const colorSamplesPerAxis = 64;

function parseRegion(value, width, height) {
  if (value === undefined) return { x: 0, y: 0, width, height };
  if (/^\d+,\d+,\d+,\d+$/u.test(value)) {
    const [x, y, w, h] = value.split(',').map(Number);
    if (w > 0 && h > 0 && x + w <= width && y + h <= height) {
      return { x, y, width: w, height: h };
    }
  }
  throw new DesignomeError('--region must be an in-bounds x,y,width,height', {
    code: 'INVALID_ARGUMENTS',
  });
}

function validatePngChunks(input) {
  if (
    input.length >= 33 &&
    input.readUInt32BE(8) === 13 &&
    input.toString('ascii', 12, 16) === 'IHDR'
  ) {
    // pngjs bounds inflated output to the header dimensions for this mode.
    if (input[28] !== 0) {
      throw new DesignomeError('Expected a non-interlaced PNG', {
        code: 'UNSUPPORTED_MEASUREMENT_IMAGE',
      });
    }
    for (let offset = 33; offset <= input.length - 12;) {
      const size = input.readUInt32BE(offset);
      const type = input.toString('ascii', offset + 4, offset + 8);
      offset += 12 + size;
      // A second header could override the size or interlace mode we checked.
      if (offset > input.length || type === 'IHDR') break;
      if (type === 'acTL') {
        throw new DesignomeError('Expected a static PNG', {
          code: 'UNSUPPORTED_MEASUREMENT_IMAGE',
        });
      }
      if (type === 'IEND') {
        if (size === 0 && offset === input.length) return;
        break;
      }
    }
  }
  throw new DesignomeError('Invalid PNG chunk structure', {
    code: 'SOURCE_MEASUREMENT_FAILED',
  });
}

function samplePositions(length, maximum) {
  const count = Math.min(length, maximum);
  return Array.from({ length: count }, (_, i) =>
    Math.floor(((i + 0.5) * length) / count),
  );
}

function findEdges(pixels, region, stride, axis, minDelta) {
  const acrossX = axis === 'x';
  const count = acrossX ? region.width : region.height;
  const scanlines = samplePositions(
    acrossX ? region.height : region.width,
    scanlineLimit,
  );
  const scanSteps = scanlines.map((i) => i * (acrossX ? stride : 4));
  const base = region.y * stride + region.x * 4;
  const step = acrossX ? 4 : stride;
  const edges = [];
  for (let coord = 1; coord < count; coord += 1) {
    let supporting = 0;
    let totalDelta = 0;
    for (const scanStep of scanSteps) {
      const current = base + coord * step + scanStep;
      const prior = current - step;
      if (pixels[current + 3] !== 255 || pixels[prior + 3] !== 255) continue;
      const delta = Math.max(
        Math.abs(pixels[current] - pixels[prior]),
        Math.abs(pixels[current + 1] - pixels[prior + 1]),
        Math.abs(pixels[current + 2] - pixels[prior + 2]),
      );
      if (delta >= minDelta) {
        supporting += 1;
        totalDelta += delta;
      }
    }
    if (supporting >= minimumSupport * scanlines.length) {
      edges.push({
        position: (acrossX ? region.x : region.y) + coord,
        supportingScanlines: supporting,
        sampledScanlines: scanlines.length,
        meanChannelDelta: Math.round(totalDelta / supporting),
      });
    }
  }
  return edges;
}

function sampleColors(pixels, region, stride) {
  const columns = samplePositions(region.width, colorSamplesPerAxis);
  const rows = samplePositions(region.height, colorSamplesPerAxis);
  const counts = new Map();
  let opaqueSamples = 0;
  for (const y of rows) {
    for (const x of columns) {
      const offset = (region.y + y) * stride + (region.x + x) * 4;
      if (pixels[offset + 3] !== 255) continue;
      const hex = `#${pixels.toString('hex', offset, offset + 3)}`;
      counts.set(hex, (counts.get(hex) ?? 0) + 1);
      opaqueSamples += 1;
    }
  }
  return {
    sampledPixels: rows.length * columns.length,
    opaqueSamples,
    mostFrequent: [...counts]
      .sort(([a, aCount], [b, bCount]) => bCount - aCount || a.localeCompare(b))
      .slice(0, 5)
      .map(([hex, count]) => ({ hex, count })),
  };
}

export function scanSourceRegion(pixels, imageWidth, region, minDelta) {
  const stride = imageWidth * 4;
  return {
    edges: {
      x: findEdges(pixels, region, stride, 'x', minDelta),
      y: findEdges(pixels, region, stride, 'y', minDelta),
    },
    colors: sampleColors(pixels, region, stride),
  };
}

function annotateRegion(pixels, imageWidth, region, edges) {
  const rgba = Buffer.alloc(region.width * region.height * 4);
  const rowSize = region.width * 4;
  for (let y = 0; y < region.height; y += 1) {
    const start = ((region.y + y) * imageWidth + region.x) * 4;
    pixels.copy(rgba, y * rowSize, start, start + rowSize);
  }

  const vertical = Buffer.from([0, 230, 255, 255]);
  const horizontal = Buffer.from([255, 176, 0, 255]);
  for (const { position } of edges.x) {
    const x = position - region.x;
    for (let y = 0; y < region.height; y += 8) {
      vertical.copy(rgba, y * rowSize + x * 4);
    }
  }
  for (const { position } of edges.y) {
    const y = position - region.y;
    for (let x = 0; x < region.width; x += 8) {
      horizontal.copy(rgba, y * rowSize + x * 4);
    }
  }
  return { width: region.width, height: region.height, data: rgba };
}

async function readSource(imagePath) {
  const stat = await fs.stat(imagePath);
  if (!stat.isFile() || stat.size > maxInputBytes) {
    throw new DesignomeError('Expected a regular PNG file of at most 32 MiB', {
      code: 'UNSUPPORTED_MEASUREMENT_IMAGE',
    });
  }
  const input = await fs.readFile(imagePath);
  const { width, height, format } = inspectImageBuffer(input);
  if (
    format !== 'png' ||
    input.length > maxInputBytes ||
    width > maxDimension ||
    height > maxDimension ||
    width * height > maxPixels
  ) {
    throw new DesignomeError(
      'Expected a PNG within the 8192 px per side and 16,777,216 total pixel limits',
      { code: 'UNSUPPORTED_MEASUREMENT_IMAGE' },
    );
  }
  return { input, width, height };
}

export async function measureSource({
  imagePath,
  region: regionArg,
  minimumDelta = '6',
  annotationPath,
}) {
  const minDelta = Number(minimumDelta);
  if (!/^\d+$/u.test(minimumDelta) || minDelta < 1 || minDelta > 255) {
    throw new DesignomeError('--min-delta must be an integer from 1 to 255', {
      code: 'INVALID_ARGUMENTS',
    });
  }
  const { input, width, height } = await readSource(imagePath);
  const region = parseRegion(regionArg, width, height);
  validatePngChunks(input);
  const { default: png } = await import('#png-codec');
  let pixels;
  try {
    const decoded = png.read(input, { checkCRC: true });
    if (decoded.data.length !== width * height * 4)
      throw new Error('Unexpected decoded pixel count');
    pixels = decoded.data;
  } catch {
    throw new DesignomeError('Could not decode the source PNG', {
      code: 'SOURCE_MEASUREMENT_FAILED',
    });
  }
  const { edges, colors } = scanSourceRegion(pixels, width, region, minDelta);
  let annotation = null;
  if (annotationPath !== undefined) {
    annotation = path.resolve(annotationPath);
    try {
      await fs.writeFile(
        annotation,
        png.write(annotateRegion(pixels, width, region, edges)),
        { flag: 'wx', mode: 0o600 },
      );
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      throw new DesignomeError('--annotation must name a new file', {
        code: 'SOURCE_MEASUREMENT_OUTPUT_EXISTS',
      });
    }
  }
  return {
    source: { width, height, contentHash: `sha256:${sha256(input)}` },
    region,
    units: 'image-px',
    method: {
      decoder: 'pngjs RGBA8',
      minimumChannelDelta: minDelta,
      minimumScanlineSupport: minimumSupport,
    },
    edges,
    colors,
    annotation,
  };
}
