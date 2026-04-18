import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'
import MatchListClient from '@/components/MatchListClient'
import type { Match } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Futsal Results' }

export default async function FutsalResultsPage() {
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('sport', 'futsal')
    .single()

  const { data: matches } = await supabase
    .from('matches')
    .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), winner:teams!matches_winner_id_fkey(*)`)
    .eq('tournament_id', tournament?.id ?? '')
    .in('status', ['completed', 'live'])
    .order('scheduled_at', { ascending: false })

  return (
    <div className="min-h-screen">
      <Navbar sport="futsal" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="section-header">
          <h1 style={{
            fontFamily: 'var(--font-barlow), sans-serif',
            fontWeight: 900,
            fontSize: 'clamp(28px, 5vw, 48px)',
            textTransform: 'uppercase',
            color: '#fff',
            letterSpacing: -0.5,
            margin: 0,
          }}>Results</h1>
        </div>
        <MatchListClient
          initialMatches={(matches ?? []) as Match[]}
          tournamentId={tournament?.id ?? ''}
          sport="futsal"
          statusFilter={['completed', 'live']}
          emptyMessage="No results yet. Check back after matches are played."
        />
      </div>
    </div>
  )
}
