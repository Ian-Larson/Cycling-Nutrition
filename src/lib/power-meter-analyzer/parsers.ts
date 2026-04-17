import type {
  AnalyzerPoint,
  AnalyzerSourceType,
  ParsedAnalyzerFile,
} from './types';

const FIT_EPOCH_MS = Date.UTC(1989, 11, 31);

interface FitFieldDefinition {
  fieldNumber: number;
  size: number;
  baseType: number;
}

interface FitDefinitionMessage {
  globalMessageNumber: number;
  littleEndian: boolean;
  fields: FitFieldDefinition[];
  developerFields: FitFieldDefinition[];
}

interface NormalizedRecordPoint extends AnalyzerPoint {
  timestamp: number;
}

type FitScalar = number | string | number[] | undefined;

function getFileExtension(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? '';
}

function getSourceType(fileName: string): AnalyzerSourceType {
  const extension = getFileExtension(fileName);

  if (extension === 'fit') return 'fit';
  if (extension === 'tcx') return 'tcx';
  if (extension === 'gpx') return 'gpx';
  if (extension === 'csv') return 'csv';

  throw new Error(`${fileName} is not a supported file type.`);
}

function normalizeParsedFile(
  fileName: string,
  sourceType: AnalyzerSourceType,
  points: AnalyzerPoint[],
  warnings: string[]
): ParsedAnalyzerFile {
  const normalized = points
    .filter((point): point is NormalizedRecordPoint => {
      return typeof point.timestamp === 'number' && Number.isFinite(point.timestamp);
    })
    .filter((point) => {
      return (
        typeof point.power === 'number' ||
        typeof point.heartRate === 'number' ||
        typeof point.cadence === 'number' ||
        typeof point.distanceMeters === 'number'
      );
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  const powerPointCount = normalized.filter(
    (point) => typeof point.power === 'number'
  ).length;
  const startedAt = normalized[0]?.timestamp;
  const endedAt = normalized[normalized.length - 1]?.timestamp;

  if (normalized.length === 0) {
    warnings.push('No timestamped data points were found.');
  } else if (powerPointCount === 0) {
    warnings.push('No power samples were found in this file.');
  }

  return {
    fileName,
    sourceType,
    points: normalized,
    warnings,
    startedAt,
    endedAt,
    durationSeconds:
      startedAt !== undefined && endedAt !== undefined
        ? Math.max(0, (endedAt - startedAt) / 1000)
        : 0,
    powerPointCount,
  };
}

function getChildTextByLocalName(element: Element, localName: string): string | undefined {
  const elements = element.getElementsByTagName('*');
  for (const child of Array.from(elements)) {
    if (child.localName.toLowerCase() === localName.toLowerCase()) {
      const value = child.textContent?.trim();
      if (value) return value;
    }
  }

  return undefined;
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseTimestamp(value: string | undefined): number | undefined {
  if (!value) return undefined;

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function getFirstNumberByNames(element: Element, names: string[]): number | undefined {
  for (const name of names) {
    const value = parseOptionalNumber(getChildTextByLocalName(element, name));
    if (value !== undefined) return value;
  }

  return undefined;
}

function parseXml(text: string, fileName: string): Document {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const parseError = doc.getElementsByTagName('parsererror')[0];

  if (parseError) {
    throw new Error(`${fileName} is not valid XML.`);
  }

  return doc;
}

function parseTcx(text: string, fileName: string): ParsedAnalyzerFile {
  const doc = parseXml(text, fileName);
  const trackpoints = Array.from(doc.getElementsByTagName('*')).filter(
    (element) => element.localName === 'Trackpoint'
  );
  const points: AnalyzerPoint[] = [];

  for (const trackpoint of trackpoints) {
    const timestamp = parseTimestamp(getChildTextByLocalName(trackpoint, 'Time'));
    if (timestamp === undefined) continue;

    points.push({
      timestamp,
      power: getFirstNumberByNames(trackpoint, ['Watts', 'PowerInWatts', 'Power']),
      heartRate: getFirstNumberByNames(trackpoint, ['HeartRateBpm', 'Value']),
      cadence: getFirstNumberByNames(trackpoint, ['Cadence']),
      distanceMeters: getFirstNumberByNames(trackpoint, ['DistanceMeters']),
      speedMetersPerSecond: getFirstNumberByNames(trackpoint, ['Speed']),
      altitudeMeters: getFirstNumberByNames(trackpoint, ['AltitudeMeters']),
    });
  }

  return normalizeParsedFile(fileName, 'tcx', points, []);
}

function parseGpx(text: string, fileName: string): ParsedAnalyzerFile {
  const doc = parseXml(text, fileName);
  const trackpoints = Array.from(doc.getElementsByTagName('*')).filter(
    (element) => element.localName === 'trkpt'
  );
  const points: AnalyzerPoint[] = [];

  for (const trackpoint of trackpoints) {
    const timestamp = parseTimestamp(getChildTextByLocalName(trackpoint, 'time'));
    if (timestamp === undefined) continue;

    points.push({
      timestamp,
      power: getFirstNumberByNames(trackpoint, [
        'power',
        'watts',
        'PowerInWatts',
        'Power',
      ]),
      heartRate: getFirstNumberByNames(trackpoint, ['hr', 'heartRate', 'HeartRate']),
      cadence: getFirstNumberByNames(trackpoint, ['cad', 'cadence', 'Cadence']),
      altitudeMeters: getFirstNumberByNames(trackpoint, ['ele']),
    });
  }

  return normalizeParsedFile(fileName, 'gpx', points, []);
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(cell);
      if (row.some((value) => value.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== '')) {
    rows.push(row);
  }

  return rows;
}

function findCsvColumn(headers: string[], candidates: string[]): number {
  const normalizedHeaders = headers.map((header) =>
    header.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
  );

  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const index = normalizedHeaders.indexOf(normalized);
    if (index >= 0) return index;
  }

  return -1;
}

function getCsvNumber(row: string[], index: number): number | undefined {
  if (index < 0) return undefined;
  return parseOptionalNumber(row[index]?.trim());
}

function parseCsv(text: string, fileName: string): ParsedAnalyzerFile {
  const rows = parseCsvRows(text);
  const headers = rows[0] ?? [];
  const timestampIndex = findCsvColumn(headers, [
    'timestamp',
    'time',
    'date',
    'datetime',
    'start time',
  ]);
  const elapsedIndex = findCsvColumn(headers, [
    'elapsed',
    'elapsed seconds',
    'seconds',
    'time seconds',
  ]);
  const powerIndex = findCsvColumn(headers, ['power', 'watts', 'w']);
  const cadenceIndex = findCsvColumn(headers, ['cadence', 'rpm']);
  const heartRateIndex = findCsvColumn(headers, ['heart rate', 'hr', 'bpm']);
  const distanceIndex = findCsvColumn(headers, ['distance', 'distance meters']);
  const speedIndex = findCsvColumn(headers, ['speed', 'speed meters per second']);
  const balanceIndex = findCsvColumn(headers, [
    'left right balance',
    'left balance',
    'lr balance',
  ]);
  const warnings: string[] = [];

  if (timestampIndex < 0 && elapsedIndex < 0) {
    throw new Error(
      `${fileName} needs either a timestamp/time column or an elapsed seconds column.`
    );
  }

  if (powerIndex < 0) {
    warnings.push('No power column was detected.');
  }

  const firstTimestamp =
    timestampIndex >= 0 ? parseTimestamp(rows[1]?.[timestampIndex]?.trim()) : undefined;
  const syntheticStart = firstTimestamp ?? Date.UTC(2000, 0, 1);

  const points = rows.slice(1).flatMap((row) => {
    const timestamp =
      timestampIndex >= 0
        ? parseTimestamp(row[timestampIndex]?.trim())
        : undefined;
    const elapsed = getCsvNumber(row, elapsedIndex);
    const resolvedTimestamp =
      timestamp ??
      (elapsed !== undefined ? syntheticStart + elapsed * 1000 : undefined);

    if (resolvedTimestamp === undefined) return [];

    return [
      {
        timestamp: resolvedTimestamp,
        power: getCsvNumber(row, powerIndex),
        cadence: getCsvNumber(row, cadenceIndex),
        heartRate: getCsvNumber(row, heartRateIndex),
        distanceMeters: getCsvNumber(row, distanceIndex),
        speedMetersPerSecond: getCsvNumber(row, speedIndex),
        leftRightBalance: getCsvNumber(row, balanceIndex),
      },
    ];
  });

  return normalizeParsedFile(fileName, 'csv', points, warnings);
}

function readUintBySize(
  view: DataView,
  offset: number,
  size: number,
  littleEndian: boolean
): number {
  if (size === 1) return view.getUint8(offset);
  if (size === 2) return view.getUint16(offset, littleEndian);
  if (size === 4) return view.getUint32(offset, littleEndian);

  let value = 0;
  for (let index = 0; index < size; index += 1) {
    const byteOffset = littleEndian ? index : size - 1 - index;
    value += view.getUint8(offset + byteOffset) * 256 ** index;
  }
  return value;
}

function readIntBySize(
  view: DataView,
  offset: number,
  size: number,
  littleEndian: boolean
): number {
  if (size === 1) return view.getInt8(offset);
  if (size === 2) return view.getInt16(offset, littleEndian);
  if (size === 4) return view.getInt32(offset, littleEndian);

  const unsigned = readUintBySize(view, offset, size, littleEndian);
  const max = 2 ** (size * 8);
  const signBit = max / 2;
  return unsigned >= signBit ? unsigned - max : unsigned;
}

function getBaseTypeSize(baseType: number): number {
  const type = baseType & 0x1f;
  if (type === 3 || type === 4 || type === 11) return 2;
  if (type === 5 || type === 6 || type === 8 || type === 12) return 4;
  if (type === 9 || type === 14 || type === 15 || type === 16) return 8;
  return 1;
}

function isInvalidFitValue(value: number, baseType: number, size: number): boolean {
  const type = baseType & 0x1f;
  if (type === 0 || type === 2 || type === 13) return value === 0xff;
  if (type === 1) return value === 0x7f;
  if (type === 3) return value === 0x7fff;
  if (type === 4) return value === 0xffff;
  if (type === 5) return value === 0x7fffffff;
  if (type === 6) return value === 0xffffffff;
  if (type === 10 || type === 11 || type === 12 || type === 16) return value === 0;
  if (size === 8 && (type === 15 || type === 16)) {
    return value === Number.MAX_SAFE_INTEGER;
  }
  return false;
}

function readFitScalar(
  view: DataView,
  offset: number,
  baseType: number,
  unitSize: number,
  littleEndian: boolean
): number | string | undefined {
  const type = baseType & 0x1f;

  if (type === 7) {
    const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, unitSize);
    const zeroIndex = bytes.indexOf(0);
    return new TextDecoder().decode(
      zeroIndex >= 0 ? bytes.slice(0, zeroIndex) : bytes
    );
  }

  if (type === 8) {
    const value = view.getFloat32(offset, littleEndian);
    return Number.isFinite(value) ? value : undefined;
  }

  if (type === 9) {
    const value = view.getFloat64(offset, littleEndian);
    return Number.isFinite(value) ? value : undefined;
  }

  const signed = type === 1 || type === 3 || type === 5 || type === 14;
  const value = signed
    ? readIntBySize(view, offset, unitSize, littleEndian)
    : readUintBySize(view, offset, unitSize, littleEndian);

  if (isInvalidFitValue(value, baseType, unitSize)) return undefined;
  return value;
}

function readFitField(
  view: DataView,
  offset: number,
  definition: FitFieldDefinition,
  littleEndian: boolean
): FitScalar {
  const baseSize = getBaseTypeSize(definition.baseType);
  const count = Math.max(1, Math.floor(definition.size / baseSize));

  if ((definition.baseType & 0x1f) === 7) {
    return readFitScalar(
      view,
      offset,
      definition.baseType,
      definition.size,
      littleEndian
    );
  }

  const values: number[] = [];

  for (let index = 0; index < count; index += 1) {
    const value = readFitScalar(
      view,
      offset + index * baseSize,
      definition.baseType,
      baseSize,
      littleEndian
    );
    if (typeof value === 'number') values.push(value);
  }

  if (values.length === 0) return undefined;
  return values.length === 1 ? values[0] : values;
}

function getFitNumber(values: Map<number, FitScalar>, fieldNumber: number): number | undefined {
  const value = values.get(fieldNumber);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function decodeFitTimestamp(fitTimestamp: number | undefined): number | undefined {
  if (fitTimestamp === undefined) return undefined;
  return FIT_EPOCH_MS + fitTimestamp * 1000;
}

function decodeLeftRightBalance(raw: number | undefined): number | undefined {
  if (raw === undefined) return undefined;

  const rounded = Math.round(raw);
  if (rounded < 0) return undefined;

  const value = (rounded & 0x7f) / 2;
  const isRight = (rounded & 0x80) === 0x80;
  const leftContribution = isRight ? 100 - value : value;

  if (leftContribution < 0 || leftContribution > 100) return undefined;
  return leftContribution;
}

function parseFitRecordValues(values: Map<number, FitScalar>): AnalyzerPoint | undefined {
  const timestamp = decodeFitTimestamp(getFitNumber(values, 253));
  if (timestamp === undefined) return undefined;

  const speed = getFitNumber(values, 73) ?? getFitNumber(values, 6);
  const altitude = getFitNumber(values, 78) ?? getFitNumber(values, 2);

  return {
    timestamp,
    power: getFitNumber(values, 7),
    heartRate: getFitNumber(values, 3),
    cadence: getFitNumber(values, 4),
    distanceMeters:
      getFitNumber(values, 5) !== undefined ? getFitNumber(values, 5)! / 100 : undefined,
    speedMetersPerSecond: speed !== undefined ? speed / 1000 : undefined,
    altitudeMeters: altitude !== undefined ? altitude / 5 - 500 : undefined,
    leftRightBalance: decodeLeftRightBalance(getFitNumber(values, 30)),
  };
}

function readFitDataMessage(
  view: DataView,
  offset: number,
  definition: FitDefinitionMessage
): { values: Map<number, FitScalar>; nextOffset: number } {
  const values = new Map<number, FitScalar>();
  let cursor = offset;

  for (const field of definition.fields) {
    values.set(
      field.fieldNumber,
      readFitField(view, cursor, field, definition.littleEndian)
    );
    cursor += field.size;
  }

  for (const field of definition.developerFields) {
    cursor += field.size;
  }

  return {
    values,
    nextOffset: cursor,
  };
}

function parseFit(arrayBuffer: ArrayBuffer, fileName: string): ParsedAnalyzerFile {
  const view = new DataView(arrayBuffer);
  const warnings: string[] = [];

  if (view.byteLength < 14) {
    throw new Error(`${fileName} is too small to be a FIT file.`);
  }

  const headerSize = view.getUint8(0);
  const dataSize = view.getUint32(4, true);
  const signature = new TextDecoder().decode(
    new Uint8Array(arrayBuffer, 8, Math.min(4, view.byteLength - 8))
  );

  if (signature !== '.FIT') {
    throw new Error(`${fileName} does not have a FIT signature.`);
  }

  const dataEnd = headerSize + dataSize;
  if (dataEnd > view.byteLength) {
    throw new Error(`${fileName} appears to be truncated.`);
  }

  const definitions = new Map<number, FitDefinitionMessage>();
  const points: AnalyzerPoint[] = [];
  let offset = headerSize;
  let lastFitTimestamp: number | undefined;

  while (offset < dataEnd) {
    const header = view.getUint8(offset);
    offset += 1;

    if ((header & 0x80) === 0x80) {
      const localMessageType = (header >> 5) & 0x03;
      const timeOffset = header & 0x1f;
      const definition = definitions.get(localMessageType);
      if (!definition) {
        warnings.push('Skipped a compressed timestamp message with no definition.');
        break;
      }

      const data = readFitDataMessage(view, offset, definition);
      offset = data.nextOffset;

      if (lastFitTimestamp !== undefined) {
        let timestamp = (lastFitTimestamp & ~0x1f) + timeOffset;
        if (timestamp <= lastFitTimestamp) timestamp += 32;
        data.values.set(253, timestamp);
        lastFitTimestamp = timestamp;
      }

      if (definition.globalMessageNumber === 20) {
        const point = parseFitRecordValues(data.values);
        if (point) points.push(point);
      }
      continue;
    }

    const isDefinition = (header & 0x40) === 0x40;
    const hasDeveloperData = (header & 0x20) === 0x20;
    const localMessageType = header & 0x0f;

    if (isDefinition) {
      offset += 1;
      const architecture = view.getUint8(offset);
      offset += 1;
      const littleEndian = architecture === 0;
      const globalMessageNumber = view.getUint16(offset, littleEndian);
      offset += 2;
      const fieldCount = view.getUint8(offset);
      offset += 1;
      const fields: FitFieldDefinition[] = [];
      const developerFields: FitFieldDefinition[] = [];

      for (let fieldIndex = 0; fieldIndex < fieldCount; fieldIndex += 1) {
        fields.push({
          fieldNumber: view.getUint8(offset),
          size: view.getUint8(offset + 1),
          baseType: view.getUint8(offset + 2),
        });
        offset += 3;
      }

      if (hasDeveloperData) {
        const developerFieldCount = view.getUint8(offset);
        offset += 1;

        for (
          let developerFieldIndex = 0;
          developerFieldIndex < developerFieldCount;
          developerFieldIndex += 1
        ) {
          developerFields.push({
            fieldNumber: view.getUint8(offset),
            size: view.getUint8(offset + 1),
            baseType: view.getUint8(offset + 2),
          });
          offset += 3;
        }
      }

      definitions.set(localMessageType, {
        globalMessageNumber,
        littleEndian,
        fields,
        developerFields,
      });
      continue;
    }

    const definition = definitions.get(localMessageType);
    if (!definition) {
      warnings.push('Skipped a data message with no definition.');
      break;
    }

    const data = readFitDataMessage(view, offset, definition);
    offset = data.nextOffset;

    const timestamp = getFitNumber(data.values, 253);
    if (timestamp !== undefined) {
      lastFitTimestamp = timestamp;
    }

    if (definition.globalMessageNumber === 20) {
      const point = parseFitRecordValues(data.values);
      if (point) points.push(point);
    }
  }

  return normalizeParsedFile(fileName, 'fit', points, warnings);
}

export async function parsePowerMeterFile(file: File): Promise<ParsedAnalyzerFile> {
  const sourceType = getSourceType(file.name);

  if (sourceType === 'fit') {
    return parseFit(await file.arrayBuffer(), file.name);
  }

  const text = await file.text();

  if (sourceType === 'tcx') return parseTcx(text, file.name);
  if (sourceType === 'gpx') return parseGpx(text, file.name);
  return parseCsv(text, file.name);
}
