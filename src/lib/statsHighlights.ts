import type { Match, Standing, MatchEvent } from '@/lib/supabase/database.types'

export interface Highlight {
  label: string
  value: string
  sub?: string
  sport: 'futsal' | 'badminton'
}

export function computeHighlights(
  matches: Match[],
  standings: Standing[],
  events: MatchEvent[],
): Highlight[] {
  const highlights: Highlight[] = []

  const completed = matches.filter(m => m.status === 'completed' && m.score1 !== null && m.score2 !== null)
  const futsalCompleted = completed.filter(m => (m.tournament as { sport: string } | null)?.sport === 'futsal')
  const badmintonCompleted = completed.filter(m => (m.tournament as { sport: string } | null)?.sport === 'badminton')

  // ── FUTSAL ────────────────────────────────────────────────────────────────

  // Top scorer (futsal only — filter by joined match sport to exclude badminton events)
  const goalEvents = events.filter(
    e => (e.event_type === 'goal' || e.event_type === 'penalty_goal') && (e.match as { tournament: { sport: string } | null } | null)?.tournament?.sport === 'futsal',
  )
  const scorerMap = new Map<string, { name: string; count: number; teamName: string }>()
  for (const e of goalEvents) {
    if (!e.player_id || !e.player) continue
    const player = e.player as { name: string }
    const team = e.team as { name: string } | null
    const existing = scorerMap.get(e.player_id)
    if (existing) {
      scorerMap.set(e.player_id, { ...existing, count: existing.count + 1 })
    } else {
      scorerMap.set(e.player_id, { name: player.name, count: 1, teamName: team?.name ?? '' })
    }
  }
  const topScorer = Array.from(scorerMap.values()).sort((a, b) => b.count - a.count)[0]
  if (topScorer) {
    highlights.push({
      label: 'Top Scorer',
      value: topScorer.name,
      sub: `${topScorer.count} goal${topScorer.count !== 1 ? 's' : ''} · ${topScorer.teamName}`,
      sport: 'futsal',
    })
  }

  // Highest scoring futsal match
  const highestFutsal = [...futsalCompleted].sort(
    (a, b) => (b.score1! + b.score2!) - (a.score1! + a.score2!),
  )[0]
  if (highestFutsal && (highestFutsal.score1! + highestFutsal.score2!) > 0) {
    const t1 = (highestFutsal.team1 as { name: string } | null)?.name ?? 'TBD'
    const t2 = (highestFutsal.team2 as { name: string } | null)?.name ?? 'TBD'
    highlights.push({
      label: 'Highest Scoring Match',
      value: `${t1} ${highestFutsal.score1}–${highestFutsal.score2} ${t2}`,
      sub: `${highestFutsal.score1! + highestFutsal.score2!} total goals`,
      sport: 'futsal',
    })
  }

  // Biggest win — futsal
  const biggestFutsalWin = [...futsalCompleted].sort(
    (a, b) => Math.abs(b.score1! - b.score2!) - Math.abs(a.score1! - a.score2!),
  )[0]
  if (biggestFutsalWin) {
    const diff = Math.abs(biggestFutsalWin.score1! - biggestFutsalWin.score2!)
    if (diff > 1) {
      const winnerName = biggestFutsalWin.score1! > biggestFutsalWin.score2!
        ? (biggestFutsalWin.team1 as { name: string } | null)?.name ?? 'TBD'
        : (biggestFutsalWin.team2 as { name: string } | null)?.name ?? 'TBD'
      const loserName = biggestFutsalWin.score1! > biggestFutsalWin.score2!
        ? (biggestFutsalWin.team2 as { name: string } | null)?.name ?? 'TBD'
        : (biggestFutsalWin.team1 as { name: string } | null)?.name ?? 'TBD'
      highlights.push({
        label: 'Biggest Win',
        value: winnerName,
        sub: `Beat ${loserName} by ${diff} goals`,
        sport: 'futsal',
      })
    }
  }

  // Most yellow cards (team, futsal)
  const yellowMap = new Map<string, { name: string; count: number }>()
  for (const e of events.filter(
    e => e.event_type === 'yellow_card' && (e.match as { tournament: { sport: string } | null } | null)?.tournament?.sport === 'futsal',
  )) {
    const team = e.team as { name: string } | null
    if (!team || !e.team_id) continue
    const ex = yellowMap.get(e.team_id)
    if (ex) yellowMap.set(e.team_id, { ...ex, count: ex.count + 1 })
    else yellowMap.set(e.team_id, { name: team.name, count: 1 })
  }
  const mostYellows = Array.from(yellowMap.values()).sort((a, b) => b.count - a.count)[0]
  if (mostYellows && mostYellows.count > 0) {
    highlights.push({
      label: 'Most Booked',
      value: mostYellows.name,
      sub: `${mostYellows.count} yellow card${mostYellows.count !== 1 ? 's' : ''}`,
      sport: 'futsal',
    })
  }

  // Top attack (futsal standings only)
  const futsalStandings = standings.filter(
    s => s.played > 0 && (s.tournament as { sport: string } | null)?.sport === 'futsal',
  )
  const topAttack = [...futsalStandings].sort((a, b) => b.goals_for - a.goals_for)[0]
  if (topAttack && topAttack.goals_for > 0) {
    highlights.push({
      label: 'Top Attack',
      value: topAttack.team_name,
      sub: `${topAttack.goals_for} goals scored`,
      sport: 'futsal',
    })
  }

  // Best defense (futsal standings)
  const bestDefense = [...futsalStandings]
    .filter(s => s.played >= 2)
    .sort((a, b) => a.goals_against - b.goals_against)[0]
  if (bestDefense) {
    highlights.push({
      label: 'Best Defense',
      value: bestDefense.team_name,
      sub: `${bestDefense.goals_against} goals conceded`,
      sport: 'futsal',
    })
  }

  // Unbeaten team (futsal)
  const unbeaten = futsalStandings.filter(s => s.played >= 2 && s.lost === 0)
  if (unbeaten.length === 1) {
    highlights.push({
      label: 'Unbeaten',
      value: unbeaten[0].team_name,
      sub: `${unbeaten[0].played} games unbeaten`,
      sport: 'futsal',
    })
  } else if (unbeaten.length > 1) {
    highlights.push({
      label: 'Unbeaten Teams',
      value: `${unbeaten.length} teams`,
      sub: unbeaten.map(s => s.team_name).join(', '),
      sport: 'futsal',
    })
  }

  // Goals per match (futsal)
  if (futsalCompleted.length >= 3) {
    const totalGoals = futsalCompleted.reduce((sum, m) => sum + m.score1! + m.score2!, 0)
    const avg = (totalGoals / futsalCompleted.length).toFixed(1)
    highlights.push({
      label: 'Goals Per Match',
      value: avg,
      sub: `${totalGoals} goals across ${futsalCompleted.length} matches`,
      sport: 'futsal',
    })
  }

  // ── BADMINTON ─────────────────────────────────────────────────────────────

  // Biggest win — badminton (largest point diff)
  const biggestBadmintonWin = [...badmintonCompleted].sort(
    (a, b) => Math.abs(b.score1! - b.score2!) - Math.abs(a.score1! - a.score2!),
  )[0]
  if (biggestBadmintonWin) {
    const diff = Math.abs(biggestBadmintonWin.score1! - biggestBadmintonWin.score2!)
    if (diff > 0) {
      const winnerName = biggestBadmintonWin.score1! > biggestBadmintonWin.score2!
        ? (biggestBadmintonWin.team1 as { name: string } | null)?.name ?? 'TBD'
        : (biggestBadmintonWin.team2 as { name: string } | null)?.name ?? 'TBD'
      const loserName = biggestBadmintonWin.score1! > biggestBadmintonWin.score2!
        ? (biggestBadmintonWin.team2 as { name: string } | null)?.name ?? 'TBD'
        : (biggestBadmintonWin.team1 as { name: string } | null)?.name ?? 'TBD'
      highlights.push({
        label: 'Biggest Win',
        value: winnerName,
        sub: `Beat ${loserName} by ${diff} points`,
        sport: 'badminton',
      })
    }
  }

  // Highest scoring badminton match (total points)
  const highestBadminton = [...badmintonCompleted].sort(
    (a, b) => (b.score1! + b.score2!) - (a.score1! + a.score2!),
  )[0]
  if (highestBadminton && (highestBadminton.score1! + highestBadminton.score2!) > 0) {
    const t1 = (highestBadminton.team1 as { name: string } | null)?.name ?? 'TBD'
    const t2 = (highestBadminton.team2 as { name: string } | null)?.name ?? 'TBD'
    highlights.push({
      label: 'Highest Scoring Match',
      value: `${t1} ${highestBadminton.score1}–${highestBadminton.score2} ${t2}`,
      sub: `${highestBadminton.score1! + highestBadminton.score2!} total points`,
      sport: 'badminton',
    })
  }

  // Closest match — badminton (smallest point diff among completed)
  const closestBadminton = [...badmintonCompleted]
    .filter(m => Math.abs(m.score1! - m.score2!) > 0)
    .sort((a, b) => Math.abs(a.score1! - a.score2!) - Math.abs(b.score1! - b.score2!))[0]
  if (closestBadminton) {
    const diff = Math.abs(closestBadminton.score1! - closestBadminton.score2!)
    if (diff <= 4) {
      const t1 = (closestBadminton.team1 as { name: string } | null)?.name ?? 'TBD'
      const t2 = (closestBadminton.team2 as { name: string } | null)?.name ?? 'TBD'
      highlights.push({
        label: 'Closest Match',
        value: `${t1} ${closestBadminton.score1}–${closestBadminton.score2} ${t2}`,
        sub: `Decided by ${diff} point${diff !== 1 ? 's' : ''}`,
        sport: 'badminton',
      })
    }
  }

  // Most wins — badminton (by winner_id count)
  const winMap = new Map<string, { name: string; count: number }>()
  for (const m of badmintonCompleted) {
    if (!m.winner_id) continue
    const winner = (m.winner as { name: string } | null)?.name ?? 'TBD'
    const ex = winMap.get(m.winner_id)
    if (ex) winMap.set(m.winner_id, { ...ex, count: ex.count + 1 })
    else winMap.set(m.winner_id, { name: winner, count: 1 })
  }
  const mostWins = Array.from(winMap.values()).sort((a, b) => b.count - a.count)[0]
  if (mostWins && mostWins.count >= 2) {
    highlights.push({
      label: 'Most Dominant',
      value: mostWins.name,
      sub: `${mostWins.count} wins`,
      sport: 'badminton',
    })
  }

  return highlights
}
