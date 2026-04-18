import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'
import CardsClient, { type PlayerCardRow, type TeamCardRow } from '@/components/CardsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cards · Futsal' }

export default async function FutsalCardsPage() {
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('sport', 'futsal')
    .single()

  const tournamentId = tournament?.id ?? ''

  const { data: cardEvents } = await supabase
    .from('match_events')
    .select(`
      player_id, team_id, event_type,
      player:players(id, name, jersey_number),
      team:teams(id, name),
      match:matches!inner(tournament_id)
    `)
    .in('event_type', ['yellow_card', 'red_card'])
    .eq('match.tournament_id', tournamentId)

  const playerMap: Record<string, PlayerCardRow> = {}
  const teamMap: Record<string, TeamCardRow> = {}

  cardEvents?.forEach((e: unknown) => {
    const ev = e as {
      player_id: string; team_id: string; event_type: string;
      player: { name: string; jersey_number: number | null } | null;
      team: { id: string; name: string } | null
    }
    if (ev.player_id) {
      if (!playerMap[ev.player_id]) {
        playerMap[ev.player_id] = { name: ev.player?.name ?? 'Unknown', team: ev.team?.name ?? '-', teamId: ev.team?.id ?? null, yellow: 0, red: 0, jerseyNumber: ev.player?.jersey_number ?? null }
      }
      if (ev.event_type === 'yellow_card') playerMap[ev.player_id].yellow++
      if (ev.event_type === 'red_card') playerMap[ev.player_id].red++
    }
    if (ev.team_id && ev.team) {
      if (!teamMap[ev.team_id]) teamMap[ev.team_id] = { id: ev.team.id, name: ev.team.name, yellow: 0, red: 0 }
      if (ev.event_type === 'yellow_card') teamMap[ev.team_id].yellow++
      if (ev.event_type === 'red_card') teamMap[ev.team_id].red++
    }
  })

  const initialPlayers = Object.values(playerMap).sort((a, b) => (b.red * 3 + b.yellow) - (a.red * 3 + a.yellow))
  const initialTeams = Object.values(teamMap).sort((a, b) => (b.red * 3 + b.yellow) - (a.red * 3 + a.yellow))

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
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
          }}>Disciplinary Record</h1>
        </div>
        <CardsClient initialPlayers={initialPlayers} initialTeams={initialTeams} tournamentId={tournamentId} />
      </div>
    </div>
  )
}
