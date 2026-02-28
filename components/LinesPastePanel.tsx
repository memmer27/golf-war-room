'use client';

import { useMemo, useState } from 'react';

type ParsedRow = {
  player: string;
  opponent?: string;
  tee_time?: string;
  round?: number;
  line: number;
  market: string;
};

const MARKETS = [
  { key: 'Strokes', label: 'Strokes' },
  { key: 'Birdies Or Better', label: 'Birdies Or Better' },
  { key: 'Fairways Hit', label: 'Fairways Hit' },
  { key: 'Greens In Regulation', label: 'Greens In Regulation' },
  { key: 'Pars', label: 'Pars' },
  { key: 'Birdies or Better Matchup', label: 'Matchups (BoB)' }
];

function safeNum(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mostCommonRound(rows: ParsedRow[]): number | null {
  const counts: Record<number, number> = {};
  for (const r of rows) {
    if (!r.round) continue;
    counts[r.round] = (counts[r.round] ?? 0) + 1;
  }
  const entries = Object.entries(counts).map(([k, v]) => [Number(k), v] as const);
  entries.sort((a, b) => b[1] - a[1]);
  return entries.length ? entries[0][0] : null;
}

export default function LinesPastePanel() {
  const [market, setMarket] = useState(MARKETS[0].key);
  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  const [eventId, setEventId] = useState('cognizant');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [round, setRound] = useState<number>(2);

  const placeholder = useMemo(
    () => `Paste one market board (all players) like:

Michael Brennan
Michael Brennan - G
Michael Brennan
vs PGA National Golf Club Champion Course RD 2 Fri 6:21am
70.5
Strokes
Less
More
Trending
241
...`,
    []
  );

  function syncUrl(next?: { eventId?: string; year?: number; round?: number }) {
    if (typeof window === 'undefined') return;
    const e = next?.eventId ?? eventId;
    const y = next?.year ?? year;
    const r = next?.round ?? round;

    const u = new URL(window.location.href);
    u.searchParams.set('event_id', e);
    u.searchParams.set('year', String(y));
    u.searchParams.set('round', String(r));
    window.history.replaceState({}, '', u.toString());
  }

  async function parseAndSave() {
    setLoading(true);
    setErrors([]);
    setStatus('');
    try {
      // 1) Parse
      const res = await fetch('/api/lines/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketHint: market, raw })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Parse failed');

      const parsedRows: ParsedRow[] = json.rows ?? [];
      setRows(parsedRows);
      setErrors(json.unparsed ?? []);

      if (parsedRows.length === 0) {
        setStatus('No rows parsed (nothing to save).');
        return;
      }

      // 2) Detect round from pasted text (if present) and use it for saving + URL
      const detected = mostCommonRound(parsedRows);
      const effectiveRound = detected ?? round;

      if (detected && detected !== round) {
        setRound(detected);
      }

      syncUrl({ round: effectiveRound });

      // 3) Save
      const saveRes = await fetch('/api/lines/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          year,
          round: effectiveRound,
          market,
          rows: parsedRows,
          source: 'prizepicks'
        })
      });

      const saveJson = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveJson?.error ?? 'Save failed');

      setStatus(`✅ Saved ${saveJson.saved ?? parsedRows.length} rows for ${eventId} ${year} RD${effectiveRound} (${market}).`);
      syncUrl({ round: effectiveRound });
    } catch (e: any) {
      setStatus('');
      setErrors([String(e?.message ?? e)]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div className="row" style={{ marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="label">Event ID (temp)</div>
          <input
            className="input"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            onBlur={() => syncUrl()}
            placeholder="cognizant"
          />
          <div className="small">We’ll replace this with the Event dropdown soon.</div>
        </div>

        <div style={{ width: 140 }}>
          <div className="label">Year</div>
          <input
            className="input"
            type="number"
            value={year}
            onChange={(e) => setYear(safeNum(e.target.value, new Date().getFullYear()))}
            onBlur={() => syncUrl()}
          />
        </div>

        <div style={{ width: 120 }}>
          <div className="label">Round</div>
          <select
            className="input"
            value={String(round)}
            onChange={(e) => {
              const nextRound = safeNum(e.target.value, 2);
              setRound(nextRound);
              syncUrl({ round: nextRound });
            }}
          >
            <option value="1">RD1</option>
            <option value="2">RD2</option>
            <option value="3">RD3</option>
            <option value="4">RD4</option>
          </select>
        </div>
      </div>

      <div className="row">
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="label">Market</div>
          <select className="input" value={market} onChange={(e) => setMarket(e.target.value)}>
            {MARKETS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <button className="btn btnPrimary" onClick={parseAndSave} disabled={loading || !raw.trim()}>
            {loading ? 'Working…' : 'Parse & Save'}
          </button>
          <button
            className="btn"
            onClick={() => {
              setRaw('');
              setRows([]);
              setErrors([]);
              setStatus('');
              syncUrl();
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="label">Paste board text</div>
      <textarea
        className="input"
        style={{ minHeight: 180, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={placeholder}
      />

      {status && (
        <div style={{ marginTop: 10 }} className="small">
          {status}
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="label">Parsed rows ({rows.length})</div>
          <table className="table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Opponent</th>
                <th>Round</th>
                <th>Tee time</th>
                <th>Market</th>
                <th>Line</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.player}</td>
                  <td>{r.opponent ?? '—'}</td>
                  <td>{r.round ?? '—'}</td>
                  <td>{r.tee_time ?? '—'}</td>
                  <td>{r.market}</td>
                  <td>{r.line}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {errors.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="label">Unparsed / warnings</div>
              <ul className="small">
                {errors.slice(0, 12).map((x, idx) => (
                  <li key={idx}>{x}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {rows.length === 0 && errors.length > 0 && (
        <div style={{ marginTop: 12 }} className="small">
          {errors.map((x, i) => (
            <div key={i}>⚠ {x}</div>
          ))}
        </div>
      )}
    </div>
  );
}
