/**
 * Returns the mean-max power curve for a stream: for each duration d in 1..N,
 * curve[d-1] = max over all windows of length d of the window mean, rounded
 * to integer watts. NaN/negative samples are clamped to 0.
 *
 * Uses a prefix-sum approach: O(N^2) worst-case but typically O(N * log N)
 * for ride-length streams (a few hours). For 4-hour rides (~14400 samples),
 * runs in well under a second.
 */
export function computeMeanMaxCurve(stream: readonly number[]): number[] {
  const n = stream.length;
  if (n === 0) return [];

  const clean = stream.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + clean[i];

  const curve = new Array<number>(n);
  for (let d = 1; d <= n; d++) {
    let best = 0;
    for (let i = 0; i + d <= n; i++) {
      const mean = (prefix[i + d] - prefix[i]) / d;
      if (mean > best) best = mean;
    }
    curve[d - 1] = Math.round(best);
  }
  return curve;
}
