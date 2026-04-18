'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Match } from '@/lib/supabase/database.types'
import { formatDate, formatTime } from '@/lib/utils'
import Link from 'next/link'

interface HomeHeroClientProps {
  initialFeatured: Match | null
  initialRecent: Match[]
}

export default function HomeHeroClient({ initialFeatured, initialRecent }: HomeHeroClientProps) {
  const [featured, setFeatured] = useState<Match | null>(initialFeatured)
  const [recent, setRecent] = useState<Match[]>(initialRecent)
  const supabase = createClient()

  useEffect(() => {
    async function refetch() {
      const { data } = await supabase
        .from('matches')
        .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), tournament:tournaments(*)`)
        .in('status', ['live', 'completed'])
        .order('scheduled_at', { ascending: false })
        .limit(10)
      if (data) {
        setFeatured((data[0] as Match) ?? null)
        setRecent((data.slice(1, 6) as Match[]))
      }
    }

    const channel = supabase
      .channel('home-hero')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, refetch)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  if (!featured) return null

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
          </div>

          {/* Right: Recent results list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recent.map((match, idx) => (
              <Link
                key={match.id}
                href={(match.tournament as { sport: string })?.sport === 'futsal' ? `/futsal/match/${match.id}` : `/badminton/results`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: '#1a1a1a',
                  borderLeft: `3px solid ${idx === 0 ? '#CC0000' : '#333'}`,
                  borderRadius: 2,
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
              >
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
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
