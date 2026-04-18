'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { rankAllGroups } from '@/lib/standings'
import type { RankedStanding, StandingRow, MatchForTiebreaker } from '@/lib/standings'
import type { Match, Team } from '@/lib/supabase/database.types'
import { MatchCard } from '@/components/MatchListClient'
import { formatDate } from '@/lib/utils'

interface FutsalFixturesClientProps {
  initialMatches: Match[]
  tournamentId: string
}

function resolveFinalists(
  matches: Match[],
  rankedStandings: RankedStanding[]
): Match[] {
  if (rankedStandings.length === 0) return matches

  // Top 2 entries by rank (works for single-group and multi-group)
  const top2 = rankedStandings
    .filter(s => s.rank <= 2)
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank
      return (a.group_name ?? '').localeCompare(b.group_name ?? '')
    })

  return matches.map(match => {
    const isFinal = match.stage?.toLowerCase() === 'final'
    if (!isFinal) return match
    if (match.team1_id && match.team2_id) return match

    const finalist1 = top2[0]
    const finalist2 = top2[1]

    const makeTeam = (s: RankedStanding): Team => ({
      id: s.team_id,
      tournament_id: s.tournament_id,
      name: s.team_name,
      logo_url: null,
      group_name: s.group_name,
      tiebreak_rank: s.tiebreak_rank,
      created_at: '',
    })

    return {
      ...match,
      team1: match.team1_id ? match.team1 : (finalist1 ? makeTeam(finalist1) : null),
      team2: match.team2_id ? match.team2 : (finalist2 ? makeTeam(finalist2) : null),
    }
  })
}

export default function FutsalFixturesClient({
  initialMatches,
  tournamentId,
}: FutsalFixturesClientProps) {
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const [rankedStandings, setRankedStandings] = useState<RankedStanding[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function refetchStandings() {
      const [{ data: standings }, { data: completedMatches }] = await Promise.all([
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
            (completedMatches ?? []) as MatchForTiebreaker[]
          )
        )
      }
    }

    async function refetchMatches() {
      const { data } = await supabase
        .from('matches')
        .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*)`)
        .eq('tournament_id', tournamentId)
        .eq('status', 'scheduled')
        .order('scheduled_at', { ascending: true })
      if (data) setMatches(data as Match[])
    }

    refetchStandings()

    const channel = supabase
      .channel(`futsal-fixtures-${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
      }, () => {
        refetchStandings()
        refetchMatches()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'match_events',
      }, refetchStandings)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tournamentId, supabase])

  const resolvedMatches = resolveFinalists(matches, rankedStandings)

  const grouped = resolvedMatches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.scheduled_at ? formatDate(m.scheduled_at, 'EEEE, MMMM d yyyy') : 'Date TBD'
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  if (resolvedMatches.length === 0) {
    return (
      <div className="glass-card p-10 text-center text-muted-foreground">
        No upcoming fixtures scheduled yet.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([date, dayMatches]) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {date}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-3">
            {dayMatches.map(match => (
              <MatchCard key={match.id} match={match} sport="futsal" showLink />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
