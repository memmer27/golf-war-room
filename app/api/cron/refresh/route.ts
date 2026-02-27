import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!process.env.CRON_TOKEN || token !== process.env.CRON_TOKEN) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    message: 'cron refresh stub (wire DataGolf → Supabase here)'
  });
}
