import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from './read.js';

describe('readNight on runs/2026-10-28.jsonl', () => {
  const digest = readNight('runs', '2026-10-28');

  it('reads five jobs and counts the one bad line', () => {
    expect(digest).not.toBeNull();
    expect(digest?.night).toBe('2026-10-28');
    expect(digest?.rows).toHaveLength(5);
    expect(digest?.badLines).toBe(1);
  });

  it('returns rows sorted by job', () => {
    expect(digest?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('aggregates runs, retries, last status, last error and times', () => {
    const sync = digest?.rows.find((r) => r.job === 'lane/sync');
    expect(sync).toEqual({
      job: 'lane/sync',
      owner: 'rook',
      runs: 8,
      retries: 1,
      lastStatus: 'ok',
      lastError: 'lock held',
      firstAt: '2026-10-28T23:00:06+01:00',
      lastAt: '2026-10-29T05:00:04+01:00',
    });

    const refresh = digest?.rows.find((r) => r.job === 'fixtures/refresh');
    expect(refresh).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: 'upstream 503' });

    const backup = digest?.rows.find((r) => r.job === 'notes/backup');
    expect(backup).toMatchObject({ runs: 1, retries: 0, lastStatus: 'fail', lastError: 'quota exceeded' });
  });

  it('keeps the null-owner row and exposes the null', () => {
    const render = digest?.rows.find((r) => r.job === 'digest/render');
    expect(render).toMatchObject({ job: 'digest/render', owner: null, runs: 1, lastStatus: 'ok', lastError: null });
  });

  it('keeps the offset from the log', () => {
    expect(digest?.rows.every((r) => r.firstAt.endsWith('+01:00') && r.lastAt.endsWith('+01:00'))).toBe(true);
  });
});

describe('readNight edge cases (temp runs dir)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));

  it('returns null for a night with no file', () => {
    expect(readNight(dir, '1999-01-01')).toBeNull();
  });

  it('renders an empty file as zero rows, zero bad lines', () => {
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    expect(readNight(dir, '2026-01-01')).toEqual({ night: '2026-01-01', rows: [], badLines: 0 });
  });

  it('counts lines that do not parse, never throws', () => {
    writeFileSync(
      join(dir, '2026-01-02.jsonl'),
      [
        '{"at":"2026-01-02T01:00:00+01:00","job":"a","status":"ok","owner":"rook"}',
        'not json at all',
        '{"at":"2026-01-02T02:00:00+01:00","job":"a","status":"nope","owner":"rook"}',
        '{"at":"2026-01-02T03:00:00+01:00","job":"b","status":"retry","owner":null,"error":"x"}',
        '',
      ].join('\n'),
    );
    const digest = readNight(dir, '2026-01-02');
    expect(digest?.badLines).toBe(2);
    expect(digest?.rows).toHaveLength(2);
    expect(digest?.rows.find((r) => r.job === 'b')).toMatchObject({ owner: null, retries: 1, lastError: 'x' });
  });
});
