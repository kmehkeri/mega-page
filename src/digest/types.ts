// Digest contract — plan.md § 1. Section 2 builds against this file.

export type RunStatus = 'ok' | 'retry' | 'fail';

/** One line of runs/<night>.jsonl. `owner` may be null; `error` is optional. */
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

/** One row per job for the night. Times keep the log's offset (styleguide). */
export type DigestRow = {
  job: string;
  /** Null stays null here; rendering it as — is a view concern. */
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  /** Error of the most recent line that carried one; null if none did. */
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type NightDigest = {
  night: string;
  /** Sorted by job, so the page and the JSON never disagree (ADR 0001). */
  rows: DigestRow[];
  /** Lines that did not parse. Counted, never thrown. */
  badLines: number;
};

/**
 * Reads runsDir/<night>.jsonl into one row per job.
 * Returns null when the night has no file on disk (the route answers 404).
 */
export type ReadNight = (runsDir: string, night: string) => NightDigest | null;
