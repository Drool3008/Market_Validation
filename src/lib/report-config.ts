// Pre-registered success thresholds (README s.5). These decide "validated" vs not.
// PLACEHOLDERS -- set the real numbers with the user BEFORE recruiting testers.
// Changing them after the fact defeats the point of a pre-registered test.

export const THRESHOLDS = {
  // Feature-row CTR must beat the average generic-row CTR by at least this multiple.
  ctrMultiple: 1.5,
  // At least this share of sessions must click into the feature.
  minSessionsClickedPct: 0.3,
  // Median time spent in the feature (seconds) among sessions that clicked.
  minMedianDwellSec: 20,
};
