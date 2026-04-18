import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import LiveTicker from '@/components/LiveTicker'
import HomeHeroClient from '@/components/HomeHeroClient'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import type { Match } from '@/lib/supabase/database.types'

export const revalidate = 30
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: liveAndRecent } = await supabase
    .from('matches')
    .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), tournament:tournaments(*)`)
    .in('status', ['live', 'completed'])
    .order('scheduled_at', { ascending: false })
    .limit(10)

  const { data: upcoming } = await supabase
    .from('matches')
    .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), tournament:tournaments(*)`)
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: true })
    .limit(6)

  const featuredMatch = liveAndRecent?.[0]
  const recentList = liveAndRecent?.slice(1, 6) ?? []
  const tbdFinal = upcoming?.find(m => m.stage?.toLowerCase() === 'final')

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <Navbar />

      {/* Hero — Featured match (real-time) */}
      <HomeHeroClient initialFeatured={featuredMatch ?? null} initialRecent={recentList} />

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
