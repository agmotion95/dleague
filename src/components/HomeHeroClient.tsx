'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Match } from '@/lib/supabase/database.types'
import { formatDate, formatTime } from '@/lib/utils'
import { getBadmintonMatchContext } from '@/lib/matchContext'
import Link from 'next/link'

interface HomeHeroClientProps {
  initialFeatured: Match | null
  initialRecent: Match[]
  initialBracketMatches: Match[]
}

export default function HomeHeroClient({
  initialFeatured,
  initialRecent,
  initialBracketMatches,
}: HomeHeroClientProps) {
  const [featured, setFeatured] = useState<Match | null>(initialFeatured)
  const [recent, setRecent] = useState<Match[]>(initialRecent)
  const [bracketMatches, setBracketMatches] = useState<Match[]>(initialBracketMatches)
  const supabase = createClient()

  useEffect(() => {
    async function refetch() {
      const { data } = await supabase
        .from('matches')
        .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), winner:teams!matches_winner_id_fkey(*), tournament:tournaments(*)`)
        .in('status', ['live', 'completed'])
        .order('scheduled_at', { ascending: false })
        .limit(10)

      if (data) {
        const newFeatured = (data[0] as Match) ?? null
        setFeatured(newFeatured)
        setRecent((data.slice(1, 6) as Match[]))

        // fetch bracket matches when featured is badminton
        const sport = (newFeatured?.tournament as { sport: string } | null)?.sport
        if (newFeatured && sport === 'badminton') {
          const { data: bData } = await supabase
            .from('matches')
            .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), winner:teams!matches_winner_id_fkey(*), tournament:tournaments(*)`)
            .eq('tournament_id', (newFeatured.tournament as { id: string })?.id ?? newFeatured.tournament_id)
          if (bData) setBracketMatches(bData as Match[])
        }
      }
    }

    const channel = supabase
      .channel('home-hero')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, refetch)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  if (!featured) return null

  const sport = (featured.tournament as { sport: string } | null)?.sport
  const contextLine = sport === 'badminton'
    ? getBadmintonMatchContext(featured, bracketMatches)
    : null

  return (
    <section style={{ background: '#111', borderBottom: '1px solid #222', padding: '32px 24px' }}>
      <div className="max-w-7xl mx-auto">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }} className="grid-cols-1 lg:grid-cols-2">
          {/* Left: Score */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
            <div>
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
              }}>
                {featured.status === 'live' ? 'LIVE' : 'FT'}
              </span>
            </div>

            <p style={{
              fontFamily: 'var(--font-barlow), sans-serif',
              fontSize: 22,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#E8E8E8',
              margin: 0,
            }}>
              {(featured.team1 as { name: string })?.name ?? 'TBD'}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{
                fontFamily: 'var(--font-barlow), sans-serif',
                fontSize: 'clamp(56px, 8vw, 80px)',
                fontWeight: 900,
                color: '#fff',
                lineHeight: 1,
                letterSpacing: -2,
              }}>
                {featured.score1 ?? 0}
              </span>
              <span style={{
                fontFamily: 'var(--font-barlow), sans-serif',
                fontSize: 40,
                fontWeight: 900,
                color: '#CC0000',
                lineHeight: 1,
              }}>
                –
              </span>
              <span style={{
                fontFamily: 'var(--font-barlow), sans-serif',
                fontSize: 'clamp(56px, 8vw, 80px)',
                fontWeight: 900,
                color: '#fff',
                lineHeight: 1,
                letterSpacing: -2,
              }}>
                {featured.score2 ?? 0}
              </span>
            </div>

            <p style={{
              fontFamily: 'var(--font-barlow), sans-serif',
              fontSize: 22,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#E8E8E8',
              margin: 0,
            }}>
              {(featured.team2 as { name: string })?.name ?? 'TBD'}
            </p>

            {featured.status === 'completed' && featured.score1 !== null && featured.score2 !== null && featured.score1 === featured.score2 && featured.winner_id && (
              <p style={{ fontSize: 12, color: '#ff6b35', margin: 0, fontFamily: 'var(--font-inter), sans-serif' }}>
                {((featured.winner_id === featured.team1_id ? featured.team1 : featured.team2) as { name: string } | null)?.name ?? 'Winner'} wins on penalties
              </p>
            )}

            <p style={{ fontSize: 12, color: '#555', margin: 0, fontFamily: 'var(--font-inter), sans-serif' }}>
              <span style={{
                fontFamily: 'var(--font-barlow), sans-serif',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#CC0000',
                fontSize: 10,
              }}>
                {(featured.tournament as { sport: string })?.sport?.toUpperCase() ?? 'FUTSAL'}
              </span>
              {' · '}{featured.stage ?? 'Group Stage'}
              {featured.venue ? ` · ${featured.venue}` : ''}
              {featured.scheduled_at ? ` · ${formatDate(featured.scheduled_at, 'MMM d, HH:mm')}` : ''}
            </p>

            {/* Bracket context line */}
            {contextLine && (
              <p style={{
                fontSize: 12,
                color: '#888',
                margin: 0,
                fontFamily: 'var(--font-inter), sans-serif',
                fontStyle: 'italic',
                borderLeft: '2px solid #CC0000',
                paddingLeft: 8,
              }}>
                {contextLine}
              </p>
            )}
          </div>

          {/* Right: Recent results list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recent.map((match, idx) => (
              <Link
                key={match.id}
                href={(match.tournament as { sport: string })?.sport === 'futsal' ? `/futsal/match/${match.id}` : `/badminton/results`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '10px 14px',
                  background: '#1a1a1a',
                  borderLeft: `3px solid ${idx === 0 ? '#CC0000' : '#333'}`,
                  borderRadius: 2,
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontFamily: 'var(--font-barlow), sans-serif',
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    background: '#CC0000',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: 2,
                    flexShrink: 0,
                  }}>FT</span>
                  <span style={{
                    fontSize: 13,
                    color: '#E8E8E8',
                    flex: 1,
                    textAlign: 'right',
                    fontFamily: 'var(--font-inter), sans-serif',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {(match.team1 as { name: string })?.name ?? 'TBD'}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-barlow), sans-serif',
                    fontWeight: 700,
                    fontSize: 16,
                    color: '#fff',
                    flexShrink: 0,
                  }}>
                    {match.score1 ?? 0}–{match.score2 ?? 0}
                  </span>
                  <span style={{
                    fontSize: 13,
                    color: '#E8E8E8',
                    flex: 1,
                    fontFamily: 'var(--font-inter), sans-serif',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {(match.team2 as { name: string })?.name ?? 'TBD'}
                  </span>
                  <span style={{ fontSize: 11, color: '#555', flexShrink: 0, fontFamily: 'var(--font-inter), sans-serif' }}>
                    {formatTime(match.scheduled_at)}
                  </span>
                </div>
                {match.score1 !== null && match.score2 !== null && match.score1 === match.score2 && match.winner_id && (
                  <div style={{ fontSize: 10, color: '#ff6b35', textAlign: 'center', fontFamily: 'var(--font-inter), sans-serif' }}>
                    {((match.winner_id === match.team1_id ? match.team1 : match.team2) as { name: string } | null)?.name ?? 'Winner'} wins on penalties
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
