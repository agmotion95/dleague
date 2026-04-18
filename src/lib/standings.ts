// Futsal standings tiebreaker logic
// Implements 7-rule cascading tiebreaker hierarchy per FIFA group-stage rules

export type TiebreakerRule =
  | 'goal_difference'
  | 'head_to_head_points'
  | 'head_to_head_goal_difference'
  | 'goals_scored'
  | 'goals_conceded'
  | 'yellow_cards'
  | 'red_cards'
  | 'tiebreak_rank'

export const TIEBREAKER_RULE_LABELS: Record<TiebreakerRule, string> = {
  goal_difference: 'Overall goal difference',
  head_to_head_points: 'Head-to-head points',
  head_to_head_goal_difference: 'Head-to-head goal difference',
  goals_scored: 'Goals scored',
  goals_conceded: 'Goals conceded (fewest)',
  yellow_cards: 'Fair play — fewest yellow cards',
  red_cards: 'Fair play — fewest red cards',
  tiebreak_rank: 'Lucky draw (organizer)',
}

export const TIEBREAKER_HIERARCHY: { rule: TiebreakerRule; label: string }[] = [
  { rule: 'goal_difference', label: 'Goal difference (overall)' },
  { rule: 'head_to_head_points', label: 'Head-to-head points' },
  { rule: 'head_to_head_goal_difference', label: 'Head-to-head goal difference' },
  { rule: 'goals_scored', label: 'Goals scored (overall)' },
  { rule: 'goals_conceded', label: 'Goals conceded — fewest is better' },
  { rule: 'yellow_cards', label: 'Fair play — fewest yellow cards' },
  { rule: 'red_cards', label: 'Fair play — fewest red cards' },
  { rule: 'tiebreak_rank', label: 'Lucky draw (set by organizer)' },
]

export interface StandingRow {
  tournament_id: string
  team_id: string
  group_name: string | null
  team_name: string
  tiebreak_rank: number | null
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_diff: number
  points: number
  yellow_cards_total: number
  red_cards_total: number
}

export interface RankedStanding extends StandingRow {
  rank: number
  tiebreaker_rule: TiebreakerRule | null
  tied_with_names: string[]
  has_tiebreak_warning: boolean
}

export interface MatchForTiebreaker {
  id: string
  team1_id: string | null
  team2_id: string | null
  score1: number | null
  score2: number | null
  winner_id: string | null
}

const RULE_ORDER: TiebreakerRule[] = [
  'goal_difference',
  'head_to_head_points',
  'head_to_head_goal_difference',
  'goals_scored',
  'goals_conceded',
  'yellow_cards',
  'red_cards',
  'tiebreak_rank',
]

function computeH2HStats(
  teamId: string,
  tiedTeamIds: Set<string>,
  matches: MatchForTiebreaker[]
): { points: number; goal_diff: number } {
  let points = 0
  let gd = 0

  for (const m of matches) {
    if (!m.team1_id || !m.team2_id) continue
    // Both teams must be in the tied subset (mini-league rule)
    if (!tiedTeamIds.has(m.team1_id) || !tiedTeamIds.has(m.team2_id)) continue
    // This team must be involved
    if (m.team1_id !== teamId && m.team2_id !== teamId) continue

    const s1 = m.score1 ?? 0
    const s2 = m.score2 ?? 0

    if (m.winner_id === teamId) {
      points += 3
    } else if (m.winner_id === null) {
      points += 1
    }

    if (m.team1_id === teamId) {
      gd += s1 - s2
    } else {
      gd += s2 - s1
    }
  }

  return { points, goal_diff: gd }
}

// Returns a numeric score where HIGHER = BETTER position for all rules
function getRuleScore(
  team: StandingRow,
  rule: TiebreakerRule,
  tiedTeamIds: Set<string>,
  matches: MatchForTiebreaker[]
): number {
  switch (rule) {
    case 'goal_difference':
      return team.goal_diff
    case 'head_to_head_points':
      return computeH2HStats(team.team_id, tiedTeamIds, matches).points
    case 'head_to_head_goal_difference':
      return computeH2HStats(team.team_id, tiedTeamIds, matches).goal_diff
    case 'goals_scored':
      return team.goals_for
    case 'goals_conceded':
      return -team.goals_against // fewer = better → negate
    case 'yellow_cards':
      return -team.yellow_cards_total // fewer = better → negate
    case 'red_cards':
      return -team.red_cards_total // fewer = better → negate
    case 'tiebreak_rank':
      // lower rank number = better → negate; null means unresolved
      return team.tiebreak_rank !== null ? -team.tiebreak_rank : -Infinity
  }
}

// Partition an already-sorted array into groups of equal key values (stable, preserves order)
function partitionSorted<T>(items: T[], key: (item: T) => number): T[][] {
  if (items.length === 0) return []
  const groups: T[][] = [[items[0]]]
  for (let i = 1; i < items.length; i++) {
    const last = groups[groups.length - 1]
    if (key(items[i]) === key(last[0])) {
      last.push(items[i])
    } else {
      groups.push([items[i]])
    }
  }
  return groups
}

