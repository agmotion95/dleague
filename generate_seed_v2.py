import uuid

futsal_team_data = {
  "teams": [
    {"id": "team_a", "name": "HyperSonic FC", "players": [{"id": "a1", "name": "Arjun Shrestha"}, {"id": "a2", "name": "Aishan Shrestha"}, {"id": "a3", "name": "Chhabilal Khatiwada"}, {"id": "a4", "name": "Swarup Raj Bomjan"}, {"id": "a5", "name": "Sagar Khadka"}, {"id": "a6", "name": "Satij Dangol"}]},
    {"id": "team_b", "name": "The Dominators", "players": [{"id": "b1", "name": "Yajal Shrestha"}, {"id": "b2", "name": "Abishesh Kumar Karn"}, {"id": "b3", "name": "Nabin Khatiwada"}, {"id": "b4", "name": "Mandil Thapa Magar"}, {"id": "b5", "name": "Prashansa Sunuwar"}]},
    {"id": "team_c", "name": "Cloud Runners", "players": [{"id": "c1", "name": "Sumit Malakar"}, {"id": "c2", "name": "Avinav Nakarmi"}, {"id": "c3", "name": "Ratna Limbu"}, {"id": "c4", "name": "Mahendra Kumar Pandey"}, {"id": "c5", "name": "Ujjwal Shrestha"}, {"id": "c6", "name": "Saroj Tamang"}]},
    {"id": "team_d", "name": "Total Control FC", "players": [{"id": "d1", "name": "Saurav Karn"}, {"id": "d2", "name": "Rojan Tamang"}, {"id": "d3", "name": "Ashim Aryal"}, {"id": "d4", "name": "Saroz Poddar"}, {"id": "d5", "name": "Anil Banskota"}, {"id": "d6", "name": "Ajaya Budathoki"}]},
    {"id": "team_e", "name": "Team Ballerz", "players": [{"id": "e1", "name": "Bijay Shrestha"}, {"id": "e2", "name": "Avishek Bahadur Khadka"}, {"id": "e3", "name": "Saurav Munankarmi"}, {"id": "e4", "name": "Shivam Manandhar"}, {"id": "e5", "name": "Atit Raj Kayastha"}]}
  ]
}

badminton_player_data = {
  "players": [
    {"id": "p1", "name": "Sabina Aryal"}, {"id": "p2", "name": "Anusa Gyawali"}, {"id": "p3", "name": "Nilima Shakya"}, {"id": "p4", "name": "Furi Sherpa"}, {"id": "p5", "name": "Sweekriti Nepal"}, {"id": "p6", "name": "Janaki Joshi"}, {"id": "p7", "name": "Pema Sherpa"}, {"id": "p8", "name": "Simran Thapa"}, {"id": "p9", "name": "Anju Ghimire"}, {"id": "p10", "name": "Prerana Sapkota"}
  ]
}

futsal_schedule = {
  "matches": [
    {"id": "m1", "time": "10:30", "team1": "team_a", "team2": "team_d"},
    {"id": "m2", "time": "10:55", "team1": "team_c", "team2": "team_e"},
    {"id": "m3", "time": "11:10", "team1": "team_b", "team2": "team_d"},
    {"id": "m4", "time": "11:25", "team1": "team_a", "team2": "team_e"},
    {"id": "m5", "time": "11:40", "team1": "team_b", "team2": "team_c"},
    {"id": "m6", "time": "13:00", "team1": "team_a", "team2": "team_c"},
    {"id": "m7", "time": "13:28", "team1": "team_b", "team2": "team_e"},
    {"id": "m8", "time": "15:00", "team1": "team_c", "team2": "team_d"},
    {"id": "m9", "time": "15:15", "team1": "team_a", "team2": "team_b"},
    {"id": "m10", "time": "15:30", "team1": "team_d", "team2": "team_e"},
    {"id": "final", "time": "16:15", "team1": "tbd_1", "team2": "tbd_2"}
  ]
}

badminton_bracket = {
  "matches": [
    {"id": "prelim1", "round": "Preliminary", "time": "10:20", "player1": "p1", "player2": "p2", "winner_to": "QF1"},
    {"id": "prelim2", "round": "Preliminary", "time": "10:40", "player1": "p3", "player2": "p4", "winner_to": "QF2"},
    {"id": "QF1", "round": "Quarterfinal", "time": "12:00", "player1": "winner_prelim1", "player2": "p5", "winner_to": "SF1"},
    {"id": "QF2", "round": "Quarterfinal", "time": "12:20", "player1": "p6", "player2": "winner_prelim2", "winner_to": "SF1"},
    {"id": "QF3", "round": "Quarterfinal", "time": "12:40", "player1": "p7", "player2": "p8", "winner_to": "SF2"},
    {"id": "QF4", "round": "Quarterfinal", "time": "13:30", "player1": "p9", "player2": "p10", "winner_to": "SF2"},
    {"id": "SF1", "round": "Semifinal", "time": "13:50", "player1": "winner_QF1", "player2": "winner_QF2", "winner_to": "Final"},
    {"id": "SF2", "round": "Semifinal", "time": "14:10", "player1": "winner_QF3", "player2": "winner_QF4", "winner_to": "Final"},
    {"id": "Final", "round": "Final", "time": "14:45", "player1": "winner_SF1", "player2": "winner_SF2"}
  ]
}

