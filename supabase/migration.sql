-- ============================================================
-- Sports Day Tournament – Supabase SQL Migration
-- Run this in your Supabase Studio SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.tournaments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sport       text not null check (sport in ('futsal', 'badminton')),
  format      text,
  status      text default 'upcoming',
  start_date  date,
  end_date    date,
  created_at  timestamptz not null default now()
);

create table if not exists public.teams (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references public.tournaments(id) on delete cascade,
  name            text not null,
  logo_url        text,
  group_name      text,
  created_at      timestamptz not null default now()
);

create table if not exists public.players (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references public.teams(id) on delete cascade,
  name            text not null,
  jersey_number   int,
  photo_url       text,
  created_at      timestamptz not null default now()
);

create table if not exists public.matches (
  id                uuid primary key default gen_random_uuid(),
  tournament_id     uuid not null references public.tournaments(id) on delete cascade,
  stage             text,
  round             int,
  team1_id          uuid references public.teams(id) on delete set null,
  team2_id          uuid references public.teams(id) on delete set null,
  score1            int default 0,
  score2            int default 0,
  scheduled_at      timestamptz,
  venue             text,
  status            text not null default 'scheduled' check (status in ('scheduled', 'live', 'completed')),
  winner_id         uuid references public.teams(id) on delete set null,
  bracket_position  int,
  next_match_id     uuid references public.matches(id) on delete set null,
  created_at        timestamptz not null default now()
);

create table if not exists public.match_events (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches(id) on delete cascade,
  player_id   uuid references public.players(id) on delete set null,
  team_id     uuid references public.teams(id) on delete set null,
  event_type  text not null check (event_type in ('goal', 'yellow_card', 'red_card', 'assist')),
  minute      int,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- STANDINGS VIEW
-- ============================================================

create or replace view public.standings as
select
  m.tournament_id,
  t.id                                          as team_id,
  t.group_name,
  t.name                                        as team_name,
  count(m.id)::int                              as played,
  count(case when m.winner_id = t.id then 1 end)::int  as won,
  count(case
    when m.status = 'completed'
     and m.winner_id is null
     and (m.team1_id = t.id or m.team2_id = t.id)
    then 1 end)::int                            as drawn,
  count(case
    when m.status = 'completed'
     and m.winner_id is not null
     and m.winner_id <> t.id
     and (m.team1_id = t.id or m.team2_id = t.id)
    then 1 end)::int                            as lost,
  coalesce(sum(case when m.team1_id = t.id then m.score1
                    when m.team2_id = t.id then m.score2
               else 0 end), 0)::int             as goals_for,
  coalesce(sum(case when m.team1_id = t.id then m.score2
                    when m.team2_id = t.id then m.score1
               else 0 end), 0)::int             as goals_against,
  (
    coalesce(sum(case when m.team1_id = t.id then m.score1
                      when m.team2_id = t.id then m.score2
                 else 0 end), 0)
    -
    coalesce(sum(case when m.team1_id = t.id then m.score2
                      when m.team2_id = t.id then m.score1
                 else 0 end), 0)
  )::int                                        as goal_diff,
  (
    count(case when m.winner_id = t.id then 1 end) * 3
    + count(case
        when m.status = 'completed'
         and m.winner_id is null
         and (m.team1_id = t.id or m.team2_id = t.id)
        then 1 end)
  )::int                                        as points
from public.teams t
join public.matches m
  on (m.team1_id = t.id or m.team2_id = t.id)
  and m.status = 'completed'
  and m.tournament_id = t.tournament_id
group by m.tournament_id, t.id, t.group_name, t.name;

-- ============================================================
-- BRACKET AUTO-ADVANCE TRIGGER (Badminton)
-- ============================================================

create or replace function public.advance_bracket_winner()
returns trigger
language plpgsql
security definer
as $$
declare
  next_match record;
begin
  -- Only fire when status transitions to completed and winner_id is set
  if new.status = 'completed'
     and new.winner_id is not null
     and new.next_match_id is not null
     and (old.status <> 'completed' or old.winner_id is null)
  then
    select * into next_match from public.matches where id = new.next_match_id;

    if next_match.team1_id is null then
      update public.matches
        set team1_id = new.winner_id
        where id = new.next_match_id;
    elsif next_match.team2_id is null then
      update public.matches
        set team2_id = new.winner_id
        where id = new.next_match_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_advance_bracket_winner on public.matches;
create trigger trg_advance_bracket_winner
  after update on public.matches
  for each row
  execute function public.advance_bracket_winner();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.tournaments   enable row level security;
alter table public.teams         enable row level security;
alter table public.players       enable row level security;
alter table public.matches       enable row level security;
alter table public.match_events  enable row level security;

-- Public SELECT on all tables
create policy "Public read tournaments"   on public.tournaments   for select using (true);
create policy "Public read teams"         on public.teams         for select using (true);
create policy "Public read players"       on public.players       for select using (true);
create policy "Public read matches"       on public.matches       for select using (true);
create policy "Public read match_events"  on public.match_events  for select using (true);

-- Authenticated admin INSERT/UPDATE/DELETE
create policy "Admin insert tournaments"   on public.tournaments   for insert with check (auth.role() = 'authenticated');
create policy "Admin update tournaments"   on public.tournaments   for update using (auth.role() = 'authenticated');
create policy "Admin delete tournaments"   on public.tournaments   for delete using (auth.role() = 'authenticated');

create policy "Admin insert teams"   on public.teams   for insert with check (auth.role() = 'authenticated');
create policy "Admin update teams"   on public.teams   for update using (auth.role() = 'authenticated');
create policy "Admin delete teams"   on public.teams   for delete using (auth.role() = 'authenticated');

create policy "Admin insert players"   on public.players   for insert with check (auth.role() = 'authenticated');
create policy "Admin update players"   on public.players   for update using (auth.role() = 'authenticated');
create policy "Admin delete players"   on public.players   for delete using (auth.role() = 'authenticated');

create policy "Admin insert matches"   on public.matches   for insert with check (auth.role() = 'authenticated');
create policy "Admin update matches"   on public.matches   for update using (auth.role() = 'authenticated');
create policy "Admin delete matches"   on public.matches   for delete using (auth.role() = 'authenticated');

create policy "Admin insert match_events"   on public.match_events   for insert with check (auth.role() = 'authenticated');
create policy "Admin update match_events"   on public.match_events   for update using (auth.role() = 'authenticated');
create policy "Admin delete match_events"   on public.match_events   for delete using (auth.role() = 'authenticated');

-- ============================================================
-- Enable Realtime on relevant tables
-- ============================================================
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_events;
