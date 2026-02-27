import { NextResponse } from 'next/server';
import { parsePrizePicksBoard } from '@/lib/ppParser';
import { z } from 'zod';

const Body = z.object({
  raw: z.string().min(1),
  marketHint: z.string().min(1)
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { rows, unparsed } = parsePrizePicksBoard(parsed.data.raw, parsed.data.marketHint);
  return NextResponse.json({ rows, unparsed });
}
