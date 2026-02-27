export type ParsedPPRow = {
  player: string;
  opponent?: string;
  tee_time?: string;
  round?: number;
  line: number;
  market: string;
};

function cleanLines(raw: string): string[] {
  return raw
    .replace(/\r/g, '')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function looksLikeLineNumber(s: string): boolean {
  return /^\d+(?:\.\d+)?$/.test(s);
}

function extractRoundAndTime(vsLine: string): { round?: number; tee?: string; opponent?: string } {
  const out: { round?: number; tee?: string; opponent?: string } = {};
  const rd = vsLine.match(/\bRD\s*(\d)\b/i);
  if (rd) out.round = Number(rd[1]);

  const tee = vsLine.match(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b\s+\d{1,2}:\d{2}(?:am|pm)\b/i);
  if (tee) out.tee = tee[0];

  // matchup opponent: "vs Kevin Roy Fri 5:45am" → opponent = "Kevin Roy"
  if (/^vs\s+/i.test(vsLine) && !/Golf Club/i.test(vsLine) && !/Champion Course/i.test(vsLine)) {
    const cleaned = vsLine.replace(/^vs\s+/i, '');
    const opp = cleaned.replace(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b\s+\d{1,2}:\d{2}(?:am|pm)\b/i, '').trim();
    if (opp.length > 0) out.opponent = opp;
  }

  return out;
}

export function parsePrizePicksBoard(raw: string, marketHint: string): { rows: ParsedPPRow[]; unparsed: string[] } {
  const lines = cleanLines(raw);
  const rows: ParsedPPRow[] = [];
  const unparsed: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const s = lines[i];
    if (!looksLikeLineNumber(s)) continue;

    const line = Number(s);
    const marketLine = lines[i + 1] ?? '';
    if (!marketLine) {
      unparsed.push(`Missing market after line '${s}' near index ${i}`);
      continue;
    }

    let vsLine = '';
    let player = '';

    for (let j = i - 1; j >= Math.max(0, i - 8); j--) {
      if (lines[j].toLowerCase().startsWith('vs ')) {
        vsLine = lines[j];
        for (let k = j - 1; k >= Math.max(0, j - 4); k--) {
          const cand = lines[k];
          if (/ - \w\b/.test(cand) && cand.includes('-')) continue;
          if (cand.toLowerCase().startsWith('trending')) continue;
          if (cand.length > 1) {
            player = cand;
            break;
          }
        }
        break;
      }
    }

    if (!player) {
      for (let j = i - 1; j >= Math.max(0, i - 8); j--) {
        const cand = lines[j];
        if (cand.toLowerCase().startsWith('vs ')) continue;
        if (cand.toLowerCase().includes('golf club')) continue;
        if (/ - \w\b/.test(cand) && cand.includes('-')) continue;
        if (cand.toLowerCase() === marketLine.toLowerCase()) continue;
        if (cand.toLowerCase() === 'less' || cand.toLowerCase() === 'more') continue;
        if (looksLikeLineNumber(cand)) continue;
        player = cand;
        break;
      }
    }

    if (!player) {
      unparsed.push(`Could not find player name for line ${line} near index ${i}`);
      continue;
    }

    const meta = vsLine ? extractRoundAndTime(vsLine) : {};

    rows.push({
      player,
      opponent: meta.opponent,
      tee_time: meta.tee,
      round: meta.round,
      line,
      market: marketHint || marketLine
    });
  }

  const deduped = new Map<string, ParsedPPRow>();
  for (const r of rows) {
    const key = `${r.player}|${r.opponent ?? ''}|${r.round ?? ''}|${r.tee_time ?? ''}|${r.market}|${r.line}`;
    deduped.set(key, r);
  }

  return { rows: Array.from(deduped.values()), unparsed };
}
