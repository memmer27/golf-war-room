export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

type Row = {
  player_name: string;
  opponent_name?: string | null;
  tee_time_local?: string | null;
  line: number;
  market: string;
  round: number;
};

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

  const { data, error } = await supabase
    .from("lines")
    .select("player_name, opponent_name, tee_time_local, line, market, round")
    .eq("event_id", event_id)
    .eq("year", year)
    .eq("round", round)
    .order("market", { ascending: true })
    .order("tee_time_local", { ascending: true })
    .order("player_name", { ascending: true });

  const rows: Row[] = (data ?? []) as Row[];
  const markets = Array.from(new Set(rows.map((r) => r.market))).sort();

  return (
    <div className="container">
      <div className="row" style={{ alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: "0 0 6px" }}>Edges</h1>
          <div className="small">
            Showing saved lines for <b>{event_id}</b> {year} RD{round}. (Projections next.)
          </div>
          {error && (
            <div className="small" style={{ marginTop: 8 }}>
              ⚠ Supabase error: {error.message}
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
        <div className="label">Saved Lines (raw)</div>
        <div className="small" style={{ marginTop: 6 }}>
          Next: we’ll join these rows to DataGolf projections and add hit rates + an Edge score.
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
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} id={r.market === rows[i - 1]?.market ? undefined : encodeURIComponent(r.market)}>
                  <td>{r.market}</td>
                  <td>{r.player_name}</td>
                  <td>{r.opponent_name ?? "—"}</td>
                  <td>{r.tee_time_local ?? "—"}</td>
                  <td>{r.line}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="small">
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