// Recursively resolves a tied subset starting from ruleIndex.
// originalTiedNames: the full set of names that were tied on points — used for tooltip text.
function resolveSubgroup(
  teams: StandingRow[],
  matches: MatchForTiebreaker[],
  ruleIndex: number,
  originalTiedNames: string[]
): RankedStanding[] {
  if (teams.length <= 1) {
    return teams.map(t => ({
      ...t,
      rank: 0,
      tiebreaker_rule: null,
      tied_with_names: [],
      has_tiebreak_warning: false,
    }))
  }

  if (ruleIndex >= RULE_ORDER.length) {
    // All rules exhausted — still tied, needs organizer intervention
    return teams.map(t => ({
      ...t,
      rank: 0,
      tiebreaker_rule: null,
      tied_with_names: originalTiedNames.filter(n => n !== t.team_name),
      has_tiebreak_warning: true,
    }))
  }

  const rule = RULE_ORDER[ruleIndex]

  // Rule 7 special case: if any team is missing tiebreak_rank, warn the whole group
  if (rule === 'tiebreak_rank' && teams.some(t => t.tiebreak_rank === null)) {
    return teams.map(t => ({
      ...t,
      rank: 0,
      tiebreaker_rule: 'tiebreak_rank',
      tied_with_names: originalTiedNames.filter(n => n !== t.team_name),
      has_tiebreak_warning: true,
    }))
  }

  const tiedTeamIds = new Set(teams.map(t => t.team_id))
  const scoreOf = (t: StandingRow) => getRuleScore(t, rule, tiedTeamIds, matches)

  // Sort descending (higher score = better position)
  const sorted = [...teams].sort((a, b) => scoreOf(b) - scoreOf(a))
  const groups = partitionSorted(sorted, scoreOf)

  if (groups.length === 1) {
    // This rule couldn't separate anyone — try the next rule
    return resolveSubgroup(teams, matches, ruleIndex + 1, originalTiedNames)
  }

  // At least partial separation achieved
  return groups.flatMap(group => {
    if (group.length === 1) {
      return [
        {
          ...group[0],
          rank: 0,
          tiebreaker_rule: rule,
          tied_with_names: originalTiedNames.filter(n => n !== group[0].team_name),
          has_tiebreak_warning: false,
        },
      ]
    }
    // Sub-group still tied — continue from the NEXT rule (don't restart from rule 0)
    return resolveSubgroup(group, matches, ruleIndex + 1, originalTiedNames)
  })
}

/**
 * Ranks all teams within a single group using the 7-rule tiebreaker hierarchy.
 * matches should be only completed matches between teams in this group.
 */
export function rankGroup(
  standings: StandingRow[],
  matches: MatchForTiebreaker[]
): RankedStanding[] {
  if (standings.length === 0) return []

  const sortedByPoints = [...standings].sort((a, b) => b.points - a.points)
  const pointGroups = partitionSorted(sortedByPoints, s => s.points)

  const result: RankedStanding[] = []
  let nextRank = 1

  for (const group of pointGroups) {
    let resolved: RankedStanding[]

    if (group.length === 1) {
      resolved = [
        {
          ...group[0],
          rank: nextRank,
          tiebreaker_rule: null,
          tied_with_names: [],
          has_tiebreak_warning: false,
        },
      ]
    } else {
      const originalTiedNames = group.map(t => t.team_name)
      resolved = resolveSubgroup(group, matches, 0, originalTiedNames)
      resolved.forEach((r, i) => {
        r.rank = nextRank + i
      })
    }

    nextRank += group.length
    result.push(...resolved)
  }

  return result
}

/**
 * Ranks all teams across all groups in a tournament.
 * Returns a flat list — groups are distinguished by group_name on each row.
 */
export function rankAllGroups(
  standings: StandingRow[],
  matches: MatchForTiebreaker[]
): RankedStanding[] {
  const groupMap = new Map<string, StandingRow[]>()

  for (const s of standings) {
    const key = s.group_name ?? ''
    const existing = groupMap.get(key)
    if (existing) {
      existing.push(s)
    } else {
      groupMap.set(key, [s])
    }
  }

  const result: RankedStanding[] = []
  const sortedGroups = Array.from(groupMap.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  )

  for (const [, groupStandings] of sortedGroups) {
    const teamIds = new Set(groupStandings.map(s => s.team_id))
    const groupMatches = matches.filter(
      m =>
        m.team1_id &&
        m.team2_id &&
        teamIds.has(m.team1_id) &&
        teamIds.has(m.team2_id)
    )
    result.push(...rankGroup(groupStandings, groupMatches))
  }

  return result
}

/**
 * Returns teams in a group that have unresolved ties requiring admin action.
 * Used by the admin UI to surface warnings.
 */
export function getUnresolvedTies(
  standings: StandingRow[],
  matches: MatchForTiebreaker[]
): RankedStanding[] {
  return rankAllGroups(standings, matches).filter(r => r.has_tiebreak_warning)
}
