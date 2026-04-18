import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from './AdminDashboard'
import { rankAllGroups } from '@/lib/standings'
import type { StandingRow, MatchForTiebreaker } from '@/lib/standings'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin Panel' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      team1:teams!matches_team1_id_fkey(*),
      team2:teams!matches_team2_id_fkey(*),
      winner:teams!matches_winner_id_fkey(*),
      tournament:tournaments(*)
    `)
    .order('scheduled_at', { ascending: true })

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('sport', { ascending: true })

  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .order('name', { ascending: true })

  const { data: players } = await supabase
    .from('players')
    .select('*, team:teams(name)')
    .order('name', { ascending: true })

  // Fetch futsal standings + completed matches for tiebreaker warnings
  const futsalTournament = tournaments?.find(t => t.sport === 'futsal')
  const futsalTournamentId = futsalTournament?.id ?? ''

  const [{ data: standings }, { data: completedMatches }] = await Promise.all([
    futsalTournamentId
      ? supabase.from('standings').select('*').eq('tournament_id', futsalTournamentId)
      : Promise.resolve({ data: null }),
    futsalTournamentId
      ? supabase
          .from('matches')
          .select('id, team1_id, team2_id, score1, score2, winner_id')
          .eq('tournament_id', futsalTournamentId)
          .eq('status', 'completed')
      : Promise.resolve({ data: null }),
  ])

  const tiebreakerWarnings = rankAllGroups(
    (standings ?? []) as StandingRow[],
    (completedMatches ?? []) as MatchForTiebreaker[]
  ).filter(r => r.has_tiebreak_warning)

  return (
    <AdminDashboard
      initialMatches={matches ?? []}
      tournaments={tournaments ?? []}
      teams={teams ?? []}
      players={players ?? []}
      userEmail={user.email ?? ''}
      tiebreakerWarnings={tiebreakerWarnings}
      futsalTournamentId={futsalTournamentId}
    />
  )
}
