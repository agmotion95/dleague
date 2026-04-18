'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Match, MatchEvent } from '@/lib/supabase/database.types'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'

interface MatchDetailClientProps {
  initialMatch: Match
  initialEvents: MatchEvent[]
}

export default function MatchDetailClient({ initialMatch, initialEvents }: MatchDetailClientProps) {
  const [match, setMatch] = useState<Match>(initialMatch)
  const [events, setEvents] = useState<MatchEvent[]>(initialEvents)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`match-${match.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${match.id}`,
      }, async () => {
        const { data } = await supabase
          .from('matches')
          .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*)`)
          .eq('id', match.id)
          .single()
        if (data) setMatch(data as Match)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'match_events',
        filter: `match_id=eq.${match.id}`,
      }, async () => {
        const { data } = await supabase
          .from('match_events')
          .select(`*, player:players(*), team:teams(*)`)
          .eq('match_id', match.id)
          .order('minute', { ascending: true })
        if (data) setEvents(data as MatchEvent[])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [match.id, supabase])

  const team1Goals = events.filter(e => e.event_type === 'goal' && e.team_id === match.team1_id)
  const team2Goals = events.filter(e => e.event_type === 'goal' && e.team_id === match.team2_id)
  const team1Penalties = events.filter(e => e.event_type === 'penalty_goal' && e.team_id === match.team1_id).length
  const team2Penalties = events.filter(e => e.event_type === 'penalty_goal' && e.team_id === match.team2_id).length
  const hasPenalties = events.some(e => e.event_type === 'penalty_goal')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Hero scoreline */}
      <div style={{
        background: '#111',
        borderBottom: '1px solid #222',
        padding: '40px 24px 32px',
        textAlign: 'center',
      }}>
        {/* Status + stage */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
          <span style={{
            fontFamily: 'var(--font-barlow), sans-serif',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            background: '#CC0000',
            color: '#fff',
            padding: '3px 8px',
            borderRadius: 2,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}>
            {match.status === 'live' && (
              <span style={{
                width: 6, height: 6,
                background: '#fff',
                borderRadius: '50%',
                animation: 'liveBlink 1.4s ease-in-out infinite',
                display: 'inline-block',
              }} />
            )}
            {match.status === 'live' ? 'LIVE' : match.status === 'completed' ? 'FT' : 'UPCOMING'}
          </span>
          {match.stage && (
            <span style={{
              fontSize: 12,
              color: '#555',
              fontFamily: 'var(--font-inter), sans-serif',
              padding: '3px 10px',
              background: '#1a1a1a',
              borderRadius: 2,
            }}>
              {match.stage}
            </span>
          )}
        </div>

        {/* Score grid: 1fr auto 1fr */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'start',
          gap: 16,
          maxWidth: 640,
          margin: '0 auto',
        }}>
          {/* Team A */}
          <div style={{ textAlign: 'right' }}>
            <p style={{
              fontFamily: 'var(--font-barlow), sans-serif',
              fontWeight: 900,
              fontSize: 28,
              textTransform: 'uppercase',
              color: match.winner_id && match.winner_id !== match.team1_id ? '#444' : '#fff',
              margin: 0,
              lineHeight: 1.1,
            }}>
              {match.team1 ? (
                <Link href={`/futsal/teams/${match.team1.id}`} style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-[#CC0000] transition-colors">
                  {match.team1.name}
                </Link>
              ) : 'TBD'}
            </p>
            <div style={{ marginTop: 8 }}>
              {team1Goals.map(g => (
                <div key={g.id} style={{
                  fontSize: 12,
                  color: '#999',
                  fontFamily: 'var(--font-inter), sans-serif',
                }}>
                  {g.player?.name}{g.minute ? ` ${g.minute}'` : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
            <span style={{
              fontFamily: 'var(--font-barlow), sans-serif',
              fontWeight: 900,
              fontSize: 'clamp(72px, 12vw, 96px)',
              color: '#fff',
              lineHeight: 1,
              letterSpacing: -2,
            }}>
              {match.score1 ?? 0}
            </span>
            <span style={{
              fontFamily: 'var(--font-barlow), sans-serif',
              fontWeight: 900,
              fontSize: 48,
              color: '#CC0000',
              lineHeight: 1,
            }}>–</span>
            <span style={{
              fontFamily: 'var(--font-barlow), sans-serif',
              fontWeight: 900,
              fontSize: 'clamp(72px, 12vw, 96px)',
              color: '#fff',
              lineHeight: 1,
              letterSpacing: -2,
            }}>
              {match.score2 ?? 0}
            </span>
          </div>

          {/* Team B */}
          <div style={{ textAlign: 'left' }}>
            <p style={{
              fontFamily: 'var(--font-barlow), sans-serif',
              fontWeight: 900,
              fontSize: 28,
              textTransform: 'uppercase',
              color: match.winner_id && match.winner_id !== match.team2_id ? '#444' : '#fff',
              margin: 0,
              lineHeight: 1.1,
            }}>
              {match.team2 ? (
                <Link href={`/futsal/teams/${match.team2.id}`} style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-[#CC0000] transition-colors">
                  {match.team2.name}
                </Link>
              ) : 'TBD'}
            </p>
            <div style={{ marginTop: 8 }}>
              {team2Goals.map(g => (
                <div key={g.id} style={{
                  fontSize: 12,
                  color: '#999',
                  fontFamily: 'var(--font-inter), sans-serif',
                }}>
                  {g.player?.name}{g.minute ? ` ${g.minute}'` : ''}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Penalty score */}
        {hasPenalties && (
          <div style={{ marginTop: 12 }}>
            {match.status === 'completed' && match.score1 === match.score2 && match.winner_id ? (
              <p style={{ fontSize: 12, color: '#ff6b35', textAlign: 'center', fontFamily: 'var(--font-inter), sans-serif', marginBottom: 4, fontWeight: 600 }}>
                {(match.winner_id === match.team1_id ? match.team1 : match.team2)?.name ?? 'Winner'} wins on penalties
              </p>
            ) : (
              <p style={{ fontSize: 11, color: '#555', textAlign: 'center', fontFamily: 'var(--font-inter), sans-serif', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Penalties
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-barlow), sans-serif', fontWeight: 900, fontSize: 28, color: '#CC0000', lineHeight: 1 }}>
                {team1Penalties}
              </span>
              <span style={{ fontFamily: 'var(--font-barlow), sans-serif', fontWeight: 900, fontSize: 18, color: '#444', lineHeight: 1 }}>–</span>
              <span style={{ fontFamily: 'var(--font-barlow), sans-serif', fontWeight: 900, fontSize: 28, color: '#CC0000', lineHeight: 1 }}>
                {team2Penalties}
              </span>
            </div>
          </div>
        )}

        {/* Venue + time */}
        <p style={{
          fontSize: 12,
          color: '#555',
          textAlign: 'center',
          marginTop: 20,
          fontFamily: 'var(--font-inter), sans-serif',
        }}>
          {match.venue && <span style={{ marginRight: 12 }}>{match.venue}</span>}
          {match.scheduled_at && <span>{formatDateTime(match.scheduled_at)}</span>}
        </p>
      </div>

      {/* Match events timeline */}
      {events.length > 0 && (
        <div style={{ maxWidth: 480, margin: '8px auto', width: '100%' }}>
          <div className="section-header">
            <h2 className="section-title">Match Events</h2>
          </div>
          <div style={{
            position: 'relative',
            paddingLeft: 40,
            paddingRight: 40,
          }}>
            {/* Center vertical line */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: 1,
              background: '#222',
              transform: 'translateX(-50%)',
            }} />

            {events.map((event) => {
              const isTeam1 = event.team_id === match.team1_id
              const isGoal = event.event_type === 'goal'
              const isPenaltyGoal = event.event_type === 'penalty_goal'
              const isYellow = event.event_type === 'yellow_card'
              const isRed = event.event_type === 'red_card'

              return (
                <div
                  key={event.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 48px 1fr',
                    alignItems: 'center',
                    marginBottom: 12,
                    gap: 0,
                  }}
                >
                  {/* Team 1 side */}
                  <div style={{ textAlign: 'right', paddingRight: 12 }}>
                    {isTeam1 && (
                      <span style={{
                        fontSize: 13,
                        fontFamily: 'var(--font-inter), sans-serif',
                        color: '#E8E8E8',
                      }}>
                        {event.player?.name ?? 'Unknown'}
                      </span>
                    )}
                  </div>

                  {/* Minute marker */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    position: 'relative',
                    zIndex: 1,
                  }}>
                    {/* Event icon */}
                    <span style={{
                      fontSize: 10,
                      display: 'block',
                      color: isGoal ? '#CC0000' : isPenaltyGoal ? '#ff6b35' : isYellow ? '#facc15' : isRed ? '#ef4444' : '#555',
                      lineHeight: 1,
                    }}>
                      {isGoal ? '●' : isPenaltyGoal ? '●' : isYellow ? '▪' : isRed ? '▪' : '○'}
                    </span>
                    {isPenaltyGoal && (
                      <span style={{ fontSize: 8, color: '#ff6b35', lineHeight: 1, letterSpacing: '0.05em' }}>P</span>
                    )}
                    {/* Minute */}
                    {event.minute && (
                      <span style={{
                        fontFamily: 'var(--font-barlow), sans-serif',
                        fontSize: 11,
                        color: '#555',
                        lineHeight: 1,
                      }}>
                        {event.minute}&apos;
                      </span>
                    )}
                  </div>

                  {/* Team 2 side */}
                  <div style={{ textAlign: 'left', paddingLeft: 12 }}>
                    {!isTeam1 && (
                      <span style={{
                        fontSize: 13,
                        fontFamily: 'var(--font-inter), sans-serif',
                        color: '#E8E8E8',
                      }}>
                        {event.player?.name ?? 'Unknown'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
