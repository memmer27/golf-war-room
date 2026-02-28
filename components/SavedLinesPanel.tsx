'use client';

import { useEffect, useMemo, useState } from 'react';

type Row = {
  player_name: string;
  opponent_name?: string | null;
  tee_time_local?: string | null;
  line: number;
  market: string;
  round: number;
};

const MARKETS = [
  'Strokes',
  'Birdies Or Better',
  'Fairways Hit',
  'Greens In Regulation',
  'Pars',
  'Birdies or Better Matchup'
] as const;

function getQueryParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

export default function SavedLinesPanel() {
  const [eventId, setEventId] = useState<string>(() => getQueryParam('event_id') || 'cognizant');
  const [year, setYear] = useState<number>(() => Number(getQueryParam('year') || new Date().getFullYear()));
  const [round, setRound] = useState<number>(() => Number(getQueryParam('round') || 3));
  const [market, setMarket] = useState<(typeof MARKETS)[number]>('Strokes');

  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const qs = useMemo(() => ({ eventId, year, round, market }), [eventId, year, round, market]);

  async function load() {
    setLoading(true);
    setStatus('');
    try {
      const url = `/api/lines/list?event_id=${encodeURIComponent(qs.eventId)}&year=${qs.year}&round=${qs.round}&market=${encodeURIComponent(qs.market)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to load lines');
      setRows(json.rows ?? []);
      setStatus(`Loaded ${json.rows?.length ?? 0} lines.`);
    } catch (e: any) {
      setRows([]);
      setStatus(`⚠ ${String(e?.message ?? e)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // auto-load once
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="label">Saved Lines Viewer (from Supabase)</div>

      <div className="row" style={{ marginTop: 8 }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div className="label">Event ID</div>
          <input className="input" value={eventId} onChange={(e) => setEventId(e.target.value)} />
        </div>

        <div style={{ width: 120 }}>
          <div className="label">Year</div>
          <input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>

        <div style={{ width: 120 }}>
          <div className="label">Round</div>
          <select className="input" value={String(round)} onChange={(e) => setRound(Number(e.target.value))}>
            <option value="1">RD1</option>
            <option value="2">RD2</option>
            <option value="3">RD3</option>
            <option value="4">RD4</option>
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="label">Market</div>
          <select className="input" value={market} onChange={(e) => setMarket(e.target.value as any)}>
            {MARKETS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn btnPrimary" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Load'}
          </button>
        </div>
      </div>

      <div className="small" style={{ marginTop: 8 }}>
        {status}
      </div>

      <div style={{ marginTop: 10 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Opponent</th>
              <th>Tee</th>
              <th>Line</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.player_name}</td>
                <td>{r.opponent_name ?? '—'}</td>
                <td>{r.tee_time_local ?? '—'}</td>
                <td>{r.line}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="small">
                  No saved lines for this selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="small" style={{ marginTop: 8 }}>
        Tip: once we wire the Event dropdown, this panel will auto-follow your selected event/round.
      </div>
    </div>
  );
}
