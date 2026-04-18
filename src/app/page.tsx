import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import LiveTicker from '@/components/LiveTicker'
import HomeHeroClient from '@/components/HomeHeroClient'
import { formatDate } from '@/lib/utils'
import { computeHighlights } from '@/lib/statsHighlights'
import Link from 'next/link'
import type { Match, MatchEvent, Standing } from '@/lib/supabase/database.types'

export const revalidate = 30
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()

  const [
    { data: liveAndRecent },
    { data: upcoming },
    { data: allMatches },
    { data: matchEvents },
    { data: standings },
  ] = await Promise.all([
    supabase
      .from('matches')
      .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), winner:teams!matches_winner_id_fkey(*), tournament:tournaments(*)`)
      .in('status', ['live', 'completed'])
      .order('scheduled_at', { ascending: false })
      .limit(10),

    supabase
      .from('matches')
      .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), tournament:tournaments(*)`)
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(6),

    supabase
      .from('matches')
      .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), winner:teams!matches_winner_id_fkey(*), tournament:tournaments(*)`)
      .in('status', ['live', 'completed']),

    supabase
      .from('match_events')
      .select(`*, player:players(*), team:teams(*), match:matches(tournament:tournaments(sport))`),

    supabase
      .from('standings')
      .select('*, tournament:tournaments(sport)'),
  ])

  const featuredMatch = liveAndRecent?.[0] ?? null
  const recentList = liveAndRecent?.slice(1, 6) ?? []
  const tbdFinal = upcoming?.find(m => m.stage?.toLowerCase() === 'final')

  // Bracket matches for featured badminton match context
  const featuredSport = (featuredMatch?.tournament as { sport: string } | null)?.sport
  const bracketMatches: Match[] = featuredSport === 'badminton' && featuredMatch
    ? ((allMatches ?? []).filter(
        m => m.tournament_id === featuredMatch.tournament_id,
      ) as Match[])
    : []

  const highlights = computeHighlights(
    (allMatches ?? []) as Match[],
    (standings ?? []) as Standing[],
    (matchEvents ?? []) as MatchEvent[],
  )

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <Navbar />

      {/* Hero — Featured match (real-time) */}
      <HomeHeroClient
        initialFeatured={featuredMatch}
        initialRecent={recentList}
        initialBracketMatches={bracketMatches}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6" style={{ paddingTop: 32, paddingBottom: 80 }}>
        {/* TBD Final banner */}
        {tbdFinal && (
          <div style={{
            background: 'linear-gradient(90deg, #1a0000 0%, #111 100%)',
            border: '1px solid #CC0000',
            borderRadius: 4,
            padding: '16px 20px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <div>
              <span style={{
                fontFamily: 'var(--font-barlow), sans-serif',
                fontSize: 12,
                fontWeight: 700,
                color: '#CC0000',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>FINAL</span>
              <p style={{
                fontSize: 12,
                color: '#555',
                marginTop: 2,
                fontFamily: 'var(--font-inter), sans-serif',
              }}>
                {formatDate(tbdFinal.scheduled_at, 'EEE MMM d · HH:mm')}
              </p>
            </div>
            <span style={{
              fontFamily: 'var(--font-barlow), sans-serif',
              fontWeight: 700,
              fontSize: 22,
              color: '#fff',
            }}>
              {(tbdFinal.team1 as { name: string })?.name ?? 'TBD'} vs {(tbdFinal.team2 as { name: string })?.name ?? 'TBD'}
            </span>
            <Link
              href={`/${(tbdFinal.tournament as { sport: string })?.sport ?? 'futsal'}/bracket`}
              style={{
                fontFamily: 'var(--font-barlow), sans-serif',
                fontSize: 14,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#CC0000',
                textDecoration: 'none',
                letterSpacing: '0.08em',
              }}
            >
              → View Bracket
            </Link>
          </div>
        )}

        {/* Tournament Highlights */}
        {highlights.length > 0 && (() => {
          const futsalHighlights = highlights.filter(h => h.sport === 'futsal')
          const badmintonHighlights = highlights.filter(h => h.sport === 'badminton')

          const renderCard = (h: typeof highlights[0], i: number) => {
            const accent = h.sport === 'futsal' ? '#CC0000' : '#e8e8e8'
            return (
              <div key={i} style={{
                background: '#111',
                border: '1px solid #1e1e1e',
                borderLeft: `3px solid ${accent}`,
                borderRadius: 4,
                padding: '12px 14px',
              }}>
                <p style={{
                  fontFamily: 'var(--font-barlow), sans-serif',
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: accent,
                  margin: '0 0 4px',
                }}>
                  {h.label}
                </p>
                <p style={{
                  fontFamily: 'var(--font-barlow), sans-serif',
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#fff',
                  margin: '0 0 2px',
                  lineHeight: 1.2,
                }}>
                  {h.value}
                </p>
                {h.sub && (
                  <p style={{
                    fontSize: 11,
                    color: '#555',
                    margin: 0,
                    fontFamily: 'var(--font-inter), sans-serif',
                  }}>
                    {h.sub}
                  </p>
                )}
              </div>
            )
          }

          return (
            <section style={{ marginBottom: 40 }}>
              <div className="section-header">
                <h2 className="section-title">Tournament Highlights</h2>
              </div>

              {futsalHighlights.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{
                    fontFamily: 'var(--font-barlow), sans-serif',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: '#CC0000',
                    margin: '0 0 8px',
                  }}>Futsal</p>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: 8,
                  }}>
                    {futsalHighlights.map(renderCard)}
                  </div>
                </div>
              )}

              {badmintonHighlights.length > 0 && (
                <div>
                  <p style={{
                    fontFamily: 'var(--font-barlow), sans-serif',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: '#e8e8e8',
                    margin: '0 0 8px',
                  }}>Badminton</p>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: 8,
                  }}>
                    {badmintonHighlights.map(renderCard)}
                  </div>
                </div>
              )}
            </section>
          )
        })()}

        {/* Live/Recent — only shown when no featured match */}
        {!featuredMatch && (liveAndRecent?.length ?? 0) > 0 && (
          <section style={{ marginBottom: 48 }}>
            <div className="section-header">
              <h2 className="section-title">Live &amp; Recent</h2>
            </div>
            <LiveTicker initialMatches={(liveAndRecent ?? []) as Match[]} />
          </section>
        )}

        {/* Upcoming matches */}
        {(upcoming?.length ?? 0) > 0 && (
          <section>
            <div className="section-header">
              <h2 className="section-title">Upcoming Matches</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming!
                .filter(m => !tbdFinal || m.id !== tbdFinal.id)
                .map((match) => {
                  const sport = (match.tournament as { sport: string })?.sport ?? 'futsal'
                  return (
                    <div key={match.id} className="glass-card p-4">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{
                          fontFamily: 'var(--font-barlow), sans-serif',
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          color: '#CC0000',
                        }}>{sport.toUpperCase()}</span>
                        <span style={{ fontSize: 12, color: '#555', fontFamily: 'var(--font-inter), sans-serif' }}>
                          {formatDate(match.scheduled_at, 'EEE, MMM d · HH:mm')}
                        </span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                          <span style={{
                            fontWeight: 500,
                            fontSize: 13,
                            flex: 1,
                            textAlign: 'right',
                            color: '#E8E8E8',
                            fontFamily: 'var(--font-inter), sans-serif',
                          }}>
                            {(match.team1 as { name: string })?.name ?? 'TBD'}
                          </span>
                          <span style={{
                            color: '#555',
                            fontFamily: 'var(--font-barlow), sans-serif',
                            fontSize: 14,
                            fontWeight: 700,
                            padding: '4px 10px',
                            background: '#1a1a1a',
                            borderRadius: 2,
                          }}>vs</span>
                          <span style={{
                            fontWeight: 500,
                            fontSize: 13,
                            flex: 1,
                            textAlign: 'left',
                            color: '#E8E8E8',
                            fontFamily: 'var(--font-inter), sans-serif',
                          }}>
                            {(match.team2 as { name: string })?.name ?? 'TBD'}
                          </span>
                        </div>
                        {match.stage && (
                          <div style={{ marginTop: 8, fontSize: 12, color: '#555', fontFamily: 'var(--font-inter), sans-serif' }}>
                            {match.stage}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
