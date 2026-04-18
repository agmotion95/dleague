-- ============================================================
-- Sports Day Tournament – Seed Data
-- Run AFTER migration.sql in Supabase Studio SQL editor
-- ============================================================

do $$
declare
  -- Tournaments
  futsal_id     uuid;
  badminton_id  uuid;

  -- Futsal teams (Group A)
  fa1 uuid; fa2 uuid; fa3 uuid; fa4 uuid;
  -- Futsal teams (Group B)
  fb1 uuid; fb2 uuid; fb3 uuid; fb4 uuid;

  -- Badminton players (stored as teams with 1 player each)
  bp1 uuid; bp2 uuid; bp3 uuid; bp4 uuid;
  bp5 uuid; bp6 uuid; bp7 uuid; bp8 uuid; bp9 uuid; bp10 uuid;

  -- Bracket match IDs (pre-created so next_match_id can be wired)
  b_qfp1 uuid; b_qfp2 uuid;               -- QF Playoffs (2 matches)
  b_qf1  uuid; b_qf2  uuid; b_qf3  uuid; b_qf4 uuid; -- Quarterfinals (4)
  b_sf1  uuid; b_sf2  uuid;               -- Semifinals (2)
  b_f1   uuid;                             -- Final (1)

  -- Futsal match IDs
  fm1  uuid; fm2  uuid; fm3  uuid; fm4  uuid;
  fm5  uuid; fm6  uuid; fm7  uuid; fm8  uuid;
  fm9  uuid; fm10 uuid; fm11 uuid; fm12 uuid;
