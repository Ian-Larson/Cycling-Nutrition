/**
 * Returns the mean-max power curve for a stream: for each duration d in 1..N,
 * curve[d-1] = max over all windows of length d of the window mean, rounded
 * to integer watts. NaN/negative samples are clamped to 0.
 *
 * Mirrored verbatim from supabase/functions/_shared/mean-max-curve.ts.
 * Keep the two copies identical by hand.
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

const INT16_MAX = 32767;
const INT16_MIN = -32768;

/** Packs a power curve as little-endian Int16 bytes. Clamps to Int16 range. */
export function packCurveInt16(curve: readonly number[]): Uint8Array {
  const buf = new ArrayBuffer(curve.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < curve.length; i++) {
    const clamped = Math.max(INT16_MIN, Math.min(INT16_MAX, Math.round(curve[i])));
    view.setInt16(i * 2, clamped, true);
  }
  return new Uint8Array(buf);
}

/** Inverse of packCurveInt16. */
export function unpackCurveInt16(bytes: Uint8Array): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: number[] = [];
  for (let i = 0; i < bytes.byteLength; i += 2) {
    out.push(view.getInt16(i, true));
  }
  return out;
}
