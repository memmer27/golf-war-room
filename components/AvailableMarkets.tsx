'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const ALL = [
  { key: 'Strokes', label: 'Strokes' },
  { key: 'Birdies Or Better', label: 'Birdies or Better' },
  { key: 'Fairways Hit', label: 'Fairways Hit' },
  { key: 'Greens In Regulation', label: 'GIR' },
  { key: 'Pars', label: 'Pars' },
  { key: 'Birdies or Better Matchup', label: 'Matchups' }
] as const;

export default function AvailableMarkets() {
  const searchParams = useSearchParams();

  const event_id = searchParams.get('event_id') || '';
  const yearStr = searchParams.get('year') || '';
  const roundStr = searchParams.get('round') || '';

  const year = yearStr ? Number(yearStr) : NaN;
  const round = roundStr ? Number(roundStr) : NaN;

  const [active, setActive] = useState<string>(ALL[0].key);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [note, setNote] = useState<string>('');

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, anon);
  }, []);

  async function loadCounts(eid: string, y: number, r: number) {
    setNote(`Loading counts for ${eid} ${y} RD${r}…`);

    const { data, error } = await supabase
      .from('lines')
      .select('market')
      .eq('event_id', eid)
      .eq('year', y)
      .eq('round', r);

    if (error) {
      setCounts({});
      setNote(`⚠ Error loading counts: ${error.message}`);
      return;
    }

    const grouped: Record<string, number> = {};
    for (const row of (data ?? []) as any[]) {
      const m = row.market as string;
      grouped[m] = (grouped[m] ?? 0) + 1;
    }

    setCounts(grouped);
    setNote(`Counts loaded for ${eid} ${y} RD${r}.`);
  }

  // ✅ Re-run whenever event/year/round in the URL changes
  useEffect(() => {
    if (!event_id || !Number.isFinite(year) || !Number.isFinite(round)) {
      setCounts({});
      setNote('Paste + Save a board to set event/year/round automatically.');
      return;
    }
    loadCounts(event_id, year, round);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event_id, yearStr, roundStr, supabase]);

  return (
    <div className="card">
      <div className="label">Available Markets (selected round)</div>
      <div className="pills">
        {ALL.map((m) => {
          const c = counts[m.key] ?? 0;
          const off = c === 0;
          return (
            <div
              key={m.key}
              className={`pill ${active === m.key ? 'pillOn' : ''} ${off ? 'pillOff' : ''}`}
              onClick={() => setActive(m.key)}
              title={off ? 'No lines saved yet' : 'Click to jump'}
            >
              {m.label} ({c})
            </div>
          );
        })}
      </div>

      <div className="small" style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span>{note}</span>

        {/* Manual refresh button (handy if you ever want to re-check without reload) */}
        {event_id && Number.isFinite(year) && Number.isFinite(round) && (
          <button className="btn" onClick={() => loadCounts(event_id, year, round)}>
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}
