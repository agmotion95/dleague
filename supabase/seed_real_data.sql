-- Make sure to clear existing data if you want a clean slate (optional)
delete from public.match_events;
delete from public.matches;
delete from public.players;
delete from public.teams;
delete from public.tournaments;

do $$
declare
  futsal_id uuid := gen_random_uuid();
  badminton_id uuid := gen_random_uuid();
  team_a uuid := 'ba333d6a-7837-4fb8-86d5-e0ba63f2ce23';
  team_b uuid := '69eac9c7-9f29-4653-a03c-11dc9d46bc8b';
  team_c uuid := 'af843afe-5742-41bf-8704-283722437adb';
  team_d uuid := '92643f81-ca03-4937-bf83-4c778e7b6fc3';
  team_e uuid := 'd0f1e516-0f65-403e-8530-16a52ed759dd';
  p1 uuid := 'c29e7225-61bb-4065-bc77-e1446ab5fc8f';
  p2 uuid := '161ad91e-9800-4632-bb10-a3c5ed6aa238';
  p3 uuid := 'fa57477e-d7cc-4bba-a448-2b03a38d52d3';
  p4 uuid := '0436c132-38e1-4d53-b35b-6127e27fb0c1';
  p5 uuid := 'd0b67dd5-3e31-4830-ba5a-850377ff8f29';
  p6 uuid := '1a837739-6ce2-4cc6-b73c-436f6968350d';
  p7 uuid := '389430e1-2f9a-4cb5-84c0-2427702aa324';
  p8 uuid := '862853af-7c1d-4942-bdef-1d8e7b79a7b4';
  p9 uuid := '68a871df-d44d-482b-97b9-04d79f40a3d7';
  p10 uuid := '090be27a-3575-46b9-8a2e-f8c3bd66b63f';
  f_m1 uuid := '1edeb4e3-b447-4138-9b3d-331cfd6efa6f';
  f_m2 uuid := 'b9cb5c45-e57e-4610-92e2-bf35a11e5f97';
  f_m3 uuid := '0c767b5b-539d-4958-8ed4-f1106c7b0c3c';
  f_m4 uuid := '868cad57-2a76-431b-8ad1-9e171dcdbff7';
  f_m5 uuid := '4e7599b5-ce4c-4c4e-8025-271b012fbe49';
  f_m6 uuid := '344c00dc-f39e-406b-b165-ac672e7db254';
  f_m7 uuid := '75e25e2e-d13d-4f79-8f74-1e49bf96aea8';
  f_m8 uuid := '285a522f-3533-4d61-8175-0f88cf354512';
  f_m9 uuid := '54f616ee-0d8a-4fb3-b75c-7da33e6baf1d';
  f_m10 uuid := 'a00e01cf-3851-46a3-a3af-c58b394ebc33';
  f_final uuid := '1fb5b68b-601b-4534-8487-e48b31a25fc2';
  b_prelim1 uuid := '809b08a6-f93e-400f-98ba-ea3479fdd7be';
  b_prelim2 uuid := '9eeeb04a-acc2-4a46-9214-f02ecaf57211';
  b_QF1 uuid := '8ae24957-5a87-4077-9930-28a2a06c5740';
  b_QF2 uuid := '787da9fd-f835-4a03-bb09-625a110ebcad';
  b_QF3 uuid := 'b73c6e0f-c517-499b-87e2-e91f8982c020';
  b_QF4 uuid := 'db7675a7-d698-4521-9efb-dba2f3121993';
  b_SF1 uuid := '540be5c9-1d08-4cef-9e5c-567a951fa788';
  b_SF2 uuid := '449bf145-7fde-4ae8-be47-217d55ba1255';
  b_Final uuid := '9004f756-615d-4780-8833-f518931ab130';
