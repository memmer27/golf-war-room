create table if not exists public.events (
  event_id text not null,
  tour text not null default 'pga',
  year int not null,
  event_name text not null,
  course_name text,
  start_date date,
  end_date date,
  primary key (event_id, year)
);

create table if not exists public.event_field (
  event_id text not null,
  year int not null,
  dg_id int not null,
  player_name text not null,
  tee_time text,
  status text,
  primary key (event_id, year, dg_id)
);

create table if not exists public.skill_ratings (
  asof date not null,
  dg_id int not null,
  player_name text,
  sg_total real,
  sg_ott real,
  sg_app real,
  sg_arg real,
  sg_putt real,
  primary key (asof, dg_id)
);

create table if not exists public.player_last50 (
  asof date not null,
  dg_id int not null,
  rounds_count int not null,
  strokes_mean real,
  strokes_sd real,
  gir_rate real,
  fw_rate real,
  birdies_mean real,
  pars_mean real,
  bogeys_mean real,
  primary key (asof, dg_id)
);

create table if not exists public.lines (
  event_id text not null,
  year int not null,
  round int not null,
  market text not null,
  dg_id int,
  player_name text not null,
  opponent_name text,
  tee_time text,
  line real not null,
  raw_hash text,
  created_at timestamptz not null default now(),
  primary key (event_id, year, round, market, player_name, coalesce(opponent_name,''))
);
