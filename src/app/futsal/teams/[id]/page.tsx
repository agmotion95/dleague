import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TeamProfilePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: team }, { data: players }, { data: events }] = await Promise.all([
    supabase.from('teams').select('*').eq('id', id).single(),
    supabase.from('players').select('*').eq('team_id', id).order('jersey_number', { ascending: true }),
    supabase
      .from('match_events')
      .select('player_id, event_type')
      .eq('team_id', id)
      .in('event_type', ['goal', 'assist', 'yellow_card', 'red_card']),
  ])

  if (!team) notFound()

  type StatMap = Record<string, { goals: number; assists: number; yellow: number; red: number }>
  const stats: StatMap = {}
  for (const ev of events ?? []) {
    if (!ev.player_id) continue
    if (!stats[ev.player_id]) stats[ev.player_id] = { goals: 0, assists: 0, yellow: 0, red: 0 }
    if (ev.event_type === 'goal') stats[ev.player_id].goals++
    else if (ev.event_type === 'assist') stats[ev.player_id].assists++
    else if (ev.event_type === 'yellow_card') stats[ev.player_id].yellow++
    else if (ev.event_type === 'red_card') stats[ev.player_id].red++
  }

  return (
    <div className="min-h-screen">
      <Navbar sport="futsal" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link
          href="/futsal/standings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: '#555',
            fontFamily: 'var(--font-inter), sans-serif',
            marginBottom: 24,
            textDecoration: 'none',
          }}
          className="hover:text-[#E8E8E8] transition-colors"
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          Back to Standings
        </Link>

        <div className="section-header" style={{ marginBottom: 8 }}>
          <h1 style={{
            fontFamily: 'var(--font-barlow), sans-serif',
            fontWeight: 900,
            fontSize: 'clamp(28px, 5vw, 48px)',
            textTransform: 'uppercase',
            color: '#fff',
            letterSpacing: -0.5,
            margin: 0,
          }}>
            {team.name}
          </h1>
        </div>

        {team.group_name && (
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 13,
            color: '#555',
            marginBottom: 32,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Group {team.group_name}
          </p>
        )}

        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '10px 16px',
            background: '#0a0a0a',
            borderBottom: '1px solid #222',
            borderLeft: '3px solid #CC0000',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-barlow), sans-serif',
              fontWeight: 700,
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#999',
              margin: 0,
            }}>
              Squad ({players?.length ?? 0})
            </h2>
          </div>

          {!players || players.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#555', fontFamily: 'var(--font-inter), sans-serif', fontSize: 14 }}>
              No players registered yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-inter), sans-serif', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#0a0a0a', borderBottom: '1px solid #222' }}>
                    <th className="table-header" style={{ textAlign: 'center', padding: '10px 12px', width: 44 }}>#</th>
                    <th className="table-header" style={{ textAlign: 'left', padding: '10px 12px' }}>Player</th>
                    <th className="table-header" style={{ textAlign: 'center', padding: '10px 12px' }}>G</th>
                    <th className="table-header" style={{ textAlign: 'center', padding: '10px 12px' }}>A</th>
                    <th className="table-header" style={{ textAlign: 'center', padding: '10px 12px' }}>
                      <span style={{ color: '#facc15' }}>YC</span>
                    </th>
                    <th className="table-header" style={{ textAlign: 'center', padding: '10px 16px' }}>
                      <span style={{ color: '#f87171' }}>RC</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, i) => {
                    const s = stats[player.id] ?? { goals: 0, assists: 0, yellow: 0, red: 0 }
                    return (
                      <tr
                        key={player.id}
                        style={{
                          borderBottom: '1px solid #1a1a1a',
                          background: i % 2 === 0 ? '#111' : '#0f0f0f',
                        }}
                        className="hover:bg-[#1a1a1a] transition-colors"
                      >
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {player.jersey_number != null ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 26,
                              height: 26,
                              background: 'rgba(204, 0, 0, 0.12)',
                              border: '1px solid rgba(204, 0, 0, 0.25)',
                              borderRadius: 3,
                              fontFamily: 'var(--font-barlow), sans-serif',
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#CC0000',
                            }}>
                              {player.jersey_number}
                            </span>
                          ) : (
                            <span style={{ color: '#333', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 500, color: '#E8E8E8' }}>
                          {player.name}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: s.goals > 0 ? '#4ade80' : '#333', fontWeight: s.goals > 0 ? 700 : 400 }}>
                          {s.goals || '—'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: s.assists > 0 ? '#60a5fa' : '#333', fontWeight: s.assists > 0 ? 700 : 400 }}>
                          {s.assists || '—'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {s.yellow > 0 ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 20,
                              height: 26,
                              background: '#854d0e',
                              borderRadius: 2,
                              fontFamily: 'var(--font-barlow), sans-serif',
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#fef08a',
                            }}>
                              {s.yellow}
                            </span>
                          ) : (
                            <span style={{ color: '#333' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {s.red > 0 ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 20,
                              height: 26,
                              background: '#7f1d1d',
                              borderRadius: 2,
                              fontFamily: 'var(--font-barlow), sans-serif',
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#fca5a5',
                            }}>
                              {s.red}
                            </span>
                          ) : (
                            <span style={{ color: '#333' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{
            padding: '8px 16px',
            fontSize: 12,
            color: '#444',
            borderTop: '1px solid #222',
            fontFamily: 'var(--font-inter), sans-serif',
            display: 'flex',
            gap: 16,
          }}>
            <span>G = Goals</span>
            <span>A = Assists</span>
            <span style={{ color: '#facc15' }}>YC = Yellow Cards</span>
            <span style={{ color: '#f87171' }}>RC = Red Cards</span>
          </div>
        </div>
      </div>
    </div>
  )
}
