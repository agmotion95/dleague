import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/badges'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Badminton Tournament' }

export default async function BadmintonPage() {
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('sport', 'badminton')
    .single()

  const { data: liveMatches } = await supabase
    .from('matches')
    .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*)`)
    .eq('tournament_id', tournament?.id ?? '')
    .eq('status', 'live')

  const { data: recentMatches } = await supabase
    .from('matches')
    .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*)`)
    .eq('tournament_id', tournament?.id ?? '')
    .eq('status', 'completed')
    .order('scheduled_at', { ascending: false })
    .limit(3)

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <Navbar sport="badminton" />

      {/* Header */}
      <div style={{ background: '#111', borderBottom: '1px solid #222', padding: '32px 24px 24px' }}>
        <div className="max-w-7xl mx-auto">
          <p style={{
            fontFamily: 'var(--font-barlow), sans-serif',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#CC0000',
            marginBottom: 8,
          }}>
            Sports Day 2026
          </p>
          <h1 style={{
            fontFamily: 'var(--font-barlow), sans-serif',
            fontWeight: 900,
            fontSize: 'clamp(28px, 5vw, 48px)',
            textTransform: 'uppercase',
            color: '#fff',
            letterSpacing: -0.5,
            margin: 0,
          }}>
            Badminton Tournament
          </h1>
          {tournament && (
            <p style={{ color: '#555', marginTop: 8, fontSize: 13, fontFamily: 'var(--font-inter), sans-serif' }}>
              {formatDate(tournament.start_date)} – {formatDate(tournament.end_date)} · {tournament.format ?? 'Single Elimination'}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Live matches */}
        {(liveMatches?.length ?? 0) > 0 && (
          <section>
            <div className="section-header">
              <span className="live-dot" />
              <h2 style={{
                fontFamily: 'var(--font-barlow), sans-serif',
                fontSize: 13,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#FF1A1A',
                margin: 0,
              }}>Live Now</h2>
            </div>
            <div className="grid gap-3">
              {liveMatches!.map(m => (
                <div key={m.id} style={{
                  background: '#111',
                  border: '1px solid #CC0000',
                  borderLeft: '3px solid #CC0000',
                  borderRadius: 4,
                  padding: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <StatusBadge status={m.status} />
                    <span style={{ fontSize: 12, color: '#555', fontFamily: 'var(--font-inter), sans-serif' }}>{m.stage}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <span style={{ flex: 1, textAlign: 'right', fontWeight: 500, color: '#E8E8E8', fontSize: 14, fontFamily: 'var(--font-inter), sans-serif' }}>
                      {(m.team1 as { name: string })?.name ?? 'TBD'}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-barlow), sans-serif',
                      fontWeight: 900, fontSize: 28, color: '#fff',
                    }}>
                      {m.score1 ?? 0}
                      <span style={{ color: '#CC0000', margin: '0 8px' }}>–</span>
                      {m.score2 ?? 0}
                    </span>
                    <span style={{ flex: 1, fontWeight: 500, color: '#E8E8E8', fontSize: 14, fontFamily: 'var(--font-inter), sans-serif' }}>
                      {(m.team2 as { name: string })?.name ?? 'TBD'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent results */}
        {(recentMatches?.length ?? 0) > 0 && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="section-header" style={{ marginBottom: 0 }}>
                <h2 className="section-title">Recent Results</h2>
              </div>
              <Link href="/badminton/results" style={{
                fontSize: 13,
                color: '#CC0000',
                textDecoration: 'none',
                fontFamily: 'var(--font-barlow), sans-serif',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>All Results →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recentMatches!.map((m, idx) => (
                <div key={m.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: '#111',
                  border: '1px solid #222',
                  borderLeft: `3px solid ${idx === 0 ? '#CC0000' : '#333'}`,
                  borderRadius: 4,
                }}>
                  <StatusBadge status={m.status} />
                  <span style={{
                    flex: 1,
                    textAlign: 'right',
                    fontWeight: 500,
                    fontSize: 13,
                    color: '#E8E8E8',
                    fontFamily: 'var(--font-inter), sans-serif',
                  }}>{(m.team1 as { name: string })?.name ?? 'TBD'}</span>
                  <span style={{
                    fontFamily: 'var(--font-barlow), sans-serif',
                    fontWeight: 700,
                    fontSize: 18,
                    color: '#fff',
                  }}>
                    {m.score1}
                    <span style={{ color: '#CC0000', margin: '0 6px' }}>–</span>
                    {m.score2}
                  </span>
                  <span style={{
                    flex: 1,
                    fontWeight: 500,
                    fontSize: 13,
                    color: '#E8E8E8',
                    fontFamily: 'var(--font-inter), sans-serif',
                  }}>{(m.team2 as { name: string })?.name ?? 'TBD'}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* View bracket CTA */}
        <div style={{ textAlign: 'center' }}>
          <Link href="/badminton/bracket" className="btn-primary">
            View Full Bracket →
          </Link>
        </div>
      </div>
    </div>
  )
}
