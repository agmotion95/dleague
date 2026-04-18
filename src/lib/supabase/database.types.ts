export type Sport = 'futsal' | 'badminton'
export type MatchStatus = 'scheduled' | 'live' | 'completed'
export type EventType = 'goal' | 'penalty_goal' | 'yellow_card' | 'red_card' | 'assist'

export interface Tournament {
  id: string
  name: string
  sport: Sport
  format: string | null
  status: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
}

export interface Team {
  id: string
  tournament_id: string
  name: string
  logo_url: string | null
  group_name: string | null
  tiebreak_rank: number | null
  created_at: string
}

export interface Player {
  id: string
  team_id: string
  name: string
  jersey_number: number | null
  photo_url: string | null
  created_at: string
}

export interface Match {
  id: string
  tournament_id: string
  stage: string | null
  round: number | null
  team1_id: string | null
  team2_id: string | null
  score1: number | null
  score2: number | null
  scheduled_at: string | null
  venue: string | null
  status: MatchStatus
  winner_id: string | null
  bracket_position: number | null
  next_match_id: string | null
  created_at: string
  // Joined
  team1?: Team | null
  team2?: Team | null
  winner?: Team | null
  tournament?: Tournament | null
}

export interface MatchEvent {
  id: string
  match_id: string
  player_id: string | null
  team_id: string | null
  event_type: EventType
  minute: number | null
  notes: string | null
  created_at: string
  // Joined
  player?: Player | null
  team?: Team | null
  match?: { tournament: { sport: string } | null } | null
}

export interface Standing {
  tournament_id: string
  team_id: string
  group_name: string | null
  team_name: string
  tiebreak_rank: number | null
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_diff: number
  points: number
  yellow_cards_total: number
  red_cards_total: number
  // Joined
  tournament?: { sport: string } | null
}

export type Database = {
  public: {
    Tables: {
      tournaments: {
        Row: Tournament
        Insert: Omit<Tournament, 'id' | 'created_at'>
        Update: Partial<Omit<Tournament, 'id' | 'created_at'>>
      }
      teams: {
        Row: Team
        Insert: Omit<Team, 'id' | 'created_at'>
        Update: Partial<Omit<Team, 'id' | 'created_at' | 'tournament_id'>>
      }
      players: {
        Row: Player
        Insert: Omit<Player, 'id' | 'created_at'>
        Update: Partial<Omit<Player, 'id' | 'created_at'>>
      }
      matches: {
        Row: Match
        Insert: Omit<Match, 'id' | 'created_at' | 'team1' | 'team2' | 'winner' | 'tournament'>
        Update: Partial<Omit<Match, 'id' | 'created_at' | 'team1' | 'team2' | 'winner' | 'tournament'>>
      }
      match_events: {
        Row: MatchEvent
        Insert: Omit<MatchEvent, 'id' | 'created_at' | 'player' | 'team'>
        Update: Partial<Omit<MatchEvent, 'id' | 'created_at' | 'player' | 'team'>>
      }
    }
    Views: {
      standings: {
        Row: Standing
      }
    }
  }
}
