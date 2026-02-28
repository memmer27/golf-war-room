import { NextResponse } from "next/server";

// Returns DataGolf skill ratings as JSON (server-side; API key stays private)
export async function GET() {
  try {
    const key = process.env.DATAGOLF_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "Missing DATAGOLF_API_KEY" }, { status: 500 });
    }

    // CSV is easiest to fetch; we convert to JSON lightly.
    const url = `https://feeds.datagolf.com/preds/skill-ratings?tour=pga&file_format=csv&key=${encodeURIComponent(
      key
    )}`;

    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: `DataGolf error (${res.status})`, detail: text.slice(0, 300) },
        { status: 500 }
      );
    }

    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      return NextResponse.json({ error: "Unexpected DataGolf CSV" }, { status: 500 });
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      // naive CSV split (DG feeds usually clean). We'll harden later if needed.
      const cols = line.split(",").map((c) => c.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = cols[i] ?? ""));
      return obj;
    });

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
