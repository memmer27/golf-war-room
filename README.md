# Golf War Room (Hosted) — Starter

Hosted Next.js starter for your DataGolf-powered golf props war room.

## Includes
- Event dropdown scaffold
- PrizePicks paste → parse → clean table preview
- “Available Markets” pill bar (counts will come from DB in v1)
- Hole-map UI placeholder
- Cron route stub for DataGolf → Supabase refresh

## Data sources
- DataGolf API access catalog (fields, historical raw data, etc.) citeturn0search0
- DataGolf predictive methodology concept (score distributions + simulation) citeturn0search1
- Historical event data page (past results UI inspiration) citeturn0search2

## Local dev
```bash
npm i
npm run dev
```

## Env vars
Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATAGOLF_API_KEY=...
CRON_TOKEN=...
```

## Supabase schema
Run `sql/schema.sql` in Supabase SQL editor.

## Cron refresh (Vercel)
Create a Vercel Cron that calls:
`/api/cron/refresh?token=CRON_TOKEN`

In v1 we will wire:
- events list (dropdown)
- field-updates for selected event
- skill ratings snapshots
- computed last-50 tables
- weather snapshots
- save parsed lines + edges page
