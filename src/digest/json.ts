import type { DigestRow, NightDigest } from './types.js';

/**
 * JSON shape of the digest — plan § 2b.
 * The fields mirror `DigestRow` one to one, in the same order, so the page
 * and the JSON can never disagree (ADR 0001): both come from `readNight`.
 */
export type DigestJson = {
  night: string;
  rows: DigestRow[];
  badLines: number;
};

export const toJson = (digest: NightDigest): DigestJson => ({
  night: digest.night,
  rows: digest.rows.map((row) => ({
    job: row.job,
    owner: row.owner,
    runs: row.runs,
    retries: row.retries,
    lastStatus: row.lastStatus,
    lastError: row.lastError,
    firstAt: row.firstAt,
    lastAt: row.lastAt,
  })),
  badLines: digest.badLines,
});
