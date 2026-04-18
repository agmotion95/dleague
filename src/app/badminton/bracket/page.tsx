import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'
import BracketClient from '@/components/BracketClient'
import type { Match } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Badminton Bracket' }

export default async function BadmintonBracketPage() {
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('sport', 'badminton')
    .single()

  const { data: matches } = await supabase
    .from('matches')
    .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), winner:teams!matches_winner_id_fkey(*)`)
    .eq('tournament_id', tournament?.id ?? '')
    .order('bracket_position', { ascending: true })

  return (
    <div className="min-h-screen">
      <Navbar sport="badminton" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="section-header">
          <h1 style={{
            fontFamily: 'var(--font-barlow), sans-serif',
            fontWeight: 900,
            fontSize: 'clamp(28px, 5vw, 48px)',
            textTransform: 'uppercase',
            color: '#fff',
            letterSpacing: -0.5,
            margin: 0,
          }}>Tournament Bracket</h1>
        </div>
        <p style={{ fontSize: 13, color: '#555', marginBottom: 32, fontFamily: 'var(--font-inter), sans-serif' }}>
          Winners advance automatically. Live updates in ~1 second.
        </p>
        <BracketClient
          initialMatches={(matches ?? []) as Match[]}
          tournamentId={tournament?.id ?? ''}
        />
      </div>
    </div>
  )
}
