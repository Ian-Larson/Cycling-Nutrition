import { describe, expect, it } from 'vitest';
import { parsePowerMeterFile } from './parsers';

const FIT_EPOCH_MS = Date.UTC(1989, 11, 31);

function pushUint16(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >> 8) & 0xff);
}

function pushUint32(bytes: number[], value: number) {
  bytes.push(
    value & 0xff,
    (value >> 8) & 0xff,
    (value >> 16) & 0xff,
    (value >> 24) & 0xff
  );
}

function makeMinimalFitFile(): ArrayBuffer {
  const data: number[] = [];
  const startFitTimestamp = Math.round(
    (Date.UTC(2026, 0, 1, 12, 0, 0) - FIT_EPOCH_MS) / 1000
  );

  data.push(0x40, 0x00, 0x00);
  pushUint16(data, 20);
  data.push(4);
  data.push(253, 4, 0x86);
  data.push(7, 2, 0x84);
  data.push(4, 1, 0x02);
  data.push(30, 1, 0x02);

  [
    { timestamp: startFitTimestamp, power: 250, cadence: 91, balance: 100 },
    { timestamp: startFitTimestamp + 1, power: 260, cadence: 92, balance: 102 },
  ].forEach((record) => {
    data.push(0x00);
    pushUint32(data, record.timestamp);
    pushUint16(data, record.power);
    data.push(record.cadence, record.balance);
  });

  const header: number[] = [14, 0x10, 0, 0];
  pushUint32(header, data.length);
  header.push(0x2e, 0x46, 0x49, 0x54, 0, 0);

  return new Uint8Array([...header, ...data]).buffer;
}

describe('parsePowerMeterFile', () => {
  it('extracts timestamped power samples from a FIT record stream', async () => {
    const file = {
      name: 'dual-sided.fit',
      arrayBuffer: async () => makeMinimalFitFile(),
    } as File;

    const parsed = await parsePowerMeterFile(file);

    expect(parsed.sourceType).toBe('fit');
    expect(parsed.points).toHaveLength(2);
    expect(parsed.points[0].power).toBe(250);
    expect(parsed.points[0].cadence).toBe(91);
    expect(parsed.points[0].leftRightBalance).toBe(50);
    expect(parsed.powerPointCount).toBe(2);
  });

  it('accepts CSV files with elapsed seconds', async () => {
    const file = {
      name: 'power.csv',
      text: async () => 'elapsed seconds,power,cadence\n0,200,88\n1,210,89\n',
    } as File;

    const parsed = await parsePowerMeterFile(file);

    expect(parsed.sourceType).toBe('csv');
    expect(parsed.points.map((point) => point.power)).toEqual([200, 210]);
    expect(parsed.durationSeconds).toBe(1);
  });
});