sql = []
sql.append("-- Make sure to clear existing data if you want a clean slate (optional)")
sql.append("delete from public.match_events;")
sql.append("delete from public.matches;")
sql.append("delete from public.players;")
sql.append("delete from public.teams;")
sql.append("delete from public.tournaments;\n")
sql.append("do $$")
sql.append("declare")
sql.append("  futsal_id uuid := gen_random_uuid();")
sql.append("  badminton_id uuid := gen_random_uuid();")

futsal_team_ids = {team['id']: str(uuid.uuid4()) for team in futsal_team_data['teams']}
for tid, tval in futsal_team_ids.items():
    sql.append(f"  {tid} uuid := '{tval}';")

badminton_player_ids = {player['id']: str(uuid.uuid4()) for player in badminton_player_data['players']}
for pid, pval in badminton_player_ids.items():
    sql.append(f"  {pid} uuid := '{pval}';")

futsal_match_ids = {m['id']: str(uuid.uuid4()) for m in futsal_schedule['matches']}
for mid, mval in futsal_match_ids.items():
    sql.append(f"  f_{mid} uuid := '{mval}';")

badminton_match_ids = {m['id']: str(uuid.uuid4()) for m in badminton_bracket['matches']}
for mid, mval in badminton_match_ids.items():
    sql.append(f"  b_{mid} uuid := '{mval}';")

sql.append("begin")
sql.append("  insert into public.tournaments (id, name, sport, format, status, start_date, end_date)")
sql.append("    values (futsal_id, 'Sports Day Futsal 2026', 'futsal', 'Group Stage + Final', 'ongoing', '2026-04-19', '2026-04-19');")
sql.append("  insert into public.tournaments (id, name, sport, format, status, start_date, end_date)")
sql.append("    values (badminton_id, 'Sports Day Badminton 2026', 'badminton', 'Single Elimination', 'ongoing', '2026-04-19', '2026-04-19');")

sql.append("\n  -- Futsal Teams")
for team in futsal_team_data['teams']:
    name = team['name'].replace("'", "''")
    sql.append(f"  insert into public.teams (id, tournament_id, name, group_name) values ({team['id']}, futsal_id, '{name}', 'Group Stage');")
    for player in team['players']:
        pname = player['name'].replace("'", "''")
        sql.append(f"  insert into public.players (team_id, name) values ({team['id']}, '{pname}');")

sql.append("\n  -- Badminton Players")
for player in badminton_player_data['players']:
    pname = player['name'].replace("'", "''")
    sql.append(f"  insert into public.teams (id, tournament_id, name) values ({player['id']}, badminton_id, '{pname}');")
    sql.append(f"  insert into public.players (team_id, name) values ({player['id']}, '{pname}');")

sql.append("\n  -- Badminton Matches (Final first to allow next_match_id)")
ordered_matches = list(reversed(badminton_bracket['matches']))
for m in ordered_matches:
    nxt = m.get('winner_to')
    nxt_ref = "null"
    if nxt and nxt in badminton_match_ids:
        nxt_ref = 'b_' + nxt
    
    t1 = m.get('player1', '')
    t2 = m.get('player2', '')
    t1_ref = t1 if t1 in badminton_player_ids else 'null'
    t2_ref = t2 if t2 in badminton_player_ids else 'null'
    
    round_name = m.get('round', '')
    time = m['time']
    sat = f"'2026-04-19 {time}:00+05:45'"
    mid = m['id']
    
    bp = 'null'
    if mid == 'prelim1': bp = 1
    elif mid == 'prelim2': bp = 2
    elif mid == 'QF1': bp = 3
    elif mid == 'QF2': bp = 4
    elif mid == 'QF3': bp = 5
    elif mid == 'QF4': bp = 6
    elif mid == 'SF1': bp = 7
    elif mid == 'SF2': bp = 8
    elif mid == 'Final': bp = 9

    sql.append(f"  insert into public.matches (id, tournament_id, stage, bracket_position, team1_id, team2_id, next_match_id, scheduled_at, venue, status)")
    sql.append(f"    values (b_{mid}, badminton_id, '{round_name}', {bp}, {t1_ref}, {t2_ref}, {nxt_ref}, {sat}, 'Badminton Court', 'scheduled');")

sql.append("\n  -- Futsal Matches")
for m in futsal_schedule['matches']:
    t1 = m['team1']
    t2 = m['team2']
    t1_ref = t1 if t1 in futsal_team_ids else "null"
    t2_ref = t2 if t2 in futsal_team_ids else "null"
    time = m['time']
    sat = f"'2026-04-19 {time}:00+05:45'"
    stage = 'Final' if m['id'] == 'final' else 'Group Stage'
    
    sql.append(f"  insert into public.matches (id, tournament_id, stage, team1_id, team2_id, scheduled_at, venue, status)")
    sql.append(f"    values (f_{m['id']}, futsal_id, '{stage}', {t1_ref}, {t2_ref}, {sat}, 'Futsal Court', 'scheduled');")

sql.append("end $$;")

with open('/Users/asminghale/Documents/Sports Day/tournament-app/supabase/seed_real_data.sql', 'w') as f:
    f.write("\n".join(sql))
