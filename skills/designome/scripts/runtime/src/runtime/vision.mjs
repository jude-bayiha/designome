import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { DesignomeError } from './errors.mjs';
import { decodeMeasurementImage, parseRegion } from './source-measurement.mjs';

function grayscale(image, region) {
  const data = new Uint8Array(region.width * region.height);
  let dark = 0;
  for (let y = 0; y < region.height; y++) {
    let offset = ((y + region.y) * image.source.width + region.x) * 4;
    for (let x = 0; x < region.width; x++, offset += 4) {
      const rgba = image.pixels;
      const alpha = rgba[offset + 3] / 255;
      const gray = Math.round(
        alpha *
          (0.299 * rgba[offset] +
            0.587 * rgba[offset + 1] +
            0.114 * rgba[offset + 2]) +
          (1 - alpha) * 255,
      );
      data[y * region.width + x] = gray;
      if (gray < 128) dark++;
    }
  }
  return { data, darkBackground: dark > data.length / 2 };
}

async function contours(gray, region) {
  const cv = await (await import('#opencv')).default;
  const input = cv.matFromArray(region.height, region.width, cv.CV_8UC1, gray);
  const edges = new cv.Mat();
  const hierarchy = new cv.Mat();
  const shapes = new cv.MatVector();
  try {
    cv.Canny(input, edges, 12, 36);
    cv.findContours(
      edges,
      shapes,
      hierarchy,
      cv.RETR_LIST,
      cv.CHAIN_APPROX_SIMPLE,
    );
    const candidates = [];
    const seen = new Set();
    for (let i = 0; i < shapes.size(); i++) {
      const shape = shapes.get(i);
      try {
        const box = cv.boundingRect(shape);
        if (
          Math.max(box.width, box.height) < 24 ||
          (box.width < 8 && box.height < 64) ||
          (box.height < 8 && box.width < 64)
        )
          continue;
        const key = [box.x, box.y, box.width, box.height].join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push({
          x: region.x + box.x,
          y: region.y + box.y,
          width: box.width,
          height: box.height,
        });
      } finally {
        shape.delete();
      }
    }
    candidates.sort(
      (a, b) =>
        b.width * b.height - a.width * a.height || a.y - b.y || a.x - b.x,
    );
    return {
      method: 'OpenCV Canny 12/36 and contour bounding rectangles',
      candidateCount: candidates.length,
      boxes: candidates.slice(0, 256),
    };
  } finally {
    shapes.delete();
    hierarchy.delete();
    edges.delete();
    input.delete();
  }
}

async function recognize(gray, region) {
  const { default: createCore } = await import('#ocr-core');
  const core = await createCore({
    wasmBinary: await fs.readFile(new URL(import.meta.resolve('#ocr-wasm'))),
  });
  const model = await fs.readFile(new URL(import.meta.resolve('#ocr-english')));
  core.FS.writeFile('/eng.traineddata', gunzipSync(model));
  const api = new core.TessBaseAPI();
  const pointer = core._malloc(gray.data.length);
  try {
    if (!pointer || api.Init('/', 'eng', 1) !== 0)
      throw new Error('English OCR initialization failed');
    // Sparse text mode handles dashboard labels distributed across panels.
    api.SetPageSegMode(11);
    const data = gray.data;
    const target = core.HEAPU8.subarray(pointer, pointer + data.length);
    if (gray.darkBackground) {
      for (let i = 0; i < data.length; i++) target[i] = 255 - data[i];
    } else target.set(data);
    api.SetImage(pointer, region.width, region.height, 1, region.width);
    api.SetSourceResolution(150);
    if (api.Recognize(null) !== 0) throw new Error('OCR recognition failed');
    const words = [];
    for (const line of api.GetTSVText(0).split('\n')) {
      const fields = line.split('\t');
      if (fields[0] !== '5' || fields.length < 12) continue;
      words.push({
        text: fields.slice(11).join('\t'),
        confidence: Number(fields[10]),
        x: region.x + Number(fields[6]),
        y: region.y + Number(fields[7]),
        width: Number(fields[8]),
        height: Number(fields[9]),
      });
    }
    return {
      language: 'eng',
      engine: 'Tesseract LSTM',
      inverted: gray.darkBackground,
      words,
    };
  } finally {
    api.End();
    core.destroy(api);
    core._free(pointer);
    core.FS.unlink('/eng.traineddata');
  }
}

export async function inspectVision({ imagePath, mode, region: selection }) {
  if (!['contours', 'ocr', 'both'].includes(mode))
    throw new DesignomeError('Expected --mode contours, ocr or both', {
      code: 'INVALID_ARGUMENTS',
    });
  const image = await decodeMeasurementImage(imagePath);
  const region = parseRegion(
    selection,
    image.source.width,
    image.source.height,
  );
  const gray = grayscale(image, region);
  return {
    source: image.source,
    region,
    units: 'image-px',
    ...(mode !== 'ocr' && { contours: await contours(gray.data, region) }),
    ...(mode !== 'contours' && { ocr: await recognize(gray, region) }),
  };
}
