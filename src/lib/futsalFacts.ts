import type { Match, Standing, MatchEvent } from '@/lib/supabase/database.types'

export interface Fact {
  text: string
  category: 'player' | 'team' | 'match' | 'tournament'
}

type TeamName = { name: string } | null

function teamName(t: unknown): string {
  return (t as TeamName)?.name ?? 'TBD'
}

export function generateFutsalFacts(
  matches: Match[],
  standings: Standing[],
  events: MatchEvent[],
): Fact[] {
  const facts: Fact[] = []

  const completed = matches.filter(
    m => m.status === 'completed' && m.score1 !== null && m.score2 !== null &&
      (m.tournament as { sport: string } | null)?.sport === 'futsal',
  )

  if (completed.length === 0) return facts

  // ── Goal totals ──────────────────────────────────────────────────────────
  const totalGoals = completed.reduce((s, m) => s + m.score1! + m.score2!, 0)
  const avg = (totalGoals / completed.length).toFixed(1)
  const pace = Number(avg) >= 5 ? 'a goal-fest' : Number(avg) >= 3 ? 'free-scoring' : 'tight and tactical'
  facts.push({
    text: `${totalGoals} goals across ${completed.length} matches — averaging ${avg} per game, making this tournament ${pace}.`,
    category: 'tournament',
  })

  // ── No draws ─────────────────────────────────────────────────────────────
  const draws = completed.filter(m => m.score1 === m.score2).length
  if (draws === 0 && completed.length >= 3) {
    facts.push({
      text: `Not a single draw in ${completed.length} matches played — every game has produced a winner.`,
      category: 'tournament',
    })
  }

  // ── Close games (decided by 1 goal) ──────────────────────────────────────
  const closeGames = completed.filter(m => Math.abs(m.score1! - m.score2!) === 1)
  if (closeGames.length >= 2) {
    facts.push({
      text: `${closeGames.length} of ${completed.length} matches were decided by a single goal — expect more last-minute drama.`,
      category: 'match',
    })
  }

  // ── Highest scoring match ─────────────────────────────────────────────────
  const highestMatch = [...completed].sort((a, b) => (b.score1! + b.score2!) - (a.score1! + a.score2!))[0]
  if (highestMatch && (highestMatch.score1! + highestMatch.score2!) >= 4) {
    facts.push({
      text: `The clash between ${teamName(highestMatch.team1)} and ${teamName(highestMatch.team2)} (${highestMatch.score1}–${highestMatch.score2}) was the highest-scoring game with ${highestMatch.score1! + highestMatch.score2!} goals.`,
      category: 'match',
    })
  }

  // ── Biggest win ───────────────────────────────────────────────────────────
  const biggestWin = [...completed].sort(
    (a, b) => Math.abs(b.score1! - b.score2!) - Math.abs(a.score1! - a.score2!),
  )[0]
  if (biggestWin) {
    const diff = Math.abs(biggestWin.score1! - biggestWin.score2!)
    if (diff >= 3) {
      const winner = biggestWin.score1! > biggestWin.score2! ? teamName(biggestWin.team1) : teamName(biggestWin.team2)
      const loser = biggestWin.score1! > biggestWin.score2! ? teamName(biggestWin.team2) : teamName(biggestWin.team1)
      facts.push({
        text: `${winner}'s ${biggestWin.score1}–${biggestWin.score2} demolition of ${loser} is the tournament's most dominant result.`,
        category: 'match',
      })
    }
  }

  // ── Clean sheet leader ────────────────────────────────────────────────────
  const cleanSheetMap = new Map<string, number>()
  for (const m of completed) {
    if (m.score2 === 0 && m.team1_id) {
      cleanSheetMap.set(m.team1_id, (cleanSheetMap.get(m.team1_id) ?? 0) + 1)
    }
    if (m.score1 === 0 && m.team2_id) {
      cleanSheetMap.set(m.team2_id, (cleanSheetMap.get(m.team2_id) ?? 0) + 1)
    }
  }
  const topCS = Array.from(cleanSheetMap.entries()).sort((a, b) => b[1] - a[1])[0]
  if (topCS && topCS[1] >= 2) {
    const csStanding = standings.find(s => s.team_id === topCS[0])
    if (csStanding) {
      facts.push({
        text: `${csStanding.team_name} have kept ${topCS[1]} clean sheets — conceding 0 goals in ${topCS[1]} of their ${csStanding.played} games.`,
        category: 'team',
      })
    }
  }

  // ── Unbeaten team ─────────────────────────────────────────────────────────
  const unbeaten = standings.filter(s => s.played >= 3 && s.lost === 0)
  if (unbeaten.length === 1) {
    const u = unbeaten[0]
    facts.push({
      text: `${u.team_name} are the tournament's only unbeaten side — ${u.won}W ${u.drawn}D from ${u.played} games.`,
      category: 'team',
    })
  }

  // ── Team that scores in every game ────────────────────────────────────────
  const alwaysScored = standings.filter(s => s.played >= 3 && s.goals_for >= s.played)
  if (alwaysScored.length === 1) {
    facts.push({
      text: `${alwaysScored[0].team_name} have found the net in every single game they've played this tournament.`,
      category: 'team',
    })
  }

  // ── Player stats from events ──────────────────────────────────────────────
  const goalEvents = events.filter(e => e.event_type === 'goal')
  const assistEvents = events.filter(e => e.event_type === 'assist')

  // Scorer map
  const scorerMap = new Map<string, { name: string; count: number; teamName: string }>()
  for (const e of goalEvents) {
    if (!e.player_id || !e.player) continue
    const p = e.player as { name: string }
    const t = e.team as { name: string } | null
    const ex = scorerMap.get(e.player_id)
    scorerMap.set(e.player_id, ex
      ? { ...ex, count: ex.count + 1 }
      : { name: p.name, count: 1, teamName: t?.name ?? '' })
  }
  const scorers = Array.from(scorerMap.values()).sort((a, b) => b.count - a.count)

  if (scorers.length > 0) {
    const top = scorers[0]
    const joint = scorers.filter(s => s.count === top.count)
    if (joint.length === 1) {
      facts.push({
        text: `${top.name} leads the golden boot race with ${top.count} goal${top.count > 1 ? 's' : ''} for ${top.teamName}.`,
        category: 'player',
      })
    } else if (joint.length <= 3) {
      facts.push({
        text: `The golden boot race is wide open — ${joint.map(s => s.name).join(', ')} all share the lead with ${top.count} goal${top.count > 1 ? 's' : ''}.`,
        category: 'player',
      })
    }
  }

  // Hat-trick (3+ goals in a single match by same player)
  const goalsByMatchPlayer = new Map<string, number>()
  for (const e of goalEvents) {
    if (!e.player_id) continue
    const key = `${e.match_id}::${e.player_id}`
    goalsByMatchPlayer.set(key, (goalsByMatchPlayer.get(key) ?? 0) + 1)
  }
  const hatTricks = Array.from(goalsByMatchPlayer.entries()).filter(([, count]) => count >= 3)
  if (hatTricks.length > 0) {
    const [key, count] = hatTricks[0]
    const playerId = key.split('::')[1]
    const playerEntry = scorerMap.get(playerId)
    if (playerEntry) {
      facts.push({
        text: `${playerEntry.name} bagged ${count} goals in a single match — the tournament's standout individual performance.`,
        category: 'player',
      })
    }
  }

  // Multiple scorers (depth of scoring)
  const multiScorers = scorers.filter(s => s.count >= 2)
  if (multiScorers.length >= 3) {
    facts.push({
      text: `${multiScorers.length} players have scored 2 or more goals — the tournament's scoring is nicely spread.`,
      category: 'player',
    })
  }

  // Assist leader
  const assistMap = new Map<string, { name: string; count: number; teamName: string }>()
  for (const e of assistEvents) {
    if (!e.player_id || !e.player) continue
    const p = e.player as { name: string }
    const t = e.team as { name: string } | null
    const ex = assistMap.get(e.player_id)
    assistMap.set(e.player_id, ex
      ? { ...ex, count: ex.count + 1 }
      : { name: p.name, count: 1, teamName: t?.name ?? '' })
  }
  const topAssist = Array.from(assistMap.values()).sort((a, b) => b.count - a.count)[0]
  if (topAssist && topAssist.count >= 2) {
    facts.push({
      text: `${topAssist.name} leads the assists chart with ${topAssist.count} creative contributions for ${topAssist.teamName}.`,
      category: 'player',
    })
  }

  // ── Discipline ────────────────────────────────────────────────────────────
  const redCards = events.filter(e => e.event_type === 'red_card')
  if (redCards.length > 0) {
    facts.push({
      text: `${redCards.length} red card${redCards.length > 1 ? 's have' : ' has'} been shown — the tournament hasn't been short of flashpoints.`,
      category: 'tournament',
    })
  }

  // Most disciplined team (0 bookings, min 2 played)
  const cleanTeams = standings.filter(s => s.played >= 2 && s.yellow_cards_total === 0 && s.red_cards_total === 0)
  if (cleanTeams.length === 1) {
    facts.push({
      text: `${cleanTeams[0].team_name} have yet to receive a single booking — the tournament's fairest side.`,
      category: 'team',
    })
  }

  // ── Standings ─────────────────────────────────────────────────────────────
  const leader = [...standings].filter(s => s.played >= 2).sort((a, b) => b.points - a.points)[0]
  if (leader) {
    facts.push({
      text: `${leader.team_name} sit top of the standings with ${leader.points} points from ${leader.played} games — ${leader.goal_diff > 0 ? `+${leader.goal_diff}` : leader.goal_diff} goal difference.`,
      category: 'team',
    })
  }

  return facts
}
