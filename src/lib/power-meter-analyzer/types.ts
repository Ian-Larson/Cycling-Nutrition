export type AnalyzerSourceType = 'fit' | 'tcx' | 'gpx' | 'csv';

export type MeterMode = 'total' | 'leftOnlyDoubled' | 'rightOnlyDoubled';

export type PowerViewMode = 'total' | 'left' | 'right';

export interface AnalyzerPoint {
  timestamp: number;
  power?: number;
  heartRate?: number;
  cadence?: number;
  distanceMeters?: number;
  speedMetersPerSecond?: number;
  altitudeMeters?: number;
  leftRightBalance?: number;
}

export interface ParsedAnalyzerFile {
  fileName: string;
  sourceType: AnalyzerSourceType;
  points: AnalyzerPoint[];
  warnings: string[];
  startedAt?: number;
  endedAt?: number;
  durationSeconds: number;
  powerPointCount: number;
}

export interface AnalyzerFileState {
  id: string;
  parsed: ParsedAnalyzerFile;
  displayName: string;
  color: string;
  visible: boolean;
  offsetSeconds: number;
  meterMode: MeterMode;
}

export interface SeriesPoint {
  timestamp: number;
  elapsedSeconds: number;
  value: number;
  rawPower?: number;
  leftRightBalance?: number;
}

export interface ChartSeries {
  id: string;
  name: string;
  color: string;
  points: SeriesPoint[];
}

export interface FileSummary {
  id: string;
  name: string;
  color: string;
  durationSeconds: number;
  samples: number;
  averagePower?: number;
  maxPower?: number;
  zeroPercent?: number;
  comparedSamples?: number;
  averageDeltaWatts?: number;
  biasPercent?: number;
  meanAbsoluteError?: number;
  rootMeanSquareError?: number;
  correlation?: number;
  withinThreePercent?: number;
}

export interface ComparisonPoint {
  elapsedSeconds: number;
  timestamp: number;
  referenceValue: number;
  comparisonValue: number;
}

export interface ReferenceComparison {
  fileId: string;
  fileName: string;
  color: string;
  points: ComparisonPoint[];
  averageDeltaWatts?: number;
  biasPercent?: number;
  meanAbsoluteError?: number;
  rootMeanSquareError?: number;
  correlation?: number;
  withinThreePercent?: number;
}

export interface MeanMaxPoint {
  durationSeconds: number;
  value: number;
}
