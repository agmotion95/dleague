'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Match } from '@/lib/supabase/database.types'
import { StatusBadge } from '@/components/ui/badges'
import { formatDate, formatTime } from '@/lib/utils'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface MatchCardProps {
  match: Match
  sport?: 'futsal' | 'badminton'
  showLink?: boolean
}

export function MatchCard({ match, sport = 'futsal', showLink = true }: MatchCardProps) {
  const accentColor = sport === 'futsal' ? 'text-futsal' : 'text-badminton'
  const content = (
    <div className={cn(
      'glass-card p-4 hover:bg-white/5 transition-all duration-200',
      match.status === 'live' && 'ring-1 ring-red-500/40',
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={match.status} />
          {match.stage && (
            <span className={cn('text-xs font-medium', accentColor)}>{match.stage}</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground text-right">
          <div>{formatDate(match.scheduled_at, 'EEE, MMM d')}</div>
          <div>{formatTime(match.scheduled_at)}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={cn('flex-1 font-semibold text-sm text-right truncate',
          match.winner_id === match.team1_id ? 'text-foreground' : match.status === 'completed' ? 'text-muted-foreground' : 'text-foreground')}>
          {match.team1?.name ?? 'TBD'}
        </span>
        <div className="flex items-center gap-2 shrink-0 glass px-3 py-1.5 rounded-lg">
          <span className="score-display text-xl">{match.score1 ?? (match.status === 'scheduled' ? '-' : '0')}</span>
          <span className="text-muted-foreground text-sm">:</span>
          <span className="score-display text-xl">{match.score2 ?? (match.status === 'scheduled' ? '-' : '0')}</span>
        </div>
        <span className={cn('flex-1 font-semibold text-sm truncate',
          match.winner_id === match.team2_id ? 'text-foreground' : match.status === 'completed' ? 'text-muted-foreground' : 'text-foreground')}>
          {match.team2?.name ?? 'TBD'}
        </span>
      </div>
      {match.status === 'completed' && match.score1 !== null && match.score2 !== null && match.score1 === match.score2 && match.winner_id && (
        <div className="mt-1 text-xs text-center" style={{ color: '#ff6b35' }}>
          {(match.winner_id === match.team1_id ? match.team1?.name : match.team2?.name) ?? 'Winner'} wins on penalties
        </div>
      )}
      {match.venue && (
        <div className="mt-2 text-xs text-muted-foreground text-center">📍 {match.venue}</div>
      )}
    </div>
  )

  if (showLink && sport === 'futsal') {
    return <Link href={`/futsal/match/${match.id}`}>{content}</Link>
  }
  return content
}

interface MatchListClientProps {
  initialMatches: Match[]
  tournamentId: string
  sport?: 'futsal' | 'badminton'
  statusFilter?: string[]
  showLink?: boolean
  emptyMessage?: string
}

export default function MatchListClient({
  initialMatches,
  tournamentId,
  sport = 'futsal',
  statusFilter,
  showLink = true,
  emptyMessage = 'No matches found.',
}: MatchListClientProps) {
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`matches-${tournamentId}-${statusFilter?.join('-')}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
      }, async () => {
        let query = supabase
          .from('matches')
          .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), winner:teams!matches_winner_id_fkey(*)`)
          .eq('tournament_id', tournamentId)
          .order('scheduled_at', { ascending: true })
        if (statusFilter && statusFilter.length > 0) {
          query = query.in('status', statusFilter)
        }
        const { data } = await query
        if (data) setMatches(data as Match[])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tournamentId, supabase, statusFilter])

  // Group by date
  const grouped = matches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.scheduled_at ? formatDate(m.scheduled_at, 'EEEE, MMMM d yyyy') : 'Date TBD'
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  if (matches.length === 0) {
    return (
      <div className="glass-card p-10 text-center text-muted-foreground">{emptyMessage}</div>
    )
  }

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([date, dayMatches]) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{date}</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-3">
            {dayMatches.map(match => (
              <MatchCard key={match.id} match={match} sport={sport} showLink={showLink} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
