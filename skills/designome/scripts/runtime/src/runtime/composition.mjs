import {
  decodeMeasurementImage,
  scanSourceRegion,
  parseRegion,
} from './source-measurement.mjs';
import { DesignomeError } from './errors.mjs';

function requirePlan(condition, message) {
  if (!condition)
    throw new DesignomeError(message, { code: 'INVALID_COMPOSITION_PLAN' });
}

function sampleProbe(image, frame, probe, rendered) {
  requirePlan(probe && typeof probe === 'object', 'Invalid probe');
  const { width, height } = frame;
  const { axis } = probe;
  const region = rendered ? (probe.renderRegion ?? probe.region) : probe.region;
  requirePlan(['x', 'y', 'color'].includes(axis), 'Unknown probe axis');
  if (probe.boundary !== undefined) {
    requirePlan(
      axis !== 'color' && ['start', 'end'].includes(probe.boundary),
      'Invalid image boundary',
    );
    const origin = axis === 'x' ? frame.x : frame.y;
    return {
      axis,
      boundary: probe.boundary,
      value:
        origin +
        (probe.boundary === 'start' ? 0 : axis === 'x' ? width : height),
    };
  }
  requirePlan(
    Array.isArray(region) &&
      region.length === 4 &&
      region.every((n) => Number.isFinite(n) && n >= 0 && n <= 1),
    'Expected normalized [left,top,right,bottom]',
  );
  const [left, top, right, bottom] = region;
  requirePlan(left < right && top < bottom, 'Empty probe region');
  const x = Math.floor(left * width),
    y = Math.floor(top * height);
  const bounds = {
    x: frame.x + x,
    y: frame.y + y,
    width: Math.ceil(right * width) - x,
    height: Math.ceil(bottom * height) - y,
  };
  const scan = scanSourceRegion(image.pixels, image.source.width, bounds, 6);
  if (axis === 'color') {
    const mode = scan.colors.mostFrequent[0];
    const value =
      mode && mode.count > scan.colors.sampledPixels / 2 ? mode.hex : null;
    return { axis, region: bounds, value, samples: scan.colors };
  }
  const candidates = scan.edges[axis];
  // Adjacent transitions can be the two sides of one antialiased hairline.
  const singleEdge =
    candidates.length &&
    candidates.at(-1).position - candidates[0].position <= 3;
  const strongest =
    singleEdge &&
    candidates.reduce((best, edge) =>
      edge.meanChannelDelta > best.meanChannelDelta ? edge : best,
    );
  return {
    axis,
    region: bounds,
    value: strongest ? strongest.position : null,
    candidates: candidates.map((e) => e.position),
  };
}

function luminance(hex) {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((s) => (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function measureRelations(plan, image, rendered = false) {
  const frame = parseRegion(
    rendered ? plan.renderFrame : plan.sourceFrame,
    image.source.width,
    image.source.height,
  );
  const probes = new Map();
  for (const [id, probe] of Object.entries(plan.probes))
    probes.set(id, sampleProbe(image, frame, probe, rendered));
  const values = plan.relations.map(({ kind, probes: ids }) => {
    const contrast = kind === 'contrast';
    requirePlan(
      contrast || kind === 'ratio' || kind === 'offset',
      'Expected contrast, ratio or signed offset',
    );
    requirePlan(
      Array.isArray(ids) &&
        ids.length === (contrast ? 2 : 4) &&
        ids.every((id) => probes.has(id)),
      'Invalid relation probe references',
    );
    const selected = ids.map((id) => probes.get(id));
    requirePlan(
      selected.every((p) => p.axis === selected[0].axis) &&
        (selected[0].axis === 'color') === contrast,
      'Incompatible probe axes',
    );
    if (selected.some((p) => p.value === null)) return null;
    const [a, b, c, d] = selected.map((p) => p.value);
    if (!contrast)
      return d > c && (b >= a || kind === 'offset') ? (b - a) / (d - c) : null;
    const pair = [luminance(a), luminance(b)];
    return (Math.max(...pair) + 0.05) / (Math.min(...pair) + 0.05);
  });
  return {
    source: image.source,
    frame,
    probes: Object.fromEntries(probes),
    values,
  };
}

export async function measureComposition(plan, sourcePath, renderPath) {
  requirePlan(
    plan?.version === 1 &&
      plan.probes &&
      typeof plan.probes === 'object' &&
      !Array.isArray(plan.probes) &&
      Object.keys(plan.probes).length <= 128 &&
      Array.isArray(plan.relations) &&
      plan.relations.length > 0 &&
      plan.relations.length <= 128,
    'Invalid composition plan',
  );
  const names = new Set();
  for (const relation of plan.relations) {
    requirePlan(
      relation &&
        typeof relation.id === 'string' &&
        relation.id.length &&
        !names.has(relation.id) &&
        Number.isFinite(relation.tolerance) &&
        relation.tolerance >= 0,
      'Expected unique relation ID and absolute tolerance',
    );
    names.add(relation.id);
  }
  const source = measureRelations(
    plan,
    await decodeMeasurementImage(sourcePath),
  );
  const render = renderPath
    ? measureRelations(plan, await decodeMeasurementImage(renderPath), true)
    : null;
  const relations = plan.relations.map((relation, i) => {
    const expected = source.values[i],
      actual = render?.values[i] ?? null;
    const delta =
      actual !== null && expected !== null ? actual - expected : null;
    const status =
      expected === null
        ? 'incomplete'
        : !render
          ? 'measured'
          : delta === null
            ? 'incomplete'
            : Math.abs(delta) <= relation.tolerance
              ? 'within-tolerance'
              : 'diverged';
    return { ...relation, expected, actual, delta, status };
  });
  return {
    version: 1,
    source: {
      image: source.source,
      frame: source.frame,
      probes: source.probes,
    },
    render: render && {
      image: render.source,
      frame: render.frame,
      probes: render.probes,
    },
    relations,
  };
}
