export const dynamic = "force-dynamic";

type Row = {
  player_name: string;
  opponent_name?: string | null;
  tee_time_local?: string | null;
  line: number;
  market: string;
  round: number;
};

function getParam(name: string, fallback: string) {
  // server component: safe to read from headers via searchParams passed in below
  return fallback;
}

export default async function EdgesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const event_id = (searchParams.event_id as string) || "cognizant";
  const year = Number((searchParams.year as string) || new Date().getFullYear());
  const round = Number((searchParams.round as string) || 3);

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL?.startsWith("http")
      ? process.env.VERCEL_URL
      : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "";

  const url = `${baseUrl}/api/lines/list-all?event_id=${encodeURIComponent(event_id)}&year=${year}&round=${round}`;

  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  const rows: Row[] = (json?.rows ?? []) as Row[];

  const markets = Array.from(new Set(rows.map((r) => r.market))).sort();

  return (
    <div className="container">
      <div className="row" style={{ alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: "0 0 6px" }}>Edges</h1>
          <div className="small">
            Showing saved lines for <b>{event_id}</b> {year} RD{round}. (Projections next.)
          </div>
        </div>

        <div className="card" style={{ minWidth: 360 }}>
          <div className="label">Quick links</div>
          <div className="small">
            <div>
              Home: <a href={`/?event_id=${event_id}&year=${year}&round=${round}`}>Paste / Save</a>
            </div>
            <div style={{ marginTop: 6 }}>
              This page: <a href={`/edges?event_id=${event_id}&year=${year}&round=${round}`}>Refresh</a>
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
          Next: we’ll join these rows to DataGolf projections (strokes/BoB/pars/bogeys/FW/GIR) and add hit rates + an “Edge”
          score.
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
