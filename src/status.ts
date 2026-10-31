import { readdirSync } from 'node:fs';
import { readNight } from './digest/read.js';
import type { NightDigest } from './digest/types.js';
import type { RigConfig } from './config.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type NightCounts = { ok: number; retry: number; fail: number };

export type NightOnDisk = {
  night: string;
  /** Null when the night has no readable file; the view renders — (styleguide). */
  counts: NightCounts | null;
};

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightOnDisk[];
};

// Attempt rollup for one night: clean runs, retry attempts, jobs that ended in fail.
export function nightCounts(digest: NightDigest): NightCounts {
  let ok = 0;
  let retry = 0;
  let fail = 0;
  for (const row of digest.rows) {
    retry += row.retries;
    ok += row.runs - row.retries;
    if (row.lastStatus === 'fail') fail += 1;
  }
  return { ok, retry, fail };
}

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function readStatus(config: RigConfig): Status {
  const nights = nightsOnDisk(config.runsDir).map((night) => {
    const digest = readNight(config.runsDir, night);
    return { night, counts: digest === null ? null : nightCounts(digest) };
  });
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights: nights,
  };
}
