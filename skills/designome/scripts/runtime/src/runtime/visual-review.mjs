// This is an evidence-completeness gate, never an aesthetic classifier.
export const visualReviewContractVersion = '1.0.0';
const text = (value) => typeof value === 'string' && value.trim().length > 0;
export function visualReviewComplete(observation) {
  const review = observation.comparison;
  if (
    !review ||
    review.sourceImagesOpened !== true ||
    review.targetImagesOpened !== true ||
    !text(review.reviewerId) ||
    !['independent-context', 'same-context', 'human'].includes(
      review.reviewMode,
    )
  )
    return false;
  if (!Array.isArray(review.regions) || review.regions.length === 0)
    return false;
  return (
    Array.isArray(observation.targetCaptureRefs) &&
    Array.isArray(observation.sourceCaptureRefs) &&
    observation.targetCaptureRefs.length > 0 &&
    observation.targetCaptureRefs.every((ref) =>
      review.regions.some((region) => region.targetCaptureRef === ref),
    ) &&
    review.regions.every(
      (region) =>
        region &&
        typeof region === 'object' &&
        observation.sourceCaptureRefs?.includes(region.sourceRef) &&
        observation.targetCaptureRefs?.includes(region.targetCaptureRef) &&
        ['sourceRegion', 'targetRegion', 'ruleBasis', 'observation'].every(
          (key) => text(region[key]),
        ) &&
        Array.isArray(region.measurements) &&
        Array.isArray(region.limitations) &&
        region.limitations.every(text),
    )
  );
}
