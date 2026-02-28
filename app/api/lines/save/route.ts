import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ParsedPPRow = {
  player: string;
  opponent?: string;
  tee_time?: string;
  round?: number;
  line: number;
  market: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event_id, year, round, market, rows, source = "prizepicks" } = body as {
      event_id: string;
      year: number;
      round: number;
      market: string;
      rows: ParsedPPRow[];
      source?: string;
    };

    if (!event_id || !year || !round || !market || !Array.isArray(rows)) {
      return NextResponse.json(
        { error: "Missing required fields (event_id, year, round, market, rows)" },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Server misconfigured (missing Supabase env vars)" },
        { status: 500 }
      );
    }

    const supabase = createClient(url, serviceKey);

    const payload = rows.map((r) => ({
      event_id,
      year,
      round,
      market,
      player_name: r.player,
      opponent_name: r.opponent ?? null,
      tee_time_local: r.tee_time ?? null,
      line: r.line,
      source,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("lines").upsert(payload, {
      onConflict: "event_id,year,round,market,player_name,opponent_name",
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, saved: payload.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
