import type {
  FtpHistoryEntry,
  WeightHistoryEntry,
} from '@/types/performance';
import { closestPriorEntry } from './history';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeCurrentWkg(
  ftpWatts: number | undefined,
  weightKg: number | undefined
): number | undefined {
  if (typeof ftpWatts !== 'number' || ftpWatts <= 0) return undefined;
  if (typeof weightKg !== 'number' || weightKg <= 0) return undefined;
  return ftpWatts / weightKg;
}

export function computeWkgAtDate(
  ftpHistory: readonly FtpHistoryEntry[],
  weightHistory: readonly WeightHistoryEntry[],
  isoDate: string
): number | undefined {
  const ftp = closestPriorEntry(ftpHistory, isoDate);
  const weight = closestPriorEntry(weightHistory, isoDate);
  if (!ftp || !weight || weight.weightKg <= 0) return undefined;
  return ftp.ftpWatts / weight.weightKg;
}

export interface WkgDeltaInput {
  ftpHistory: readonly FtpHistoryEntry[];
  weightHistory: readonly WeightHistoryEntry[];
  currentWkg: number;
  daysAgo: number;
  now?: Date;
}

export function computeWkgDeltaVsDaysAgo({
  ftpHistory,
  weightHistory,
  currentWkg,
  daysAgo,
  now = new Date(),
}: WkgDeltaInput): number | undefined {
  const target = new Date(now.getTime() - daysAgo * MS_PER_DAY);
  const isoDate = target.toISOString().slice(0, 10);
  const past = computeWkgAtDate(ftpHistory, weightHistory, isoDate);
  if (past === undefined) return undefined;
  return currentWkg - past;
}
