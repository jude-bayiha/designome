import { sha256 } from './files.mjs';

/**
 * Audit Contract 2 is additive. The original audit artifact schema remains
 * readable for historical runs; new verification-aware plans identify this
 * contract explicitly so an older proof cannot be promoted by renumbering it.
 */
export const auditContractVersion = '2.0.0';
export const legacyAuditContractVersion = '1.0.0';

const supportedVersions = new Set([
  legacyAuditContractVersion,
  auditContractVersion,
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function semanticFingerprint(value) {
  return sha256(canonicalJson(value));
}

export function designDnaFingerprint(dna) {
  return semanticFingerprint(dna);
}

export function assertAuditContractVersion(version) {
  if (!supportedVersions.has(version)) {
    throw new Error(
      `Unsupported audit contract version: ${String(version)}. Supported versions: ${[
        ...supportedVersions,
      ].join(', ')}`,
    );
  }
  return version;
}

export function isVerificationAware(value) {
  return value?.auditContractVersion === auditContractVersion;
}

export function normalizeContext(context) {
  const routeId = context?.routeId;
  const width = context?.viewport?.width;
  const height = context?.viewport?.height;
  const scenario = context?.scenario ?? 'default';
  const direction = context?.direction ?? 'ltr';
  if (
    typeof routeId !== 'string' ||
    routeId.length === 0 ||
    !Number.isInteger(width) ||
    width < 1 ||
    !Number.isInteger(height) ||
    height < 1 ||
    typeof scenario !== 'string' ||
    scenario.length === 0 ||
    !['ltr', 'rtl'].includes(direction)
  ) {
    throw new Error('Invalid audit verification context');
  }
  return {
    routeId,
    viewport: { width, height },
    scenario,
    direction,
  };
}

export function contextKey(context) {
  return canonicalJson(normalizeContext(context));
}

export const auditContextKey = contextKey;

export function contextsForRoutes(routes = []) {
  return routes.flatMap((route) =>
    (route.viewports ?? []).flatMap((viewport) =>
      (route.scenarios ?? ['default']).flatMap((scenario) =>
        (route.directions ?? ['ltr']).map((direction) =>
          normalizeContext({
            routeId: route.id,
            viewport,
            scenario,
            direction,
          }),
        ),
      ),
    ),
  );
}

export function captureContext(capture) {
  return normalizeContext(capture);
}

function identityConfig(config = {}) {
  return {
    baseUrl: config.baseUrl,
    layers: config.layers,
    routes: config.routes,
    startCommand: config.startCommand ?? null,
    focus: config.focus ?? null,
    verification: config.verification ?? null,
  };
}

/**
 * Hash only semantic inputs. Timestamps, output directories and evaluated
 * results are deliberately excluded so a rerun of the same plan is stable.
 */
export function auditPlanFingerprint({
  auditContract = auditContractVersion,
  dna,
  config,
  verification = null,
}) {
  return semanticFingerprint({
    auditContractVersion: auditContract,
    designDnaFingerprint: dnaDnaOrFingerprint(dna),
    config: identityConfig(config),
    verification,
  });
}

export function fingerprintFromPlan(plan) {
  return auditPlanFingerprint({
    auditContract: plan.auditContractVersion ?? legacyAuditContractVersion,
    dna: plan.designDnaFingerprint ?? '',
    config: {
      baseUrl: plan.baseUrl,
      startCommand: plan.startCommand ?? null,
      layers: plan.config?.layers,
      routes: plan.routes,
      focus: plan.focus ?? null,
      verification: plan.verification ?? null,
    },
    verification: plan.verification ?? null,
  });
}

function dnaDnaOrFingerprint(dna) {
  return typeof dna === 'string' ? dna : designDnaFingerprint(dna);
}

export function targetCaptureIdentity({
  id,
  path,
  contentHash,
  nativeDimensions = null,
  context,
}) {
  return {
    id,
    path,
    contentHash,
    nativeDimensions,
    context: normalizeContext(context),
  };
}

export function verificationFingerprint(verification) {
  return semanticFingerprint(verification ?? null);
}
