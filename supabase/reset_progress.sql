-- ============================================================
-- Reset Tournament Progress: Scores, Results, and Events
-- This script wipes all match results while keeping teams/players.
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Clear all match events (goals, cards, assists)
DELETE FROM public.match_events;

-- 2. Reset all match scores, statuses, and winners
UPDATE public.matches
SET 
  score1 = 0,
  score2 = 0,
  status = 'scheduled',
  winner_id = NULL;

-- 3. Reset bracket slots that are populated by advancing winners (TBD slots)
-- These slots must be NULL initially so the 'advance_bracket_winner' trigger can work.

-- Futsal Finalists are TBD
UPDATE public.matches m
SET team1_id = NULL, team2_id = NULL
FROM public.tournaments t
WHERE m.tournament_id = t.id
  AND t.sport = 'futsal'
  AND m.stage = 'Final';

-- Badminton Bracket: Semifinals and Finals are completely TBD
UPDATE public.matches m
SET team1_id = NULL, team2_id = NULL
FROM public.tournaments t
WHERE m.tournament_id = t.id
  AND t.sport = 'badminton'
  AND m.stage IN ('Semifinal', 'Final');

-- Badminton Quarterfinals: Specifically QF1 and QF2 have one TBD slot each from Preliminaries
UPDATE public.matches m
SET team1_id = NULL
FROM public.tournaments t
WHERE m.tournament_id = t.id
  AND t.sport = 'badminton'
  AND m.bracket_position = 3; -- QF1 (Team 1 comes from Preliminary 1)

UPDATE public.matches m
SET team2_id = NULL
FROM public.tournaments t
WHERE m.tournament_id = t.id
  AND t.sport = 'badminton'
  AND m.bracket_position = 4; -- QF2 (Team 2 comes from Preliminary 2)

-- 4. (Optional) Reset tiebreaker ranks if any were set
-- Removed to avoid errors if migration_tiebreaker.sql wasn't run.
-- UPDATE public.teams SET tiebreak_rank = NULL;
