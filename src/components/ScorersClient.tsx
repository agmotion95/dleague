'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export interface ScorerRow {
  name: string
  team: string
  teamId: string | null
  goals: number
  jerseyNumber: number | null
}

interface ScorersClientProps {
  initialScorers: ScorerRow[]
  tournamentId: string
}

export default function ScorersClient({ initialScorers, tournamentId }: ScorersClientProps) {
  const [scorers, setScorers] = useState<ScorerRow[]>(initialScorers)
  const supabase = createClient()

  useEffect(() => {
    async function refetch() {
      const { data } = await supabase
        .from('match_events')
        .select(`
          player_id, team_id,
          player:players(id, name, jersey_number),
          team:teams(id, name),
          match:matches!inner(tournament_id)
        `)
        .in('event_type', ['goal', 'penalty_goal'])
        .eq('match.tournament_id', tournamentId)

      if (!data) return

      const scorerMap: Record<string, ScorerRow> = {}
      data.forEach((e: unknown) => {
        const ev = e as {
          player_id: string
          team_id: string | null
          player: { name: string; jersey_number: number | null } | null
          team: { id: string; name: string } | null
        }
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

      setScorers(Object.values(scorerMap).sort((a, b) => b.goals - a.goals))
    }

    const channel = supabase
      .channel(`scorers-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'match_events',
      }, refetch)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tournamentId, supabase])

  const topGoals = scorers[0]?.goals ?? 1

  if (scorers.length === 0) {
    return (
      <div className="glass-card p-10 text-center" style={{ color: '#555' }}>
        No goals recorded yet. Goals update automatically!
      </div>
    )
  }

  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      {scorers.map((s, i) => {
        const isPodium = i < 3
        const barWidth = Math.round((s.goals / topGoals) * 100)

        const rowStyle: React.CSSProperties = {
          borderBottom: '1px solid #1a1a1a',
          borderLeft: i === 0
            ? '3px solid #CC0000'
            : i === 1
              ? '3px solid #555'
              : i === 2
                ? '3px solid #333'
                : '3px solid transparent',
          background: i === 0 ? '#150000' : i % 2 === 0 ? '#111' : '#0f0f0f',
          padding: '12px 16px',
        }

        return (
          <div key={`${s.name}-${i}`}>
            <div style={rowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{
                  fontFamily: 'var(--font-barlow), sans-serif',
                  fontWeight: 900,
                  fontSize: isPodium ? 20 : 14,
                  color: i === 0 ? '#fff' : '#555',
                  minWidth: 24,
                  flexShrink: 0,
                }}>
                  {i + 1}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {s.jerseyNumber && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 22,
                        height: 22,
                        background: 'rgba(204, 0, 0, 0.15)',
                        border: '1px solid rgba(204, 0, 0, 0.3)',
                        borderRadius: 2,
                        fontFamily: 'var(--font-barlow), sans-serif',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#CC0000',
                        flexShrink: 0,
                      }}>
                        {s.jerseyNumber}
                      </span>
                    )}
                    <span style={{
                      fontWeight: 500,
                      fontSize: 14,
                      color: '#E8E8E8',
                      fontFamily: 'var(--font-inter), sans-serif',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>{s.name}</span>
                  </div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    {s.teamId ? (
                      <Link
                        href={`/futsal/teams/${s.teamId}`}
                        style={{ color: '#555', textDecoration: 'none', fontFamily: 'var(--font-inter), sans-serif' }}
                        className="hover:text-[#CC0000] transition-colors"
                      >
                        {s.team}
                      </Link>
                    ) : (
                      <span style={{ color: '#555', fontFamily: 'var(--font-inter), sans-serif' }}>{s.team}</span>
                    )}
                  </div>
                </div>

                <span style={{
                  fontFamily: 'var(--font-barlow), sans-serif',
                  fontWeight: 900,
                  fontSize: i === 0 ? 20 : 16,
                  color: '#fff',
                  flexShrink: 0,
                }}>
                  {s.goals}
                </span>
              </div>
            </div>

            <div style={{ height: 4, background: '#1a1a1a', borderRadius: 0 }}>
              <div style={{
                height: '100%',
                width: `${barWidth}%`,
                background: i === 0 ? '#CC0000' : '#333',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
