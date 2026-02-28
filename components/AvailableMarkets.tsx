'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const ALL = [
  { key: 'Strokes', label: 'Strokes' },
  { key: 'Birdies Or Better', label: 'Birdies or Better' },
  { key: 'Fairways Hit', label: 'Fairways Hit' },
  { key: 'Greens In Regulation', label: 'GIR' },
  { key: 'Pars', label: 'Pars' },
  { key: 'Birdies or Better Matchup', label: 'Matchups' }
] as const;

function getQueryParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

export default function AvailableMarkets() {
  const [active, setActive] = useState<string>(ALL[0].key);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [note, setNote] = useState<string>('');

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, anon);
  }, []);

  useEffect(() => {
    const event_id = getQueryParam('event_id') || '';
    const yearStr = getQueryParam('year') || '';
    const roundStr = getQueryParam('round') || '';

    if (!event_id || !yearStr || !roundStr) {
      setNote('Tip: add ?event_id=cognizant&year=2026&round=2 to the URL to load counts (we will automate this next).');
      setCounts({});
      return;
    }

    const year = Number(yearStr);
    const round = Number(roundStr);

    async function loadCounts() {
      setNote(`Loading counts for ${event_id} ${year} RD${round}…`);
      const { data, error } = await supabase
        .from('lines')
        .select('market', { count: 'exact', head: false })
        .eq('event_id', event_id)
        .eq('year', year)
        .eq('round', round);

      if (error) {
        setNote(`⚠ Error loading counts: ${error.message}`);
        setCounts({});
        return;
      }

      // data is rows; count is not grouped, so we group manually
      const grouped: Record<string, number> = {};
      for (const row of (data ?? []) as any[]) {
        const m = row.market as string;
        grouped[m] = (grouped[m] ?? 0) + 1;
      }
      setCounts(grouped);
      setNote(`Counts loaded for ${event_id} ${year} RD${round}.`);
    }

    loadCounts();
  }, [supabase]);

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

      <div className="small" style={{ marginTop: 10 }}>
        {note}
      </div>
    </div>
  );
}
