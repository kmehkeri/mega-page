import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { RigConfig } from '../src/config.js';

// `runs/` is read-only: every fixture lives in a temp dir (plan § 2d).
let runsDir: string;
let config: RigConfig;

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir };
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

const line = (job: string, status: 'ok' | 'retry' | 'fail', extra: Record<string, unknown> = {}) =>
  JSON.stringify({ at: '2026-10-29T03:00:00+01:00', job, status, owner: 'ada', ...extra });

// Jobs in page order, parsed out of the tbody cells — page and JSON must never
// disagree (ADR 0001).
function pageJobs(html: string): string[] {
  const body = html.split('<tbody>')[1] ?? '';
  return [...body.matchAll(/<tr>(<td[^>]*>([^<]+)<\/td>)/g)].map((m) => m[2]);
}

type JsonDigest = {
  night: string;
  rows: { job: string; owner: string | null; runs: number; retries: number; lastStatus: string; lastError: string | null; firstAt: string; lastAt: string }[];
  badLines: number;
};

describe('GET /digest/:night', () => {
  it('answers 200 and renders the rows for a normal night', async () => {
    writeFileSync(join(runsDir, '2030-01-01.jsonl'), `${line('alpha', 'ok')}\n${line('beta', 'retry')}\n`);
    const res = await createApp(config).request('/digest/2030-01-01');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('alpha');
    expect(html).toContain('beta');
  });

  it('answers 404 for a night with no file', async () => {
    const res = await createApp(config).request('/digest/2030-01-02');
    expect(res.status).toBe(404);
  });

  it('renders "nothing ran" for an empty night', async () => {
    writeFileSync(join(runsDir, '2030-01-03.jsonl'), '');
    const res = await createApp(config).request('/digest/2030-01-03');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('counts a bad line and still renders the night', async () => {
    writeFileSync(
      join(runsDir, '2030-01-04.jsonl'),
      `${line('alpha', 'ok')}\nthis is not json\n`,
    );
    const res = await createApp(config).request('/digest/2030-01-04');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('1 unread line');
    expect(html).toContain('alpha');
  });
});

describe('GET /api/digest/:night', () => {
  it('answers 200 with the rows for a normal night', async () => {
    const res = await createApp(config).request('/api/digest/2030-01-01');
    expect(res.status).toBe(200);
    const json = (await res.json()) as JsonDigest;
    expect(json.night).toBe('2030-01-01');
    expect(json.rows.map((r) => r.job)).toEqual(['alpha', 'beta']);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await createApp(config).request('/api/digest/2030-01-02');
    expect(res.status).toBe(404);
  });

  it('returns 0 rows for an empty night', async () => {
    const res = await createApp(config).request('/api/digest/2030-01-03');
    expect(res.status).toBe(200);
    const json = (await res.json()) as JsonDigest;
    expect(json.rows).toEqual([]);
  });

  it('counts a bad line and keeps the good rows', async () => {
    const res = await createApp(config).request('/api/digest/2030-01-04');
    expect(res.status).toBe(200);
    const json = (await res.json()) as JsonDigest;
    expect(json.badLines).toBe(1);
    expect(json.rows.map((r) => r.job)).toEqual(['alpha']);
  });
});

describe('page and JSON agree (ADR 0001)', () => {
  it('return the same jobs in the same order for the same night', async () => {
    const page = await createApp(config).request('/digest/2030-01-01');
    const api = await createApp(config).request('/api/digest/2030-01-01');
    expect(page.status).toBe(200);
    expect(api.status).toBe(200);
    const json = (await api.json()) as JsonDigest;
    expect(pageJobs(await page.text())).toEqual(json.rows.map((r) => r.job));
  });

  it('agree on the night with a bad line too', async () => {
    const page = await createApp(config).request('/digest/2030-01-04');
    const api = await createApp(config).request('/api/digest/2030-01-04');
    const json = (await api.json()) as JsonDigest;
    expect(pageJobs(await page.text())).toEqual(json.rows.map((r) => r.job));
  });
});