begin
  insert into public.tournaments (id, name, sport, format, status, start_date, end_date)
    values (futsal_id, 'Sports Day Futsal 2026', 'futsal', 'Group Stage + Final', 'ongoing', '2026-04-19', '2026-04-19');
  insert into public.tournaments (id, name, sport, format, status, start_date, end_date)
    values (badminton_id, 'Sports Day Badminton 2026', 'badminton', 'Single Elimination', 'ongoing', '2026-04-19', '2026-04-19');

  -- Futsal Teams
  insert into public.teams (id, tournament_id, name, group_name) values (team_a, futsal_id, 'HyperSonic FC', 'Group Stage');
  insert into public.players (team_id, name) values (team_a, 'Arjun Shrestha');
  insert into public.players (team_id, name) values (team_a, 'Aishan Shrestha');
  insert into public.players (team_id, name) values (team_a, 'Chhabilal Khatiwada');
  insert into public.players (team_id, name) values (team_a, 'Swarup Raj Bomjan');
  insert into public.players (team_id, name) values (team_a, 'Sagar Khadka');
  insert into public.players (team_id, name) values (team_a, 'Satij Dangol');
  insert into public.teams (id, tournament_id, name, group_name) values (team_b, futsal_id, 'The Dominators', 'Group Stage');
  insert into public.players (team_id, name) values (team_b, 'Yajal Shrestha');
  insert into public.players (team_id, name) values (team_b, 'Abishesh Kumar Karn');
  insert into public.players (team_id, name) values (team_b, 'Nabin Khatiwada');
  insert into public.players (team_id, name) values (team_b, 'Mandil Thapa Magar');
  insert into public.players (team_id, name) values (team_b, 'Prashansa Sunuwar');
  insert into public.teams (id, tournament_id, name, group_name) values (team_c, futsal_id, 'Cloud Runners', 'Group Stage');
  insert into public.players (team_id, name) values (team_c, 'Sumit Malakar');
  insert into public.players (team_id, name) values (team_c, 'Avinav Nakarmi');
  insert into public.players (team_id, name) values (team_c, 'Ratna Limbu');
  insert into public.players (team_id, name) values (team_c, 'Mahendra Kumar Pandey');
  insert into public.players (team_id, name) values (team_c, 'Ujjwal Shrestha');
  insert into public.players (team_id, name) values (team_c, 'Saroj Tamang');
  insert into public.teams (id, tournament_id, name, group_name) values (team_d, futsal_id, 'Total Control FC', 'Group Stage');
  insert into public.players (team_id, name) values (team_d, 'Saurav Karn');
  insert into public.players (team_id, name) values (team_d, 'Rojan Tamang');
  insert into public.players (team_id, name) values (team_d, 'Ashim Aryal');
  insert into public.players (team_id, name) values (team_d, 'Saroz Poddar');
  insert into public.players (team_id, name) values (team_d, 'Anil Banskota');
  insert into public.players (team_id, name) values (team_d, 'Ajaya Budathoki');
  insert into public.teams (id, tournament_id, name, group_name) values (team_e, futsal_id, 'Team Ballerz', 'Group Stage');
  insert into public.players (team_id, name) values (team_e, 'Bijay Shrestha');
  insert into public.players (team_id, name) values (team_e, 'Avishek Bahadur Khadka');
  insert into public.players (team_id, name) values (team_e, 'Saurav Munankarmi');
  insert into public.players (team_id, name) values (team_e, 'Shivam Manandhar');
  insert into public.players (team_id, name) values (team_e, 'Atit Raj Kayastha');

  -- Badminton Players
  insert into public.teams (id, tournament_id, name) values (p1, badminton_id, 'Sabina Aryal');
  insert into public.players (team_id, name) values (p1, 'Sabina Aryal');
  insert into public.teams (id, tournament_id, name) values (p2, badminton_id, 'Anusa Gyawali');
  insert into public.players (team_id, name) values (p2, 'Anusa Gyawali');
  insert into public.teams (id, tournament_id, name) values (p3, badminton_id, 'Nilima Shakya');
  insert into public.players (team_id, name) values (p3, 'Nilima Shakya');
  insert into public.teams (id, tournament_id, name) values (p4, badminton_id, 'Furi Sherpa');
  insert into public.players (team_id, name) values (p4, 'Furi Sherpa');
  insert into public.teams (id, tournament_id, name) values (p5, badminton_id, 'Sweekriti Nepal');
  insert into public.players (team_id, name) values (p5, 'Sweekriti Nepal');
  insert into public.teams (id, tournament_id, name) values (p6, badminton_id, 'Janaki Joshi');
  insert into public.players (team_id, name) values (p6, 'Janaki Joshi');
  insert into public.teams (id, tournament_id, name) values (p7, badminton_id, 'Pema Sherpa');
  insert into public.players (team_id, name) values (p7, 'Pema Sherpa');
  insert into public.teams (id, tournament_id, name) values (p8, badminton_id, 'Simran Thapa');
  insert into public.players (team_id, name) values (p8, 'Simran Thapa');
  insert into public.teams (id, tournament_id, name) values (p9, badminton_id, 'Anju Ghimire');
  insert into public.players (team_id, name) values (p9, 'Anju Ghimire');
  insert into public.teams (id, tournament_id, name) values (p10, badminton_id, 'Prerana Sapkota');
  insert into public.players (team_id, name) values (p10, 'Prerana Sapkota');

  -- Badminton Matches (Final first to allow next_match_id)
  insert into public.matches (id, tournament_id, stage, bracket_position, team1_id, team2_id, next_match_id, scheduled_at, venue, status)
    values (b_Final, badminton_id, 'Final', 9, null, null, null, '2026-04-19 14:45:00+05:45', 'Badminton Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, bracket_position, team1_id, team2_id, next_match_id, scheduled_at, venue, status)
    values (b_SF2, badminton_id, 'Semifinal', 8, null, null, b_Final, '2026-04-19 14:10:00+05:45', 'Badminton Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, bracket_position, team1_id, team2_id, next_match_id, scheduled_at, venue, status)
    values (b_SF1, badminton_id, 'Semifinal', 7, null, null, b_Final, '2026-04-19 13:50:00+05:45', 'Badminton Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, bracket_position, team1_id, team2_id, next_match_id, scheduled_at, venue, status)
    values (b_QF4, badminton_id, 'Quarterfinal', 6, p9, p10, b_SF2, '2026-04-19 13:30:00+05:45', 'Badminton Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, bracket_position, team1_id, team2_id, next_match_id, scheduled_at, venue, status)
    values (b_QF3, badminton_id, 'Quarterfinal', 5, p7, p8, b_SF2, '2026-04-19 12:40:00+05:45', 'Badminton Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, bracket_position, team1_id, team2_id, next_match_id, scheduled_at, venue, status)
    values (b_QF2, badminton_id, 'Quarterfinal', 4, p6, null, b_SF1, '2026-04-19 12:20:00+05:45', 'Badminton Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, bracket_position, team1_id, team2_id, next_match_id, scheduled_at, venue, status)
    values (b_QF1, badminton_id, 'Quarterfinal', 3, null, p5, b_SF1, '2026-04-19 12:00:00+05:45', 'Badminton Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, bracket_position, team1_id, team2_id, next_match_id, scheduled_at, venue, status)
    values (b_prelim2, badminton_id, 'Preliminary', 2, p3, p4, b_QF2, '2026-04-19 10:40:00+05:45', 'Badminton Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, bracket_position, team1_id, team2_id, next_match_id, scheduled_at, venue, status)
    values (b_prelim1, badminton_id, 'Preliminary', 1, p1, p2, b_QF1, '2026-04-19 10:20:00+05:45', 'Badminton Court', 'scheduled');

  -- Futsal Matches
  insert into public.matches (id, tournament_id, stage, team1_id, team2_id, scheduled_at, venue, status)
    values (f_m1, futsal_id, 'Group Stage', team_a, team_d, '2026-04-19 10:30:00+05:45', 'Futsal Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, team1_id, team2_id, scheduled_at, venue, status)
    values (f_m2, futsal_id, 'Group Stage', team_c, team_e, '2026-04-19 10:55:00+05:45', 'Futsal Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, team1_id, team2_id, scheduled_at, venue, status)
    values (f_m3, futsal_id, 'Group Stage', team_b, team_d, '2026-04-19 11:10:00+05:45', 'Futsal Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, team1_id, team2_id, scheduled_at, venue, status)
    values (f_m4, futsal_id, 'Group Stage', team_a, team_e, '2026-04-19 11:25:00+05:45', 'Futsal Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, team1_id, team2_id, scheduled_at, venue, status)
    values (f_m5, futsal_id, 'Group Stage', team_b, team_c, '2026-04-19 11:40:00+05:45', 'Futsal Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, team1_id, team2_id, scheduled_at, venue, status)
    values (f_m6, futsal_id, 'Group Stage', team_a, team_c, '2026-04-19 13:00:00+05:45', 'Futsal Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, team1_id, team2_id, scheduled_at, venue, status)
    values (f_m7, futsal_id, 'Group Stage', team_b, team_e, '2026-04-19 13:28:00+05:45', 'Futsal Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, team1_id, team2_id, scheduled_at, venue, status)
    values (f_m8, futsal_id, 'Group Stage', team_c, team_d, '2026-04-19 15:00:00+05:45', 'Futsal Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, team1_id, team2_id, scheduled_at, venue, status)
    values (f_m9, futsal_id, 'Group Stage', team_a, team_b, '2026-04-19 15:15:00+05:45', 'Futsal Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, team1_id, team2_id, scheduled_at, venue, status)
    values (f_m10, futsal_id, 'Group Stage', team_d, team_e, '2026-04-19 15:30:00+05:45', 'Futsal Court', 'scheduled');
  insert into public.matches (id, tournament_id, stage, team1_id, team2_id, scheduled_at, venue, status)
    values (f_final, futsal_id, 'Final', null, null, '2026-04-19 16:15:00+05:45', 'Futsal Court', 'scheduled');
end $$;