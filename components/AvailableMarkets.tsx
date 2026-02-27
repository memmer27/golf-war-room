'use client';

import { useMemo, useState } from 'react';

const ALL = [
  { key: 'strokes', label: 'Strokes' },
  { key: 'bob', label: 'Birdies or Better' },
  { key: 'fairways', label: 'Fairways Hit' },
  { key: 'gir', label: 'GIR' },
  { key: 'pars', label: 'Pars' },
  { key: 'matchups', label: 'Matchups' }
] as const;

// In v1 this is loaded from DB for selected event+round
const mockCounts: Record<string, number> = {
  strokes: 0,
  bob: 0,
  fairways: 0,
  gir: 0,
  pars: 0,
  matchups: 0
};

export default function AvailableMarkets() {
  const [active, setActive] = useState<string>('strokes');
  const counts = useMemo(() => mockCounts, []);

  return (
    <div className="card">
      <div className="label">Available Markets (selected round)</div>
      <div className="pills">
        {ALL.map(m => {
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
      <div className="small" style={{marginTop:10}}>
        In v1, counts come from your saved parsed lines. Clicking a pill will jump to that market tab.
      </div>
    </div>
  );
}
