import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'
import MatchListClient from '@/components/MatchListClient'
import type { Match } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Badminton Fixtures' }

export default async function BadmintonFixturesPage() {
  const supabase = await createClient()
  const { data: tournament } = await supabase.from('tournaments').select('*').eq('sport', 'badminton').single()
  const { data: matches } = await supabase
    .from('matches')
    .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*)`)
    .eq('tournament_id', tournament?.id ?? '')
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: true })

  return (
    <div className="min-h-screen">
      <Navbar sport="badminton" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="section-header">
          <h1 style={{ fontFamily: 'var(--font-barlow), sans-serif', fontWeight: 900, fontSize: 'clamp(28px, 5vw, 48px)', textTransform: 'uppercase', color: '#fff', letterSpacing: -0.5, margin: 0 }}>Fixtures</h1>
        </div>
        <MatchListClient initialMatches={(matches ?? []) as Match[]} tournamentId={tournament?.id ?? ''} sport="badminton" statusFilter={['scheduled']} showLink={false} emptyMessage="No upcoming fixtures." />
      </div>
    </div>
  )
}
