import json
import uuid

def generate():
    # Read files
    with open('/Users/asminghale/Documents/Sports Day/futsal-teaminfo', 'r') as f:
        futsal_team_data = json.load(f)
    with open('/Users/asminghale/Documents/Sports Day/badminton-playerinfo', 'r') as f:
        badminton_player_data = json.load(f)
    with open('/Users/asminghale/Documents/Sports Day/futsal-scheduleinfo', 'r') as f:
        futsal_schedule = json.load(f)
    with open('/Users/asminghale/Documents/Sports Day/badminton-bracketinfo', 'r') as f:
        badminton_bracket = json.load(f)

    sql = []
    sql.append("-- Make sure to clear existing data if you want a clean slate (optional)")
    sql.append("-- delete from public.tournaments;")
    sql.append("")
    sql.append("do $$")
    sql.append("declare")
    sql.append("  futsal_id uuid := gen_random_uuid();")
    sql.append("  badminton_id uuid := gen_random_uuid();")

    futsal_team_ids = {}
    for team in futsal_team_data['teams']:
        futsal_team_ids[team['id']] = str(uuid.uuid4())
        sql.append(f"  {team['id']} uuid := '{futsal_team_ids[team['id']]}';")

    badminton_player_ids = {}
    for player in badminton_player_data['players']:
        badminton_player_ids[player['id']] = str(uuid.uuid4())
        sql.append(f"  {player['id']} uuid := '{badminton_player_ids[player['id']]}';")

    futsal_match_ids = {}
    for m in futsal_schedule['matches']:
        if m.get('type') != 'break':
            futsal_match_ids[m['id']] = str(uuid.uuid4())
            sanitized_id = m['id'].replace('-', '_')
            sql.append(f"  f_{sanitized_id} uuid := '{futsal_match_ids[m['id']]}';")

    badminton_match_ids = {}
    for m in badminton_bracket['matches']:
        if m.get('type') != 'break':
            badminton_match_ids[m['id']] = str(uuid.uuid4())
            sanitized_id = m['id'].replace('-', '_')
            sql.append(f"  b_{sanitized_id} uuid := '{badminton_match_ids[m['id']]}';")

    sql.append("begin")
    
    sql.append("  -- Tournaments")
    sql.append("  insert into public.tournaments (id, name, sport, format, status, start_date, end_date)")
    sql.append("    values (futsal_id, 'Sports Day Futsal 2025', 'futsal', 'Group Stage + Final', 'ongoing', '2025-05-10', '2025-05-10');")
    sql.append("  insert into public.tournaments (id, name, sport, format, status, start_date, end_date)")
    sql.append("    values (badminton_id, 'Sports Day Badminton 2025', 'badminton', 'Single Elimination', 'ongoing', '2025-05-10', '2025-05-10');")

    sql.append("\n  -- Futsal Teams & Players")
    for team in futsal_team_data['teams']:
        name = team['name'].replace("'", "''")
        sql.append(f"  insert into public.teams (id, tournament_id, name, group_name) values ({team['id']}, futsal_id, '{name}', 'Group Stage');")
        for player in team['players']:
            pname = player['name'].replace("'", "''")
            sql.append(f"  insert into public.players (team_id, name, jersey_number) values ({team['id']}, '{pname}', null);")
            
    sql.append("\n  -- Badminton Players (as Teams)")
    for player in badminton_player_data['players']:
        pname = player['name'].replace("'", "''")
        sql.append(f"  insert into public.teams (id, tournament_id, name) values ({player['id']}, badminton_id, '{pname}');")
        sql.append(f"  insert into public.players (team_id, name) values ({player['id']}, '{pname}');")

    sql.append("\n  -- Futsal Matches")
    for m in futsal_schedule['matches']:
        if m.get('type') == 'break':
            continue
        try:
            t1 = m['team1']
            t2 = m['team2']
            t1_ref = t1 if t1 in futsal_team_ids else "null"
            t2_ref = t2 if t2 in futsal_team_ids else "null"
            time = m['time']
            sat = f"'2025-05-10 {time}:00+05:45'"
            sanitized_id = m['id'].replace('-', '_')
            stage = 'Final' if m['id'] == 'final' else 'Group Stage'
            note = f" -- {m.get('note', '')}"
            sql.append(f"  insert into public.matches (id, tournament_id, stage, team1_id, team2_id, scheduled_at, venue, status)")
            sql.append(f"    values (f_{sanitized_id}, futsal_id, '{stage}', {t1_ref}, {t2_ref}, {sat}, 'Futsal Court', 'scheduled');{note}")
        except KeyError as e:
            print(f"Skipped match {m.get('id')} due to missing key {e}")

    sql.append("\n  -- Badminton Matches")
    for m in badminton_bracket['matches']:
        if m.get('type') == 'break':
            continue
        nxt = m.get('winner_to')
        nxt_ref = "null"
        if nxt and nxt in badminton_match_ids:
            nxt_ref = 'b_' + nxt.replace('-', '_')
            
        t1 = m.get('player1')
        t2 = m.get('player2')
        t1_ref = t1 if t1 in badminton_player_ids else "null"
        t2_ref = t2 if t2 in badminton_player_ids else "null"
        
        round_name = m.get('round', '')
        time = m['time']
        sat = f"'2025-05-10 {time}:00+05:45'"
        sanitized_id = m['id'].replace('-', '_')
        
        # Determine bracket position for proper UI display
        bracket_position = 'null'
        if round_name == 'Preliminary': bracket_position = '1'
        if round_name == 'Quarterfinal': bracket_position = '2'
        if round_name == 'Semifinal': bracket_position = '3'
        if round_name == 'Final': bracket_position = '4'
        if 'QF1' in sanitized_id or 'prelim1' in sanitized_id: bracket_position = '1'
        if 'QF2' in sanitized_id or 'prelim2' in sanitized_id: bracket_position = '2'
        
        # UI expects specific bracket_positions:
        # Pre: 1, 2. QF: 3,4,5,6. SF: 7, 8. F: 9
        if m['id'] == 'prelim1': bracket_position = 1
        elif m['id'] == 'prelim2': bracket_position = 2
        elif m['id'] == 'QF1': bracket_position = 3
        elif m['id'] == 'QF2': bracket_position = 4
        elif m['id'] == 'QF3': bracket_position = 5
        elif m['id'] == 'QF4': bracket_position = 6
        elif m['id'] == 'SF1': bracket_position = 7
        elif m['id'] == 'SF2': bracket_position = 8
        elif m['id'] == 'Final': bracket_position = 9
        
        sql.append(f"  insert into public.matches (id, tournament_id, stage, bracket_position, team1_id, team2_id, next_match_id, scheduled_at, venue, status)")
        sql.append(f"    values (b_{sanitized_id}, badminton_id, '{round_name}', {bracket_position}, {t1_ref}, {t2_ref}, {nxt_ref}, {sat}, 'Badminton Court', 'scheduled');")

    sql.append("end $$;")
    
    with open('/Users/asminghale/Documents/Sports Day/tournament-app/supabase/seed_real_data.sql', 'w') as f:
        f.write("\n".join(sql))

generate()
