-- ============================================================
-- Tiebreaker Migration
-- Run this in Supabase Studio SQL editor AFTER migration.sql
-- ============================================================

-- 1. Add tiebreak_rank to teams (Rule 7 fallback - set by admin)
alter table public.teams
  add column if not exists tiebreak_rank integer;

-- 2. Replace standings view with enriched version that includes
--    card totals and tiebreak_rank for full tiebreaker support.
drop view if exists public.standings;

create view public.standings as
select
  m.tournament_id,
  t.id                                                          as team_id,
  t.group_name,
  t.name                                                        as team_name,
  t.tiebreak_rank,
  count(m.id)::int                                              as played,
  count(case when m.winner_id = t.id then 1 end)::int          as won,
  count(case
    when m.status = 'completed'
     and m.winner_id is null
     and (m.team1_id = t.id or m.team2_id = t.id)
    then 1 end)::int                                           as drawn,
  count(case
    when m.status = 'completed'
     and m.winner_id is not null
     and m.winner_id <> t.id
     and (m.team1_id = t.id or m.team2_id = t.id)
    then 1 end)::int                                           as lost,
  coalesce(sum(case when m.team1_id = t.id then m.score1
                    when m.team2_id = t.id then m.score2
               else 0 end), 0)::int                            as goals_for,
  coalesce(sum(case when m.team1_id = t.id then m.score2
                    when m.team2_id = t.id then m.score1
               else 0 end), 0)::int                            as goals_against,
  (
    coalesce(sum(case when m.team1_id = t.id then m.score1
                      when m.team2_id = t.id then m.score2
                 else 0 end), 0)
    -
    coalesce(sum(case when m.team1_id = t.id then m.score2
                      when m.team2_id = t.id then m.score1
                 else 0 end), 0)
  )::int                                                       as goal_diff,
  (
    count(case when m.winner_id = t.id then 1 end) * 3
    + count(case
        when m.status = 'completed'
         and m.winner_id is null
         and (m.team1_id = t.id or m.team2_id = t.id)
        then 1 end)
  )::int                                                       as points,
  -- Yellow cards across all completed matches in this tournament
  coalesce((
    select count(*)::int
    from public.match_events me
    join public.matches mm on mm.id = me.match_id
    where me.team_id = t.id
      and me.event_type = 'yellow_card'
      and mm.status = 'completed'
      and mm.tournament_id = m.tournament_id
  ), 0)                                                        as yellow_cards_total,
  -- Red cards across all completed matches in this tournament
  coalesce((
    select count(*)::int
    from public.match_events me
    join public.matches mm on mm.id = me.match_id
    where me.team_id = t.id
      and me.event_type = 'red_card'
      and mm.status = 'completed'
      and mm.tournament_id = m.tournament_id
  ), 0)                                                        as red_cards_total
from public.teams t
join public.matches m
  on (m.team1_id = t.id or m.team2_id = t.id)
  and m.status = 'completed'
  and m.tournament_id = t.tournament_id
group by m.tournament_id, t.id, t.group_name, t.name, t.tiebreak_rank;