begin

  -- ============================================================
  -- TOURNAMENTS
  -- ============================================================
  insert into public.tournaments (name, sport, format, status, start_date, end_date)
    values ('Sports Day Futsal 2025', 'futsal', 'Group Stage + Knockout', 'ongoing', '2025-05-10', '2025-05-15')
    returning id into futsal_id;

  insert into public.tournaments (name, sport, format, status, start_date, end_date)
    values ('Sports Day Badminton 2025', 'badminton', 'Single Elimination (10 players)', 'ongoing', '2025-05-10', '2025-05-14')
    returning id into badminton_id;

  -- ============================================================
  -- FUTSAL TEAMS
  -- ============================================================
  insert into public.teams (tournament_id, name, group_name) values (futsal_id, 'FC Thunder',   'A') returning id into fa1;
  insert into public.teams (tournament_id, name, group_name) values (futsal_id, 'Red Eagles',    'A') returning id into fa2;
  insert into public.teams (tournament_id, name, group_name) values (futsal_id, 'Blue Sharks',   'A') returning id into fa3;
  insert into public.teams (tournament_id, name, group_name) values (futsal_id, 'Golden Wolves', 'A') returning id into fa4;
  insert into public.teams (tournament_id, name, group_name) values (futsal_id, 'Storm United',  'B') returning id into fb1;
  insert into public.teams (tournament_id, name, group_name) values (futsal_id, 'Iron Lions',    'B') returning id into fb2;
  insert into public.teams (tournament_id, name, group_name) values (futsal_id, 'Night Owls',    'B') returning id into fb3;
  insert into public.teams (tournament_id, name, group_name) values (futsal_id, 'City Wolves',   'B') returning id into fb4;

  -- ============================================================
  -- FUTSAL PLAYERS
  -- ============================================================
  -- FC Thunder
  insert into public.players (team_id, name, jersey_number) values
    (fa1, 'Arjun Sharma',   1), (fa1, 'Bikash Thapa',   7), (fa1, 'Chirag Rai',    9),
    (fa1, 'Deepak Karki',   5), (fa1, 'Emon Gurung',   11);
  -- Red Eagles
  insert into public.players (team_id, name, jersey_number) values
    (fa2, 'Farhan Ahmed',   1), (fa2, 'Gaurav Singh',   8), (fa2, 'Hari Rana',     10),
    (fa2, 'Ishaan Tamang',  4), (fa2, 'Jay Pradhan',    6);
  -- Blue Sharks
  insert into public.players (team_id, name, jersey_number) values
    (fa3, 'Kiran Magar',    1), (fa3, 'Lalbabu Chettri',3), (fa3, 'Manish Oli',   11),
    (fa3, 'Nabin Lama',     9), (fa3, 'Omkar Basnet',   7);
  -- Golden Wolves
  insert into public.players (team_id, name, jersey_number) values
    (fa4, 'Pankaj Shrestha',1), (fa4, 'Rahul Subba',    5), (fa4, 'Sagar Kharel', 10),
    (fa4, 'Trilok Bista',   8), (fa4, 'Ujwal Dhakal',   6);
  -- Storm United
  insert into public.players (team_id, name, jersey_number) values
    (fb1, 'Vikram Nepali',  1), (fb1, 'Wangdi Sherpa',  7), (fb1, 'Xavier Rai',   9),
    (fb1, 'Yogesh Limbu',   5), (fb1, 'Zahir Ansari',  11);
  -- Iron Lions
  insert into public.players (team_id, name, jersey_number) values
    (fb2, 'Amir Ghale',     1), (fb2, 'Barun Poudel',   8), (fb2, 'Chandan Tharu', 3),
    (fb2, 'Dev Hamal',      6), (fb2, 'Elan Tamang',   10);
  -- Night Owls
  insert into public.players (team_id, name, jersey_number) values
    (fb3, 'Faisal Miya',    1), (fb3, 'Gagan Adhikari', 4), (fb3, 'Hemant Luitel', 9),
    (fb3, 'Indra Khatri',   7), (fb3, 'Jagat Dani',    11);
  -- City Wolves
  insert into public.players (team_id, name, jersey_number) values
    (fb4, 'Kabiraj Budha',  1), (fb4, 'Lhakpa Sherpa',  5), (fb4, 'Mohan Giri',   8),
    (fb4, 'Niroj Kc',      10), (fb4, 'Opel Chaudhary', 6);

  -- ============================================================
  -- BADMINTON PLAYERS (each is their own "team" entry)
  -- ============================================================
  insert into public.teams (tournament_id, name, group_name) values (badminton_id, 'Sweekriti',  null) returning id into bp1;
  insert into public.teams (tournament_id, name, group_name) values (badminton_id, 'Nilima',     null) returning id into bp2;
  insert into public.teams (tournament_id, name, group_name) values (badminton_id, 'Anusa',      null) returning id into bp3;
  insert into public.teams (tournament_id, name, group_name) values (badminton_id, 'Simran',     null) returning id into bp4;
  insert into public.teams (tournament_id, name, group_name) values (badminton_id, 'Sabina',     null) returning id into bp5;
  insert into public.teams (tournament_id, name, group_name) values (badminton_id, 'Anju',       null) returning id into bp6;
  insert into public.teams (tournament_id, name, group_name) values (badminton_id, 'Pema',       null) returning id into bp7;
  insert into public.teams (tournament_id, name, group_name) values (badminton_id, 'Furi',       null) returning id into bp8;
  insert into public.teams (tournament_id, name, group_name) values (badminton_id, 'Janaki',     null) returning id into bp9;
  insert into public.teams (tournament_id, name, group_name) values (badminton_id, 'Prerana',    null) returning id into bp10;

  -- Create player records for each badminton player
  insert into public.players (team_id, name, jersey_number) values
    (bp1, 'Sweekriti', 1), (bp2, 'Nilima', 2), (bp3, 'Anusa', 3),
    (bp4, 'Simran', 4),   (bp5, 'Sabina', 5), (bp6, 'Anju', 6),
    (bp7, 'Pema', 7),     (bp8, 'Furi', 8),   (bp9, 'Janaki', 9),
    (bp10, 'Prerana', 10);

  -- ============================================================
  -- PRE-CREATE BRACKET MATCH IDs
  -- ============================================================
  b_qfp1 := gen_random_uuid();
  b_qfp2 := gen_random_uuid();
  b_qf1  := gen_random_uuid();
  b_qf2  := gen_random_uuid();
  b_qf3  := gen_random_uuid();
  b_qf4  := gen_random_uuid();
  b_sf1  := gen_random_uuid();
  b_sf2  := gen_random_uuid();
  b_f1   := gen_random_uuid();

  -- ============================================================
  -- BADMINTON BRACKET MATCHES
  -- Bracket layout:
  --   QFP1 ──► QF1 ──► SF1 ──►
  --   QFP2 ──► QF2 ──► SF1 ──► Final
  --   Seed 3 ──► QF3 ──► SF2 ──►
  --   Seed 4 ──► QF4 ──► SF2 ──►
  -- (10 players: 2 "unlucky" play QF playoffs, winners enter QFs)
  -- ============================================================

  -- SF and Final first (leaf-last, so IDs exist for next_match_id)
  insert into public.matches (id, tournament_id, stage, bracket_position, status, next_match_id, scheduled_at, venue)
    values (b_f1, badminton_id, 'Final', 9, 'scheduled', null, '2025-05-14 16:00:00+05:45', 'Main Court');

  insert into public.matches (id, tournament_id, stage, bracket_position, status, next_match_id, scheduled_at, venue)
    values (b_sf1, badminton_id, 'Semifinal', 7, 'scheduled', b_f1, '2025-05-13 14:00:00+05:45', 'Main Court');

  insert into public.matches (id, tournament_id, stage, bracket_position, status, next_match_id, scheduled_at, venue)
    values (b_sf2, badminton_id, 'Semifinal', 8, 'scheduled', b_f1, '2025-05-13 15:00:00+05:45', 'Main Court');

  insert into public.matches (id, tournament_id, stage, bracket_position, status, next_match_id, team1_id, team2_id, scheduled_at, venue)
    values (b_qf1, badminton_id, 'Quarterfinal', 3, 'scheduled', b_sf1, null,   bp3, '2025-05-11 10:00:00+05:45', 'Main Court');  -- QFP1 winner vs Seed3

  insert into public.matches (id, tournament_id, stage, bracket_position, status, next_match_id, team1_id, team2_id, scheduled_at, venue)
    values (b_qf2, badminton_id, 'Quarterfinal', 4, 'scheduled', b_sf1, bp4,   null, '2025-05-11 11:00:00+05:45', 'Main Court');  -- Seed4 vs QFP2 winner

  insert into public.matches (id, tournament_id, stage, bracket_position, status, next_match_id, team1_id, team2_id, scheduled_at, venue)
    values (b_qf3, badminton_id, 'Quarterfinal', 5, 'scheduled', b_sf2, bp5,   bp7, '2025-05-11 13:00:00+05:45', 'Main Court');

  insert into public.matches (id, tournament_id, stage, bracket_position, status, next_match_id, team1_id, team2_id, scheduled_at, venue)
    values (b_qf4, badminton_id, 'Quarterfinal', 6, 'scheduled', b_sf2, bp6,   bp8, '2025-05-11 14:00:00+05:45', 'Main Court');

  -- QF Playoffs (2 unlucky players face each other for spots in QF1 & QF2)
  insert into public.matches (id, tournament_id, stage, bracket_position, status, next_match_id, team1_id, team2_id, scheduled_at, venue)
    values (b_qfp1, badminton_id, 'QF Playoff', 1, 'scheduled', b_qf1, bp9,  bp1,  '2025-05-10 10:00:00+05:45', 'Court B');

  insert into public.matches (id, tournament_id, stage, bracket_position, status, next_match_id, team1_id, team2_id, scheduled_at, venue)
    values (b_qfp2, badminton_id, 'QF Playoff', 2, 'scheduled', b_qf2, bp10, bp2,  '2025-05-10 11:00:00+05:45', 'Court B');

  -- ============================================================
  -- FUTSAL MATCHES (Group Stage – full round-robin per group)
  -- ============================================================
  fm1  := gen_random_uuid(); fm2  := gen_random_uuid();
  fm3  := gen_random_uuid(); fm4  := gen_random_uuid();
  fm5  := gen_random_uuid(); fm6  := gen_random_uuid();
  fm7  := gen_random_uuid(); fm8  := gen_random_uuid();
  fm9  := gen_random_uuid(); fm10 := gen_random_uuid();
  fm11 := gen_random_uuid(); fm12 := gen_random_uuid();

  -- Group A matches
  insert into public.matches (id, tournament_id, stage, round, team1_id, team2_id, scheduled_at, venue, status)
    values (fm1,  futsal_id, 'Group A', 1, fa1, fa2, '2025-05-10 09:00:00+05:45', 'Futsal Court', 'completed'),
           (fm2,  futsal_id, 'Group A', 1, fa3, fa4, '2025-05-10 10:30:00+05:45', 'Futsal Court', 'completed'),
           (fm3,  futsal_id, 'Group A', 2, fa1, fa3, '2025-05-11 09:00:00+05:45', 'Futsal Court', 'completed'),
           (fm4,  futsal_id, 'Group A', 2, fa2, fa4, '2025-05-11 10:30:00+05:45', 'Futsal Court', 'scheduled'),
           (fm5,  futsal_id, 'Group A', 3, fa1, fa4, '2025-05-12 09:00:00+05:45', 'Futsal Court', 'scheduled'),
           (fm6,  futsal_id, 'Group A', 3, fa2, fa3, '2025-05-12 10:30:00+05:45', 'Futsal Court', 'scheduled');

  -- Group B matches
  insert into public.matches (id, tournament_id, stage, round, team1_id, team2_id, scheduled_at, venue, status)
    values (fm7,  futsal_id, 'Group B', 1, fb1, fb2, '2025-05-10 12:00:00+05:45', 'Futsal Court', 'completed'),
           (fm8,  futsal_id, 'Group B', 1, fb3, fb4, '2025-05-10 13:30:00+05:45', 'Futsal Court', 'completed'),
           (fm9,  futsal_id, 'Group B', 2, fb1, fb3, '2025-05-11 12:00:00+05:45', 'Futsal Court', 'live'),
           (fm10, futsal_id, 'Group B', 2, fb2, fb4, '2025-05-11 13:30:00+05:45', 'Futsal Court', 'scheduled'),
           (fm11, futsal_id, 'Group B', 3, fb1, fb4, '2025-05-12 12:00:00+05:45', 'Futsal Court', 'scheduled'),
           (fm12, futsal_id, 'Group B', 3, fb2, fb3, '2025-05-12 13:30:00+05:45', 'Futsal Court', 'scheduled');

  -- ============================================================
  -- SAMPLE RESULTS (set scores + winners for completed matches)
  -- ============================================================
  update public.matches set score1 = 3, score2 = 1, winner_id = fa1 where id = fm1;
  update public.matches set score1 = 2, score2 = 2, winner_id = null where id = fm2;  -- draw
  update public.matches set score1 = 4, score2 = 2, winner_id = fa1 where id = fm3;
  update public.matches set score1 = 2, score2 = 0, winner_id = fb1 where id = fm7;
  update public.matches set score1 = 1, score2 = 3, winner_id = fb4 where id = fm8;
  -- Live match has partial score
  update public.matches set score1 = 1, score2 = 1 where id = fm9;

  -- ============================================================
  -- SAMPLE MATCH EVENTS (goals, cards for completed matches)
  -- ============================================================
  insert into public.match_events (match_id, team_id, event_type, minute) 
    select fm1, fa1, 'goal', m from unnest(array[12, 34, 67]) as m;
  insert into public.match_events (match_id, team_id, event_type, minute)
    select fm1, fa2, 'goal', 45;
  insert into public.match_events (match_id, team_id, event_type, minute)
    values (fm1, fa2, 'yellow_card', 38);

  insert into public.match_events (match_id, team_id, event_type, minute)
    select fm3, fa1, 'goal', m from unnest(array[5, 22, 55, 78]) as m;
  insert into public.match_events (match_id, team_id, event_type, minute)
    select fm3, fa3, 'goal', m from unnest(array[30, 61]) as m;

  insert into public.match_events (match_id, team_id, event_type, minute)
    select fm7, fb1, 'goal', m from unnest(array[8, 44]) as m;
  insert into public.match_events (match_id, team_id, event_type, minute)
    values (fm7, fb2, 'red_card', 55);

end $$;
