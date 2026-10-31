import type { NightDigest } from '../digest/types.js';

// Missing data renders as —, never as an empty cell (styleguide). Times keep the offset from
// the log; the reader never converts them.
function ownerCell(owner: string | null) {
  return owner ?? '—';
}

// Retries of 3 or more and any fail are marked (plan § 2a).
function isMarked(row: { retries: number; lastStatus: string }) {
  return row.retries >= 3 || row.lastStatus === 'fail';
}

export function DigestPage({ digest }: { digest: NightDigest }) {
  if (digest.rows.length === 0) {
    return (
      <>
        <h1>digest · {digest.night}</h1>
        <p class="mute">nothing ran</p>
      </>
    );
  }
  return (
    <>
      <h1>digest · {digest.night}</h1>
      {digest.badLines > 0 && (
        <p class="mute">
          {digest.badLines} unread line{digest.badLines === 1 ? '' : 's'}
        </p>
      )}
      <table>
        <thead>
          <tr>
            <th>job</th>
            <th>owner</th>
            <th>runs</th>
            <th>retries</th>
            <th>last status</th>
            <th>last error</th>
            <th>first</th>
            <th>last</th>
          </tr>
        </thead>
        <tbody>
          {digest.rows.map((row) => (
            <tr>
              <td class={isMarked(row) ? 'warn' : undefined}>{row.job}</td>
              <td>{ownerCell(row.owner)}</td>
              <td>{row.runs}</td>
              <td class={row.retries >= 3 ? 'warn' : undefined}>{row.retries}</td>
              <td class={row.lastStatus === 'fail' ? 'warn' : undefined}>{row.lastStatus}</td>
              <td>{row.lastError ?? '—'}</td>
              <td>{row.firstAt}</td>
              <td>{row.lastAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
