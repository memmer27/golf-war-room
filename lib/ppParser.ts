export type ParsedPPRow = {
  player: string;
  opponent?: string;
  tee_time?: string; // e.g. "Fri 6:21am"
  round?: number; // 1-4 if present in the paste
  line: number;
  market: string;
};

function cleanLines(raw: string): string[] {
  return raw
    .replace(/\r/g, "")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function looksLikeLineNumber(s: string): boolean {
  return /^\d+(?:\.\d+)?$/.test(s);
}

function normalizeMarket(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function extractRoundAndTime(vsLine: string): { round?: number; tee?: string; opponent?: string } {
  const out: { round?: number; tee?: string; opponent?: string } = {};

  const rd = vsLine.match(/\bRD\s*(\d)\b/i);
  if (rd) out.round = Number(rd[1]);

  const tee = vsLine.match(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b\s+\d{1,2}:\d{2}(?:am|pm)\b/i);
  if (tee) out.tee = tee[0];

  // Matchup opponent: "vs Kevin Roy Fri 5:45am" → opponent = "Kevin Roy"
  // But for course lines, it includes "Golf Club" etc. We treat those as NOT matchups.
  if (/^vs\s+/i.test(vsLine) && !/Golf Club/i.test(vsLine) && !/Champion Course/i.test(vsLine)) {
    const cleaned = vsLine.replace(/^vs\s+/i, "");
    const opp = cleaned
      .replace(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b\s+\d{1,2}:\d{2}(?:am|pm)\b/i, "")
      .trim();
    if (opp.length > 0) out.opponent = opp;
  }

  return out;
}

/**
 * Parses PrizePicks "copy/paste" blocks.
 *
 * IMPORTANT FIX:
 * - We do NOT iterate over every number in the paste (which mistakenly picks up "Trending 241" etc.)
 * - Instead, we anchor on the MARKET line (e.g. "Strokes") and take the closest numeric line ABOVE it.
 */
export function parsePrizePicksBoard(
  raw: string,
  marketHint: string
): { rows: ParsedPPRow[]; unparsed: string[] } {
  const lines = cleanLines(raw);
  const rows: ParsedPPRow[] = [];
  const unparsed: string[] = [];

  const mh = normalizeMarket(marketHint || "");

  // Guardrails to reject "Trending 241" style numbers automatically
  function isPlausibleLine(n: number, market: string): boolean {
    const m = normalizeMarket(market);
    if (m.includes("strokes")) return n >= 55 && n <= 85;
    if (m.includes("matchup")) return n === 0.5 || n === 1 || (n >= 0 && n <= 5);
    if (
      m.includes("birdies") ||
      m.includes("pars") ||
      m.includes("bogeys") ||
      m.includes("fairways") ||
      m.includes("greens in regulation") ||
      m.includes("gir")
    ) {
      return n >= 0 && n <= 18;
    }
    // fallback: still reject huge numbers
    return n >= 0 && n <= 200;
  }

  function isMarketLine(s: string): boolean {
    const t = normalizeMarket(s);
    if (!t) return false;

    // When we know which tab you're pasting into, the market line should match it.
    if (mh) return t === mh;

    // Fallback if no hint: recognize common markets
    return (
      t === "strokes" ||
      t === "birdies or better" ||
      t === "birdies or better matchup" ||
      t === "fairways hit" ||
      t === "greens in regulation" ||
      t === "pars" ||
      t === "bogeys or worse"
    );
  }

  function shouldSkipCandidateName(cand: string, market: string): boolean {
    const lc = cand.toLowerCase();
    if (!cand) return true;
    if (lc.startsWith("vs ")) return true;
    if (lc === "less" || lc === "more") return true;
    if (lc === "trending") return true;
    if (looksLikeLineNumber(cand)) return true;
    if (isMarketLine(cand)) return true;
    // Skip "Name - G" style lines
    if (/ - \w\b/.test(cand) && cand.includes("-")) return true;
    // Skip obvious course/location lines
    if (lc.includes("golf club") || lc.includes("champion course")) return true;
    // If the line is literally the market (sometimes repeats), skip
    if (normalizeMarket(cand) === normalizeMarket(market)) return true;
    return false;
  }

  // Parse by locating each MARKET line, then scanning upward for numeric LINE above it.
  for (let mi = 0; mi < lines.length; mi++) {
    const marketLineRaw = lines[mi];
    if (!isMarketLine(marketLineRaw)) continue;

    const market = marketHint || marketLineRaw;

    // Find prop line number above the market line
    let lineNum: number | null = null;
    for (let k = mi - 1; k >= Math.max(0, mi - 6); k--) {
      const cand = lines[k];
      if (cand.toLowerCase() === "trending") continue; // ignore marker
      if (looksLikeLineNumber(cand)) {
        const n = Number(cand);
        if (isPlausibleLine(n, market)) {
          lineNum = n;
          break;
        }
      }
    }

    if (lineNum == null) {
      unparsed.push(`Could not find valid line number above market '${marketLineRaw}' near index ${mi}`);
      continue;
    }

    // Find "vs ..." line above the market line
    let vsLine = "";
    for (let j = mi - 1; j >= Math.max(0, mi - 15); j--) {
      if (lines[j].toLowerCase().startsWith("vs ")) {
        vsLine = lines[j];
        break;
      }
    }

    // Find player name above vs line (or above market if vs missing)
    let player = "";
    const vsIndex = vsLine ? lines.lastIndexOf(vsLine, mi) : -1;
    const searchStart = vsIndex >= 0 ? vsIndex - 1 : mi - 1;

    for (let j = searchStart; j >= Math.max(0, searchStart - 12); j--) {
      const cand = lines[j];
      if (shouldSkipCandidateName(cand, market)) continue;
      player = cand;
      break;
    }

    if (!player) {
      unparsed.push(`Could not find player name for market '${market}' with line ${lineNum} near index ${mi}`);
      continue;
    }

    const meta = vsLine ? extractRoundAndTime(vsLine) : {};

    rows.push({
      player,
      opponent: meta.opponent,
      tee_time: meta.tee,
      round: meta.round,
      line: lineNum,
      market,
    });
  }

  // Deduplicate by player+opponent+round+tee+market (ignore duplicates from paste quirks)
  const deduped = new Map<string, ParsedPPRow>();
  for (const r of rows) {
    const key = `${r.player}|${r.opponent ?? ""}|${r.round ?? ""}|${r.tee_time ?? ""}|${normalizeMarket(r.market)}`;
    if (!deduped.has(key)) deduped.set(key, r);
  }

  return { rows: Array.from(deduped.values()), unparsed };
}
