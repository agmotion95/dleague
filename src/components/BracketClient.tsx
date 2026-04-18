'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Match } from '@/lib/supabase/database.types'
import Link from 'next/link'

interface BracketProps {
  initialMatches: Match[]
  tournamentId: string
}

function MatchCard({ match }: { match: Match | undefined }) {
  if (!match) {
    return (
      <div style={{
        minWidth: 180,
        background: '#111',
        border: '1px dashed #222',
        borderRadius: 2,
        padding: '12px 10px',
        textAlign: 'center',
        fontSize: 12,
        color: '#333',
        fontFamily: 'var(--font-barlow), sans-serif',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        TBD
      </div>
    )
  }

  const rows = [
    { team: match.team1, score: match.score1, isWinner: match.winner_id === match.team1_id },
    { team: match.team2, score: match.score2, isWinner: match.winner_id === match.team2_id },
  ]

  return (
    <div style={{
      minWidth: 180,
      background: '#111',
      border: '1px solid #222',
      borderRadius: 2,
      overflow: 'hidden',
    }}>
      {/* Round label */}
      <div style={{
        padding: '6px 10px 4px',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--font-barlow), sans-serif',
          fontSize: 10,
          fontWeight: 700,
          color: '#555',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          {match.stage}
        </span>
        {match.status === 'live' && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'var(--font-barlow), sans-serif',
            fontSize: 9,
            fontWeight: 700,
            color: '#FF1A1A',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            <span className="live-dot" style={{ width: 5, height: 5 }} />
            LIVE
          </span>
        )}
      </div>

      {/* Penalty win indicator */}
      {match.status === 'completed' && match.score1 !== null && match.score2 !== null && match.score1 === match.score2 && match.winner_id && (
        <div style={{
          padding: '3px 10px',
          background: 'rgba(255, 107, 53, 0.08)',
          borderBottom: '1px solid #1a1a1a',
          textAlign: 'center',
          fontFamily: 'var(--font-barlow), sans-serif',
          fontSize: 9,
          fontWeight: 700,
          color: '#ff6b35',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          {(match.winner_id === match.team1_id ? match.team1 : match.team2) && (
            <>{(match.winner_id === match.team1_id ? match.team1 : match.team2)!.name} wins on pens</>
          )}
        </div>
      )}

      {/* Player rows */}
      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            padding: '8px 10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: i === 0 ? '1px solid #1a1a1a' : 'none',
            background: row.isWinner ? '#1a0000' : 'transparent',
          }}
        >
          {row.team ? (
            <Link
              href={`/futsal/teams/${row.team.id}`}
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: 13,
                fontWeight: 500,
                color: row.isWinner ? '#fff' : '#444',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 110,
                display: 'block',
                textDecoration: 'none',
              }}
              className="hover:text-[#CC0000] transition-colors"
            >
              {row.team.name}
            </Link>
          ) : (
            <span style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 13,
              fontWeight: 500,
              color: '#444',
            }}>TBD</span>
          )}
          <span style={{
            fontFamily: 'var(--font-barlow), sans-serif',
            fontWeight: 700,
            fontSize: 16,
            color: row.isWinner ? '#CC0000' : '#333',
            marginLeft: 8,
            flexShrink: 0,
          }}>
            {match.status !== 'scheduled' ? (row.score ?? 0) : '–'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function BracketClient({ initialMatches, tournamentId }: BracketProps) {
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`bracket-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
      }, async () => {
        const { data } = await supabase
          .from('matches')
          .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), winner:teams!matches_winner_id_fkey(*)`)
          .eq('tournament_id', tournamentId)
          .order('bracket_position', { ascending: true })
        if (data) setMatches(data as Match[])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tournamentId, supabase])

  const byStage = (stage: string) => matches
    .filter(m => m.stage === stage)
    .sort((a, b) => (a.bracket_position ?? 0) - (b.bracket_position ?? 0))

  const playoffs = byStage('QF Playoff')
  const quarters = byStage('Quarterfinal')
  const semis = byStage('Semifinal')
  const finals = byStage('Final')

  const rounds = [
    { label: 'QF Playoffs', matches: playoffs },
    { label: 'Quarterfinals', matches: quarters },
    { label: 'Semifinals', matches: semis },
    { label: 'Final', matches: finals },
  ]

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
      <div style={{ display: 'flex', gap: 16, minWidth: 900 }}>
        {rounds.map(({ label, matches: roundMatches }) => (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Round label */}
            <div style={{
              textAlign: 'center',
              fontFamily: 'var(--font-barlow), sans-serif',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#555',
              padding: '6px 0',
              borderBottom: '1px solid #222',
            }}>
              {label}
            </div>
            {/* Matches */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {roundMatches.length > 0
                ? roundMatches.map(m => <MatchCard key={m.id} match={m} />)
                : <MatchCard match={undefined} />}
            </div>
          </div>
        ))}
      </div>

      {/* Champion display */}
      {finals[0]?.winner_id && (
        <div style={{
          marginTop: 32,
          background: 'linear-gradient(135deg, #1a0000, #0a0a0a)',
          border: '1px solid #CC0000',
          borderRadius: 4,
          padding: '20px 24px',
          textAlign: 'center',
        }}>
          <p style={{
            fontFamily: 'var(--font-barlow), sans-serif',
            fontSize: 12,
            fontWeight: 700,
            color: '#CC0000',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            margin: '0 0 8px',
          }}>
            🏆 Tournament Champion
          </p>
          <p style={{
            fontFamily: 'var(--font-barlow), sans-serif',
            fontWeight: 900,
            fontSize: 36,
            color: '#fff',
            margin: 0,
            letterSpacing: -0.5,
          }}>
            {finals[0].winner?.name}
          </p>
        </div>
      )}
    </div>
  )
}
