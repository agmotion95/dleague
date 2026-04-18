import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'
import ScorersClient, { type ScorerRow } from '@/components/ScorersClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Top Scorers · Futsal' }

export default async function FutsalScorersPage() {
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('sport', 'futsal')
    .single()

  const tournamentId = tournament?.id ?? ''

  const { data: goalEvents } = await supabase
    .from('match_events')
    .select(`
      player_id, team_id,
      player:players(id, name, jersey_number),
      team:teams(id, name),
      match:matches!inner(tournament_id)
    `)
    .in('event_type', ['goal', 'penalty_goal'])
    .eq('match.tournament_id', tournamentId)

  const scorerMap: Record<string, ScorerRow> = {}
  goalEvents?.forEach((e: unknown) => {
    const ev = e as { player_id: string; team_id: string | null; player: { name: string; jersey_number: number | null } | null; team: { id: string; name: string } | null }
    if (!ev.player_id) return
    if (!scorerMap[ev.player_id]) {
      scorerMap[ev.player_id] = {
        name: ev.player?.name ?? 'Unknown',
        team: ev.team?.name ?? '-',
        teamId: ev.team?.id ?? null,
        goals: 0,
        jerseyNumber: ev.player?.jersey_number ?? null,
      }
    }
    scorerMap[ev.player_id].goals++
  })

  const initialScorers = Object.values(scorerMap).sort((a, b) => b.goals - a.goals)

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
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
          }}>Top Scorers</h1>
        </div>
        <ScorersClient initialScorers={initialScorers} tournamentId={tournamentId} />
      </div>
    </div>
  )
}
