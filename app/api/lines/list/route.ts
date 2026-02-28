import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const event_id = searchParams.get("event_id") || "";
    const year = Number(searchParams.get("year") || "");
    const round = Number(searchParams.get("round") || "");
    const market = searchParams.get("market") || "";

    if (!event_id || !Number.isFinite(year) || !Number.isFinite(round) || !market) {
      return NextResponse.json(
        { error: "Missing required query params: event_id, year, round, market" },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(url, anon);

    const { data, error } = await supabase
      .from("lines")
      .select("player_name, opponent_name, tee_time_local, line, market, round")
      .eq("event_id", event_id)
      .eq("year", year)
      .eq("round", round)
      .eq("market", market)
      .order("tee_time_local", { ascending: true })
      .order("player_name", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ rows: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
