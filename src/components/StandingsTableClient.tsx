'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { rankAllGroups, TIEBREAKER_HIERARCHY } from '@/lib/standings'
import type { RankedStanding, StandingRow, MatchForTiebreaker } from '@/lib/standings'
import { cn } from '@/lib/utils'
import { Info, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

interface StandingsTableProps {
  initialRankedStandings: RankedStanding[]
  tournamentId: string
}

export default function StandingsTableClient({
  initialRankedStandings,
  tournamentId,
}: StandingsTableProps) {
  const [rankedStandings, setRankedStandings] = useState<RankedStanding[]>(initialRankedStandings)
  const [showLegend, setShowLegend] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function refetch() {
      const [{ data: standings }, { data: matches }] = await Promise.all([
        supabase.from('standings').select('*').eq('tournament_id', tournamentId),
        supabase
          .from('matches')
          .select('id, team1_id, team2_id, score1, score2, winner_id')
          .eq('tournament_id', tournamentId)
          .eq('status', 'completed'),
      ])
      if (standings) {
        setRankedStandings(
          rankAllGroups(
            standings as StandingRow[],
            (matches ?? []) as MatchForTiebreaker[]
          )
        )
      }
    }

    const channel = supabase
      .channel(`standings-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
      }, refetch)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'match_events',
      }, refetch)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tournamentId, supabase])

  const groups = Array.from(
    new Set(rankedStandings.map(s => s.group_name))
  ).sort()

  if (rankedStandings.length === 0) {
    return (
      <div className="glass-card p-10 text-center" style={{ color: '#555' }}>
        No standings data yet. Matches will update here automatically.
      </div>
    )
  }

  const hasAnyTiebreaker = rankedStandings.some(
    r => r.tiebreaker_rule !== null || r.has_tiebreak_warning
  )
  const hasAnyWarning = rankedStandings.some(r => r.has_tiebreak_warning)

  return (
    <div className="space-y-8">
      {/* Admin warning banner */}
      {hasAnyWarning && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '12px 16px',
          borderRadius: 4,
          background: 'rgba(234, 179, 8, 0.08)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          color: '#eab308',
          fontSize: 13,
          fontFamily: 'var(--font-inter), sans-serif',
        }}>
          <span style={{ fontSize: 18, lineHeight: 1, marginTop: 2 }}>⚠️</span>
          <div>
            <span style={{ fontWeight: 600 }}>Unresolved tie detected.</span>{' '}
            Two or more teams cannot be separated by any tiebreaker rule.
            An admin must set <code style={{ fontSize: 11, background: 'rgba(234, 179, 8, 0.15)', padding: '1px 4px', borderRadius: 2 }}>tiebreak_rank</code> values in the admin panel.
          </div>
        </div>
      )}

      {groups.map(group => {
        const groupRows = rankedStandings.filter(s => s.group_name === group)
        return (
          <div key={group} className="glass-card" style={{ overflow: 'hidden' }}>
            {/* Group header */}
            <div style={{
              padding: '10px 16px',
              background: '#0a0a0a',
              borderBottom: '1px solid #222',
              borderLeft: '3px solid #CC0000',
            }}>
              <h3 style={{
                fontFamily: 'var(--font-barlow), sans-serif',
                fontWeight: 700,
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#999',
                margin: 0,
              }}>
                {group ? `Group ${group}` : 'Standings'}
              </h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-inter), sans-serif', fontSize: 13 }} role="table">
                <thead>
                  <tr style={{ background: '#0a0a0a', borderBottom: '1px solid #222' }}>
                    <th className="table-header" style={{ textAlign: 'left', padding: '10px 12px', width: 32 }}>#</th>
                    <th className="table-header" style={{ textAlign: 'left', padding: '10px 12px' }}>Team</th>
                    <th className="table-header" style={{ textAlign: 'center', padding: '10px 12px' }}>P</th>
                    <th className="table-header" style={{ textAlign: 'center', padding: '10px 12px' }}>W</th>
                    <th className="table-header" style={{ textAlign: 'center', padding: '10px 12px' }}>D</th>
                    <th className="table-header" style={{ textAlign: 'center', padding: '10px 12px' }}>L</th>
                    <th className="table-header" style={{ textAlign: 'center', padding: '10px 12px' }}>GF</th>
                    <th className="table-header" style={{ textAlign: 'center', padding: '10px 12px' }}>GA</th>
                    <th className="table-header" style={{ textAlign: 'center', padding: '10px 12px' }}>GD</th>
                    <th className="table-header" style={{ textAlign: 'center', padding: '10px 16px', color: '#E8E8E8', fontWeight: 700 }}>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {groupRows.map((row, i) => (
                    <tr
                      key={row.team_id}
                      style={{
                        borderBottom: '1px solid #1a1a1a',
                        borderLeft: i < 2 ? '3px solid #CC0000' : '3px solid transparent',
                        background: i % 2 === 0 ? '#111' : '#0f0f0f',
                      }}
                      className="hover:bg-[#1a1a1a] transition-colors"
                    >
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontFamily: 'var(--font-barlow), sans-serif',
                          fontWeight: i === 0 ? 700 : 400,
                          fontSize: i === 0 ? 16 : 13,
                          color: i === 0 ? '#fff' : '#555',
                        }}>
                          {row.rank}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 500, color: '#E8E8E8' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Link
                            href={`/futsal/teams/${row.team_id}`}
                            style={{ color: 'inherit', textDecoration: 'none' }}
                            className="hover:text-[#CC0000] transition-colors"
                          >
                            {row.team_name}
                          </Link>
                          {(row.tiebreaker_rule !== null || row.has_tiebreak_warning) && (
                            <TiebreakerTooltip row={row} />
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#999' }}>{row.played}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#4ade80' }}>{row.won}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#facc15' }}>{row.drawn}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#f87171' }}>{row.lost}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#999' }}>{row.goals_for}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#999' }}>{row.goals_against}</td>
                      <td style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: 600,
                        color: row.goal_diff > 0 ? '#4ade80' : row.goal_diff < 0 ? '#f87171' : '#999',
                      }}>
                        {row.goal_diff > 0 ? '+' : ''}{row.goal_diff}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          fontFamily: 'var(--font-barlow), sans-serif',
                          fontWeight: 700,
                          fontSize: 16,
                          color: '#fff',
                        }}>
                          {row.points}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div style={{
              padding: '8px 16px',
              fontSize: 12,
              color: '#555',
              borderTop: '1px solid #222',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontFamily: 'var(--font-inter), sans-serif',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-block',
                  width: 3,
                  height: 14,
                  background: '#CC0000',
                  borderRadius: 1,
                }} />
                Advances to final
              </span>
            </div>
          </div>
        )
      })}

      {/* Tiebreaker legend */}
      {hasAnyTiebreaker && (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <button
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: '#555',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter), sans-serif',
            }}
            onClick={() => setShowLegend(v => !v)}
            aria-expanded={showLegend}
            className="hover:text-[#E8E8E8] transition-colors"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info style={{ width: 14, height: 14 }} />
              Tiebreaker Rules
            </span>
            {showLegend
              ? <ChevronUp style={{ width: 14, height: 14 }} />
              : <ChevronDown style={{ width: 14, height: 14 }} />}
          </button>
          {showLegend && (
            <div style={{
              padding: '12px 16px 16px',
              borderTop: '1px solid #222',
              fontFamily: 'var(--font-inter), sans-serif',
            }}>
              <p style={{ fontSize: 13, color: '#E8E8E8', fontWeight: 500, marginBottom: 10 }}>
                When teams are equal on points, positions are decided by:
              </p>
              <ol style={{ fontSize: 12, color: '#999', paddingLeft: 20, lineHeight: 1.8 }}>
                {TIEBREAKER_HIERARCHY.map((item, idx) => (
                  <li key={item.rule}>
                    <span style={{ color: '#E8E8E8' }}>{item.label}</span>
                    {idx === 1 && <span style={{ color: '#555' }}> (only among the tied teams)</span>}
                    {idx === 2 && <span style={{ color: '#555' }}> (only among the tied teams)</span>}
                    {idx === 7 && <span style={{ color: '#facc15' }}> — set by organizer</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TiebreakerTooltip({ row }: { row: RankedStanding }) {
  const tiedWith =
    row.tied_with_names.length > 0
      ? `Tied on points with ${row.tied_with_names.join(', ')}`
      : 'Tied on points'

  const reason = row.has_tiebreak_warning
    ? 'Admin must set tiebreak rank (Rule 7)'
    : row.tiebreaker_rule
      ? `Separated by: ${TIEBREAKER_HIERARCHY.find(h => h.rule === row.tiebreaker_rule)?.label ?? row.tiebreaker_rule}`
      : ''

  const tooltipText = reason ? `${tiedWith} — ${reason}` : tiedWith

  return (
    <span className="relative group inline-flex items-center">
      <span
        className={cn(
          'inline-flex items-center justify-center w-4 h-4 cursor-help',
          row.has_tiebreak_warning ? 'text-yellow-400' : 'text-[#555] hover:text-[#E8E8E8]'
        )}
        aria-label={tooltipText}
        role="img"
      >
        {row.has_tiebreak_warning
          ? <span style={{ fontSize: 11, lineHeight: 1 }}>⚠</span>
          : <Info style={{ width: 12, height: 12 }} />}
      </span>
      <span
        style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 8,
          zIndex: 50,
          width: 224,
          fontSize: 12,
          background: '#1a1a1a',
          color: '#E8E8E8',
          border: '1px solid #333',
          borderRadius: 4,
          padding: '8px 12px',
          pointerEvents: 'none',
          whiteSpace: 'normal',
          lineHeight: 1.5,
          fontFamily: 'var(--font-inter), sans-serif',
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        role="tooltip"
      >
        {tooltipText}
      </span>
    </span>
  )
}
