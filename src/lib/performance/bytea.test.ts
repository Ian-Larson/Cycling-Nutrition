import { describe, expect, it } from 'vitest';
import { decodeByteaHex } from './bytea';

describe('decodeByteaHex', () => {
  it('decodes the empty string \\x to an empty Uint8Array', () => {
    expect(decodeByteaHex('\\x')).toEqual(new Uint8Array());
  });

  it('decodes a short hex string', () => {
    expect(decodeByteaHex('\\x0102ff')).toEqual(new Uint8Array([1, 2, 255]));
  });

  it('decodes uppercase hex', () => {
    expect(decodeByteaHex('\\xABCD')).toEqual(new Uint8Array([0xab, 0xcd]));
  });

  it('throws on missing \\x prefix', () => {
    expect(() => decodeByteaHex('0102')).toThrow(/prefix/i);
  });

  it('throws on odd-length hex', () => {
    expect(() => decodeByteaHex('\\x012')).toThrow(/length/i);
  });
});
