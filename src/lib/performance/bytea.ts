/**
 * Decodes a Postgres bytea hex string (with the `\x` prefix) into a
 * Uint8Array. Mirror of the edge-side `toByteaHex` encoder used in the
 * activity-sync function.
 */
export function decodeByteaHex(value: string): Uint8Array {
  if (!value.startsWith('\\x')) {
    throw new Error('Bytea hex string must start with \\x prefix');
  }
  const hex = value.slice(2);
  if (hex.length % 2 !== 0) {
    throw new Error('Bytea hex string has odd length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
