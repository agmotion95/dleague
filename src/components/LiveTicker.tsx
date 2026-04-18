'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Match } from '@/lib/supabase/database.types'
import { formatTime, formatDate } from '@/lib/utils'
import Link from 'next/link'

interface LiveTickerProps {
  initialMatches: Match[]
}

export default function LiveTicker({ initialMatches }: LiveTickerProps) {
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('live-ticker')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
      }, async () => {
        const { data } = await supabase
          .from('matches')
          .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), tournament:tournaments(*)`)
          .in('status', ['live', 'completed'])
          .order('scheduled_at', { ascending: false })
          .limit(10)
        if (data) setMatches(data as Match[])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  const liveMatches = matches.filter(m => m.status === 'live')
  const recentMatches = matches.filter(m => m.status === 'completed').slice(0, 5)

  if (liveMatches.length === 0 && recentMatches.length === 0) return null

  const allMatches = [...liveMatches, ...recentMatches]

  return (
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 4, overflow: 'hidden' }}>
      {liveMatches.length > 0 && (
        <div style={{
          background: 'rgba(204, 0, 0, 0.08)',
          borderBottom: '1px solid rgba(204, 0, 0, 0.2)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span className="live-dot" />
          <span style={{
            fontFamily: 'var(--font-barlow), sans-serif',
            fontSize: 11,
            fontWeight: 700,
            color: '#FF1A1A',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>Live Now</span>
        </div>
      )}
      {allMatches.map((match, idx) => (
        <Link
          key={match.id}
          href={(match.tournament as { sport: string })?.sport === 'futsal' ? `/futsal/match/${match.id}` : `/badminton/results`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '12px 16px',
            borderBottom: idx < allMatches.length - 1 ? '1px solid #1a1a1a' : 'none',
            borderLeft: idx === 0 ? '3px solid #CC0000' : '3px solid #333',
            background: 'transparent',
            textDecoration: 'none',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1a1a1a' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          {/* Status */}
          <span style={{
            fontFamily: 'var(--font-barlow), sans-serif',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            background: match.status === 'live' ? '#CC0000' : '#CC0000',
            color: '#fff',
            padding: '3px 8px',
            borderRadius: 2,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}>
            {match.status === 'live' && <span className="live-dot" style={{ width: 5, height: 5 }} />}
            {match.status === 'live' ? 'LIVE' : 'FT'}
          </span>

          {/* Teams + score */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span style={{
                fontSize: 13,
                fontFamily: 'var(--font-inter), sans-serif',
                color: '#E8E8E8',
                fontWeight: match.winner_id === match.team1_id ? 500 : 400,
                flex: 1,
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {(match.team1 as { name: string })?.name ?? 'TBD'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{
                  fontFamily: 'var(--font-barlow), sans-serif',
                  fontWeight: 700,
                  fontSize: 16,
                  color: '#fff',
                }}>{match.score1 ?? 0}</span>
                <span style={{ color: '#CC0000', fontSize: 14 }}>–</span>
                <span style={{
                  fontFamily: 'var(--font-barlow), sans-serif',
                  fontWeight: 700,
                  fontSize: 16,
                  color: '#fff',
                }}>{match.score2 ?? 0}</span>
              </div>
              <span style={{
                fontSize: 13,
                fontFamily: 'var(--font-inter), sans-serif',
                color: '#E8E8E8',
                fontWeight: match.winner_id === match.team2_id ? 500 : 400,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {(match.team2 as { name: string })?.name ?? 'TBD'}
              </span>
            </div>
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <span style={{
                fontFamily: 'var(--font-barlow), sans-serif',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#CC0000',
                fontSize: 10,
              }}>
                {(match.tournament as { sport: string })?.sport === 'futsal' ? 'FUTSAL' : 'BADMINTON'}
              </span>
              <span style={{ fontSize: 12, color: '#555', fontFamily: 'var(--font-inter), sans-serif' }}>
                {' · '}{match.stage ?? 'Group Stage'}{match.venue ? ` · ${match.venue}` : ''}
              </span>
            </div>
          </div>

          {/* Time */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-inter), sans-serif' }}>
              {formatDate(match.scheduled_at, 'MMM d')}
            </div>
            <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-inter), sans-serif' }}>
              {formatTime(match.scheduled_at)}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
