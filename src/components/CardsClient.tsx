'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export interface PlayerCardRow {
  name: string
  team: string
  teamId: string | null
  yellow: number
  red: number
  jerseyNumber: number | null
}

export interface TeamCardRow {
  id: string
  name: string
  yellow: number
  red: number
}

interface CardsClientProps {
  initialPlayers: PlayerCardRow[]
  initialTeams: TeamCardRow[]
  tournamentId: string
}

export default function CardsClient({ initialPlayers, initialTeams, tournamentId }: CardsClientProps) {
  const [players, setPlayers] = useState<PlayerCardRow[]>(initialPlayers)
  const [teams, setTeams] = useState<TeamCardRow[]>(initialTeams)
  const supabase = createClient()

  useEffect(() => {
    async function refetch() {
      const { data } = await supabase
        .from('match_events')
        .select(`
          player_id, team_id, event_type,
          player:players(id, name, jersey_number),
          team:teams(id, name),
          match:matches!inner(tournament_id)
        `)
        .in('event_type', ['yellow_card', 'red_card'])
        .eq('match.tournament_id', tournamentId)

      if (!data) return

      const playerMap: Record<string, PlayerCardRow> = {}
      const teamMap: Record<string, TeamCardRow> = {}

      data.forEach((e: unknown) => {
        const ev = e as {
          player_id: string
          team_id: string
          event_type: string
          player: { name: string; jersey_number: number | null } | null
          team: { id: string; name: string } | null
        }

        if (ev.player_id) {
          if (!playerMap[ev.player_id]) {
            playerMap[ev.player_id] = {
              name: ev.player?.name ?? 'Unknown',
              team: ev.team?.name ?? '-',
              teamId: ev.team?.id ?? null,
              yellow: 0,
              red: 0,
              jerseyNumber: ev.player?.jersey_number ?? null,
            }
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

      setPlayers(Object.values(playerMap).sort((a, b) => (b.red * 3 + b.yellow) - (a.red * 3 + a.yellow)))
      setTeams(Object.values(teamMap).sort((a, b) => (b.red * 3 + b.yellow) - (a.red * 3 + a.yellow)))
    }

    const channel = supabase
      .channel(`cards-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'match_events',
      }, refetch)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tournamentId, supabase])

  return (
    <div className="space-y-10">
      {/* Player cards */}
      <div>
        <h2 className="font-display font-bold text-lg mb-4 text-foreground">Player Cards</h2>
        {players.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">No cards recorded yet.</div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="table-header text-left px-5 py-3">Player</th>
                <th className="table-header text-left px-5 py-3">Team</th>
                <th className="table-header text-center px-5 py-3">🟨</th>
                <th className="table-header text-center px-5 py-3">🟥</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {players.map((p, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {p.jerseyNumber && (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-futsal/20 text-futsal text-xs font-bold">
                            {p.jerseyNumber}
                          </span>
                        )}
                        <span className="font-semibold text-foreground">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {p.teamId ? (
                        <Link href={`/futsal/teams/${p.teamId}`} className="text-muted-foreground hover:text-[#CC0000] transition-colors" style={{ textDecoration: 'none' }}>
                          {p.team}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{p.team}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {p.yellow > 0 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-yellow-500 text-black font-bold text-sm">{p.yellow}</span>
                      ) : <span className="text-muted-foreground">–</span>}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {p.red > 0 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-red-500 text-white font-bold text-sm">{p.red}</span>
                      ) : <span className="text-muted-foreground">–</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Team cards */}
      <div>
        <h2 className="font-display font-bold text-lg mb-4 text-foreground">Team Cards</h2>
        {teams.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">No team card data yet.</div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="table-header text-left px-5 py-3">Team</th>
                <th className="table-header text-center px-5 py-3">🟨 Yellow</th>
                <th className="table-header text-center px-5 py-3">🟥 Red</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {teams.map((t, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="px-5 py-3 font-semibold">
                      <Link href={`/futsal/teams/${t.id}`} className="hover:text-[#CC0000] transition-colors" style={{ textDecoration: 'none' }}>
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-center font-bold text-yellow-400">{t.yellow}</td>
                    <td className="px-5 py-3 text-center font-bold text-red-400">{t.red}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
