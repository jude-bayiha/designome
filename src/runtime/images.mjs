import fs from 'node:fs/promises';
import path from 'node:path';

import { sha256 } from './files.mjs';
import { DesignomeError } from './errors.mjs';

const jpegStartOfFrameMarkers = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function readJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8)
    return null;
  let offset = 2;

  while (offset + 4 <= buffer.length) {
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) break;
    const marker = buffer[offset];
    offset += 1;

    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7)
    )
      continue;
    if (offset + 2 > buffer.length) break;

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;

    if (jpegStartOfFrameMarkers.has(marker)) {
      if (segmentLength < 7) break;
      return {
        format: 'jpeg',
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
      };
    }

    offset += segmentLength;
  }

  return null;
}

function readPngDimensions(buffer) {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature))
    return null;
  return {
    format: 'png',
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function readGifDimensions(buffer) {
  const header = buffer.subarray(0, 6).toString('ascii');
  if (buffer.length < 10 || (header !== 'GIF87a' && header !== 'GIF89a'))
    return null;
  return {
    format: 'gif',
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8),
  };
}

function readWebpDimensions(buffer) {
  if (
    buffer.length < 20 ||
    buffer.subarray(0, 4).toString('ascii') !== 'RIFF' ||
    buffer.subarray(8, 12).toString('ascii') !== 'WEBP'
  ) {
    return null;
  }

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.subarray(offset, offset + 4).toString('ascii');
    const chunkLength = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + chunkLength;
    if (dataEnd > buffer.length) return null;

    if (chunkType === 'VP8X' && chunkLength >= 10) {
      return {
        format: 'webp',
        width: buffer.readUIntLE(dataOffset + 4, 3) + 1,
        height: buffer.readUIntLE(dataOffset + 7, 3) + 1,
      };
    }

    if (
      chunkType === 'VP8L' &&
      chunkLength >= 5 &&
      buffer[dataOffset] === 0x2f
    ) {
      const packedDimensions = buffer.readUInt32LE(dataOffset + 1);
      return {
        format: 'webp',
        width: (packedDimensions & 0x3fff) + 1,
        height: ((packedDimensions >>> 14) & 0x3fff) + 1,
      };
    }

    if (
      chunkType === 'VP8 ' &&
      chunkLength >= 10 &&
      buffer[dataOffset + 3] === 0x9d &&
      buffer[dataOffset + 4] === 0x01 &&
      buffer[dataOffset + 5] === 0x2a
    ) {
      return {
        format: 'webp',
        width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
      };
    }

    offset = dataEnd + (chunkLength % 2);
  }

  return null;
}

export function inspectImageBuffer(buffer) {
  const dimensions =
    readPngDimensions(buffer) ??
    readJpegDimensions(buffer) ??
    readGifDimensions(buffer) ??
    readWebpDimensions(buffer);
  if (!dimensions || dimensions.width < 1 || dimensions.height < 1) {
    throw new DesignomeError('Unsupported or malformed image', {
      code: 'UNSUPPORTED_IMAGE',
      details: [
        'Supported deterministic metadata formats are PNG, JPEG, GIF, and WebP.',
      ],
    });
  }
  return dimensions;
}

function identifierPart(value) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  return normalized || 'screenshot';
}

export async function inspectImage(imagePath) {
  const absolutePath = path.resolve(imagePath);
  let buffer;
  try {
    buffer = await fs.readFile(absolutePath);
  } catch (error) {
    throw new DesignomeError(`Cannot read screenshot: ${absolutePath}`, {
      code: 'SCREENSHOT_UNREADABLE',
      details: [error.message],
    });
  }

  const metadata = inspectImageBuffer(buffer);
  const contentHash = sha256(buffer);
  const baseName = path.basename(absolutePath, path.extname(absolutePath));

  return {
    id: `source.${identifierPart(baseName)}-${contentHash.slice(0, 8)}`,
    kind: 'screenshot',
    label: baseName,
    path: absolutePath,
    format: metadata.format,
    dimensions: {
      width: metadata.width,
      height: metadata.height,
    },
    contentHash: `sha256:${contentHash}`,
    limitations: [
      'Static screenshot; runtime behavior is not directly observable.',
    ],
  };
}
