export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

type LineRow = {
  player_name: string;
  opponent_name?: string | null;
  tee_time_local?: string | null;
  line: number;
  market: string;
  round: number;
};

type DGSkillRow = Record<string, string>;

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    if (row.length === 1 && row[0] === "") return;
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }

    if (c === ",") {
      pushField();
      continue;
    }

    if (c === "\n") {
      pushField();
      pushRow();
      continue;
    }

    if (c === "\r") continue;

    field += c;
  }

  pushField();
  pushRow();

  const headers = (rows.shift() ?? []).map((h) => h.trim());
  return { headers, rows };
}

function normName(s: string) {
  let x = (s || "").trim();
  if (x.includes(",")) {
    const [last, first] = x.split(",").map((p) => p.trim());
    if (first && last) x = `${first} ${last}`;
  }
  return x
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toNum(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

async function fetchDGSkillRatings(): Promise<DGSkillRow[]> {
  const key = process.env.DATAGOLF_API_KEY;
  if (!key) return [];

  const url = `https://feeds.datagolf.com/preds/skill-ratings?tour=pga&file_format=csv&key=${encodeURIComponent(
    key
  )}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];

  const text = await res.text();
  const { headers, rows } = parseCSV(text);
  if (!headers.length || rows.length === 0) return [];

  return rows.map((cols) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = (cols[i] ?? "").trim()));
    return obj;
  });
}

function strokesProjFromSgTotal(sgTotal: number | null): number | null {
  if (sgTotal === null) return null;
  // Simple v1 mapping: better SG total -> lower expected strokes.
  // PGA National par 71 baseline.
  return 71 - sgTotal * 0.35;
}

export default async function EdgesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const event_id = (searchParams.event_id as string) || "cognizant";
  const year = Number((searchParams.year as string) || new Date().getFullYear());
  const round = Number((searchParams.round as string) || 3);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseAnon);

  const [{ data, error }, dgRows] = await Promise.all([
    supabase
      .from("lines")
      .select("player_name, opponent_name, tee_time_local, line, market, round")
      .eq("event_id", event_id)
      .eq("year", year)
      .eq("round", round)
      .order("market", { ascending: true })
      .order("tee_time_local", { ascending: true })
      .order("player_name", { ascending: true }),
    fetchDGSkillRatings(),
  ]);

  const rows: LineRow[] = (data ?? []) as LineRow[];

  const dgByName = new Map<string, DGSkillRow>();
  for (const r of dgRows) {
    const name = r.player_name || r.name || "";
    if (!name) continue;
    dgByName.set(normName(name), r);
  }

  const markets = Array.from(new Set(rows.map((r) => r.market))).sort();

  return (
    <div className="container">
      <div className="row" style={{ alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: "0 0 6px" }}>Edges</h1>
          <div className="small">
            Saved lines for <b>{event_id}</b> {year} RD{round}. v1 edges shown for <b>Strokes</b>.
          </div>

          {error && (
            <div className="small" style={{ marginTop: 8 }}>
              ⚠ Supabase error: {error.message}
            </div>
          )}
          {dgRows.length === 0 && (
            <div className="small" style={{ marginTop: 8 }}>
              ⚠ DataGolf skill ratings did not load.
            </div>
          )}
        </div>

        <div className="card" style={{ minWidth: 360 }}>
          <div className="label">Quick links</div>
          <div className="small">
            <div>
              Home: <a href={`/?event_id=${event_id}&year=${year}&round=${round}`}>Paste / Save</a>
            </div>
            <div style={{ marginTop: 6 }}>
              Refresh: <a href={`/edges?event_id=${event_id}&year=${year}&round=${round}`}>Edges</a>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="label">Markets found</div>
        <div className="pills" style={{ marginTop: 8 }}>
          {markets.length === 0 && <div className="small">No saved lines for this selection yet.</div>}
          {markets.map((m) => (
            <a
              key={m}
              className="pill pillOn"
              href={`/edges?event_id=${event_id}&year=${year}&round=${round}#${encodeURIComponent(m)}`}
              style={{ textDecoration: "none" }}
            >
              {m}
            </a>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="label">Saved Lines + v1 Projection / Edge</div>
        <div className="small" style={{ marginTop: 6 }}>
          For now, Projection/Edge is only computed for <b>Strokes</b>. Next we’ll add this-week form and other markets.
        </div>

        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Market</th>
                <th>Player</th>
                <th>Opponent</th>
                <th>Tee</th>
                <th>Line</th>
                <th>DG SG Total</th>
                <th>Proj (Strokes)</th>
                <th>Edge (More)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const dg = dgByName.get(normName(r.player_name));
                const sgTotal = dg ? toNum(dg.sg_total) : null;

                const isStrokes = r.market.toLowerCase().includes("strokes");
                const proj = isStrokes ? strokesProjFromSgTotal(sgTotal) : null;
                const edgeMore = proj !== null ? proj - r.line : null;

                return (
                  <tr key={i} id={r.market === rows[i - 1]?.market ? undefined : encodeURIComponent(r.market)}>
                    <td>{r.market}</td>
                    <td>{r.player_name}</td>
                    <td>{r.opponent_name ?? "—"}</td>
                    <td>{r.tee_time_local ?? "—"}</td>
                    <td>{r.line}</td>
                    <td>{sgTotal === null ? "—" : sgTotal.toFixed(3)}</td>
                    <td>{proj === null ? "—" : proj.toFixed(2)}</td>
                    <td>{edgeMore === null ? "—" : edgeMore.toFixed(2)}</td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="small">
                    No saved lines yet. Go to Home and paste+save a market board.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
