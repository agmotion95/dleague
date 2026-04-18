import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/badges'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Futsal Tournament' }

export default async function FutsalPage() {
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('sport', 'futsal')
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

  const { data: standings } = await supabase
    .from('standings')
    .select('*')
    .eq('tournament_id', tournament?.id ?? '')
    .order('points', { ascending: false })
    .limit(4)

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <Navbar sport="futsal" />

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
            Futsal Tournament
          </h1>
          {tournament && (
            <p style={{ color: '#555', marginTop: 8, fontSize: 13, fontFamily: 'var(--font-inter), sans-serif' }}>
              {formatDate(tournament.start_date)} – {formatDate(tournament.end_date)} · {tournament.format ?? 'Group + Knockout'}
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
                <Link key={m.id} href={`/futsal/match/${m.id}`}
                  style={{
                    display: 'block',
                    background: '#111',
                    border: '1px solid #CC0000',
                    borderLeft: '3px solid #CC0000',
                    borderRadius: 4,
                    padding: 16,
                    textDecoration: 'none',
                    transition: 'border-color 0.15s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <StatusBadge status={m.status} />
                    <span style={{ fontSize: 12, color: '#555', fontFamily: 'var(--font-inter), sans-serif' }}>{m.stage}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <span style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontWeight: 500,
                      flex: 1,
                      textAlign: 'right',
                      color: '#E8E8E8',
                      fontSize: 14,
                    }}>{(m.team1 as { name: string })?.name}</span>
                    <span style={{
                      fontFamily: 'var(--font-barlow), sans-serif',
                      fontWeight: 900,
                      fontSize: 28,
                      color: '#fff',
                    }}>{m.score1 ?? 0}
                      <span style={{ color: '#CC0000', margin: '0 8px' }}>–</span>
                      {m.score2 ?? 0}</span>
                    <span style={{
                      fontFamily: 'var(--font-inter), sans-serif',
                      fontWeight: 500,
                      flex: 1,
                      color: '#E8E8E8',
                      fontSize: 14,
                    }}>{(m.team2 as { name: string })?.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Mini standings */}
        {(standings?.length ?? 0) > 0 && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="section-header" style={{ marginBottom: 0 }}>
                <h2 className="section-title">Top of the Table</h2>
              </div>
              <Link href="/futsal/standings" style={{
                fontSize: 13,
                color: '#CC0000',
                textDecoration: 'none',
                fontFamily: 'var(--font-barlow), sans-serif',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>Full Standings →</Link>
            </div>
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-inter), sans-serif', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#0a0a0a', borderBottom: '1px solid #222' }}>
                      {['#', 'Team', 'P', 'GD', 'Pts'].map((h, i) => (
                        <th key={h} className="table-header" style={{
                          padding: '10px 12px',
                          textAlign: i === 0 || i === 1 ? 'left' : 'center',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {standings!.map((s, i) => (
                      <tr key={s.team_id} style={{
                        borderBottom: '1px solid #1a1a1a',
                        borderLeft: i === 0 ? '3px solid #CC0000' : '3px solid transparent',
                        background: i % 2 === 0 ? '#111' : '#0f0f0f',
                      }}>
                        <td style={{ padding: '12px', color: i === 0 ? '#fff' : '#555' }}>
                          <span style={{
                            fontFamily: 'var(--font-barlow), sans-serif',
                            fontWeight: i === 0 ? 700 : 400,
                            fontSize: i === 0 ? 16 : 13,
                          }}>{i + 1}</span>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 500, color: '#E8E8E8' }}>{s.team_name}</td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#999' }}>{s.played}</td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#999' }}>{s.goal_diff > 0 ? '+' : ''}{s.goal_diff}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            fontFamily: 'var(--font-barlow), sans-serif',
                            fontWeight: 700,
                            fontSize: 16,
                            color: '#fff',
                          }}>{s.points}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <Link href="/futsal/results" style={{
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
                <Link key={m.id} href={`/futsal/match/${m.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    background: '#111',
                    border: '1px solid #222',
                    borderLeft: `3px solid ${idx === 0 ? '#CC0000' : '#333'}`,
                    borderRadius: 4,
                    textDecoration: 'none',
                    transition: 'background 0.15s',
                  }}>
                  <StatusBadge status={m.status} />
                  <span style={{
                    flex: 1,
                    textAlign: 'right',
                    fontWeight: 500,
                    fontSize: 13,
                    color: '#E8E8E8',
                    fontFamily: 'var(--font-inter), sans-serif',
                  }}>{(m.team1 as { name: string })?.name}</span>
                  <span style={{
                    fontFamily: 'var(--font-barlow), sans-serif',
                    fontWeight: 700,
                    fontSize: 18,
                    color: '#fff',
                  }}>{m.score1}
                    <span style={{ color: '#CC0000', margin: '0 6px' }}>–</span>
                    {m.score2}</span>
                  <span style={{
                    flex: 1,
                    fontWeight: 500,
                    fontSize: 13,
                    color: '#E8E8E8',
                    fontFamily: 'var(--font-inter), sans-serif',
                  }}>{(m.team2 as { name: string })?.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
