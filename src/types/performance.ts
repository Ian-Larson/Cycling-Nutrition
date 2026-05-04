/**
 * One logged FTP value. The rider's "current FTP" is the most recent entry
 * (by recordedAt). History is append-only; edits issue a new entry and may
 * delete the prior one.
 */
export interface FtpHistoryEntry {
  id: string;
  /** ISO-8601 date the FTP value started applying. */
  recordedAt: string;
  ftpWatts: number;
  note?: string;
}

/**
 * One logged weight value. Mirror of FtpHistoryEntry.
 */
export interface WeightHistoryEntry {
  id: string;
  /** ISO-8601 date the weight value applied. */
  recordedAt: string;
  weightKg: number;
  note?: string;
}
