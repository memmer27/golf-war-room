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

export default function LinesPastePanel() {
  const [market, setMarket] = useState(MARKETS[0].key);
  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const placeholder = useMemo(() => (
`Paste one market board (all players) like:\n\nMichael Brennan\nMichael Brennan - G\nMichael Brennan\nvs PGA National Golf Club Champion Course RD 2 Fri 6:21am\n70.5\nStrokes\nLess\nMore\n...`
  ), []);

  async function parse() {
    setLoading(true);
    setErrors([]);
    try {
      const res = await fetch('/api/lines/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketHint: market, raw })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Parse failed');
      setRows(json.rows ?? []);
      setErrors(json.unparsed ?? []);
    } catch (e: any) {
      setErrors([String(e?.message ?? e)]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{marginTop:12}}>
      <div className="row">
        <div style={{flex:1, minWidth:240}}>
          <div className="label">Market</div>
          <select className="input" value={market} onChange={(e) => setMarket(e.target.value)}>
            {MARKETS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <div style={{display:'flex', alignItems:'flex-end', gap:8}}>
          <button className="btn btnPrimary" onClick={parse} disabled={loading || !raw.trim()}>
            {loading ? 'Parsing…' : 'Parse & Preview'}
          </button>
          <button className="btn" onClick={() => { setRaw(''); setRows([]); setErrors([]); }}>
            Clear
          </button>
        </div>
      </div>

      <div className="label">Paste board text</div>
      <textarea
        className="input"
        style={{minHeight:180, fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'}}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={placeholder}
      />

      {rows.length > 0 && (
        <div style={{marginTop:14}}>
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
            <div style={{marginTop:12}}>
              <div className="label">Unparsed / warnings</div>
              <ul className="small">
                {errors.slice(0, 12).map((x, idx) => <li key={idx}>{x}</li>)}
              </ul>
            </div>
          )}

          <div className="small" style={{marginTop:10}}>
            Next step (v1): Save parsed rows to Supabase keyed by event_id/year/round/market.
          </div>
        </div>
      )}

      {rows.length === 0 && errors.length > 0 && (
        <div style={{marginTop:12}} className="small">
          {errors.map((x, i) => <div key={i}>⚠ {x}</div>)}
        </div>
      )}
    </div>
  );
}
