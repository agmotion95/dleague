import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'
import StandingsTableClient from '@/components/StandingsTableClient'
import { rankAllGroups } from '@/lib/standings'
import type { StandingRow, MatchForTiebreaker } from '@/lib/standings'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Futsal Standings' }

export default async function FutsalStandingsPage() {
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('sport', 'futsal')
    .single()

  const tournamentId = tournament?.id ?? ''

  const [{ data: standings }, { data: matches }] = await Promise.all([
    supabase
      .from('standings')
      .select('*')
      .eq('tournament_id', tournamentId),
    supabase
      .from('matches')
      .select('id, team1_id, team2_id, score1, score2, winner_id')
      .eq('tournament_id', tournamentId)
      .eq('status', 'completed'),
  ])

  const rankedStandings = rankAllGroups(
    (standings ?? []) as StandingRow[],
    (matches ?? []) as MatchForTiebreaker[]
  )

  return (
    <div className="min-h-screen">
      <Navbar sport="futsal" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="section-header">
          <h1 style={{
            fontFamily: 'var(--font-barlow), sans-serif',
            fontWeight: 900,
            fontSize: 'clamp(28px, 5vw, 48px)',
            textTransform: 'uppercase',
            color: '#fff',
            letterSpacing: -0.5,
            margin: 0,
          }}>Standings</h1>
        </div>
        <StandingsTableClient
          initialRankedStandings={rankedStandings}
          tournamentId={tournamentId}
        />
      </div>
    </div>
  )
}
