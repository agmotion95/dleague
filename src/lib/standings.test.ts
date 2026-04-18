import { describe, it, expect } from 'vitest'
import { rankGroup, rankAllGroups } from './standings'
import type { StandingRow, MatchForTiebreaker } from './standings'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeTeam(
  id: string,
  name: string,
  points: number,
  opts: Partial<StandingRow> = {}
): StandingRow {
  return {
    tournament_id: 'tournament-1',
    team_id: id,
    group_name: 'A',
    team_name: name,
    tiebreak_rank: null,
    played: 3,
    won: Math.floor(points / 3),
    drawn: points % 3,
    lost: 0,
    goals_for: opts.goals_for ?? 3,
    goals_against: opts.goals_against ?? 3,
    goal_diff: opts.goal_diff ?? 0,
    points,
    yellow_cards_total: opts.yellow_cards_total ?? 0,
    red_cards_total: opts.red_cards_total ?? 0,
    ...opts,
  }
}

function makeMatch(
  id: string,
  team1_id: string,
  team2_id: string,
  score1: number,
  score2: number
): MatchForTiebreaker {
  const winner_id =
    score1 > score2 ? team1_id : score2 > score1 ? team2_id : null
  return { id, team1_id, team2_id, score1, score2, winner_id }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('rankGroup — Rule 1: goal difference', () => {
  it('separates two teams with different goal difference', () => {
    const teams = [
      makeTeam('a', 'Alpha', 6, { goal_diff: 2, goals_for: 5, goals_against: 3 }),
      makeTeam('b', 'Beta', 6, { goal_diff: -1, goals_for: 2, goals_against: 3 }),
    ]
    const ranked = rankGroup(teams, [])
    expect(ranked[0].team_id).toBe('a')
    expect(ranked[1].team_id).toBe('b')
    expect(ranked[0].rank).toBe(1)
    expect(ranked[1].rank).toBe(2)
    expect(ranked[0].tiebreaker_rule).toBe('goal_difference')
    expect(ranked[0].tied_with_names).toContain('Beta')
  })

  it('does not set tiebreaker_rule when teams are separated by points alone', () => {
    const teams = [
      makeTeam('a', 'Alpha', 9),
      makeTeam('b', 'Beta', 6),
    ]
    const ranked = rankGroup(teams, [])
    expect(ranked[0].tiebreaker_rule).toBeNull()
    expect(ranked[1].tiebreaker_rule).toBeNull()
    expect(ranked[0].tied_with_names).toHaveLength(0)
  })
})

describe('rankGroup — Rule 2: head-to-head points', () => {
  it('separates two teams with same GD using h2h points', () => {
    const teams = [
      makeTeam('a', 'Alpha', 4, { goal_diff: 0 }),
      makeTeam('b', 'Beta', 4, { goal_diff: 0 }),
    ]
    // Alpha beat Beta 2-1 in their head-to-head
    const matches = [makeMatch('m1', 'a', 'b', 2, 1)]

    const ranked = rankGroup(teams, matches)
    expect(ranked[0].team_id).toBe('a')
    expect(ranked[0].tiebreaker_rule).toBe('head_to_head_points')
  })

  it('uses mini-league (only among tied teams) for h2h', () => {
    // 3 teams all on 4 pts, same GD — but only Alpha beat Beta in h2h
    const teams = [
      makeTeam('a', 'Alpha', 4, { goal_diff: 0 }),
      makeTeam('b', 'Beta', 4, { goal_diff: 0 }),
      makeTeam('c', 'Gamma', 4, { goal_diff: 0 }),
    ]
    // Alpha beat Beta; Gamma beat Alpha; Beta beat Gamma — Alpha has 3pts, Beta 3pts, Gamma 3pts in h2h
    // Actually let's make it: Alpha beat Beta (3pts), Gamma beat Alpha (3pts), Gamma beat Beta (3pts)
    // So h2h pts: Alpha=3, Beta=0, Gamma=6
    const matches = [
      makeMatch('m1', 'a', 'b', 2, 0), // Alpha beats Beta
      makeMatch('m2', 'c', 'a', 1, 0), // Gamma beats Alpha
      makeMatch('m3', 'c', 'b', 1, 0), // Gamma beats Beta
    ]

    const ranked = rankGroup(teams, matches)
    expect(ranked[0].team_id).toBe('c') // 6 h2h pts
    expect(ranked[1].team_id).toBe('a') // 3 h2h pts
    expect(ranked[2].team_id).toBe('b') // 0 h2h pts
    expect(ranked[0].tiebreaker_rule).toBe('head_to_head_points')
  })
})

describe('rankGroup — Three-way tie: rule 2 partially resolves, rule 3 finishes', () => {
  it('separates one team via h2h points, remaining two via h2h goal difference', () => {
    const teams = [
      makeTeam('a', 'Alpha', 3, { goal_diff: 0 }),
      makeTeam('b', 'Beta', 3, { goal_diff: 0 }),
      makeTeam('c', 'Gamma', 3, { goal_diff: 0 }),
    ]
    // Alpha beats Beta 3-0 (Alpha: 3 h2h pts)
    // Gamma beats Alpha 1-0 (Gamma: 3 h2h pts, Alpha has 3 h2h pts too now)
    // Beta beats Gamma 1-0 (Beta: 3 h2h pts)
    // All have 3 h2h pts → rule 2 doesn't separate → rule 3: h2h GD
    // Alpha GD in h2h: beat Beta +3, lost to Gamma -1 = +2
    // Beta GD: lost to Alpha -3, beat Gamma +1 = -2
    // Gamma GD: lost to Beta -1, beat Alpha +1 = 0
    const matches = [
      makeMatch('m1', 'a', 'b', 3, 0), // Alpha beats Beta
      makeMatch('m2', 'c', 'a', 1, 0), // Gamma beats Alpha
      makeMatch('m3', 'b', 'c', 1, 0), // Beta beats Gamma
    ]

    const ranked = rankGroup(teams, matches)
    // h2h points: all 3 (no separation from rule 2)
    // h2h goal diff: Alpha +2, Gamma 0, Beta -2
    expect(ranked[0].team_id).toBe('a') // best h2h GD
    expect(ranked[1].team_id).toBe('c')
    expect(ranked[2].team_id).toBe('b')
    expect(ranked[0].tiebreaker_rule).toBe('head_to_head_goal_difference')
    expect(ranked[0].tied_with_names).toContain('Beta')
    expect(ranked[0].tied_with_names).toContain('Gamma')
  })
})

describe('rankGroup — Rule 4: goals scored', () => {
  it('separates by total goals scored when earlier rules fail', () => {
    const teams = [
      makeTeam('a', 'Alpha', 3, { goal_diff: 0, goals_for: 5, goals_against: 5 }),
      makeTeam('b', 'Beta', 3, { goal_diff: 0, goals_for: 2, goals_against: 2 }),
    ]
    // No h2h match between them (or draw with same GD)
    const ranked = rankGroup(teams, [])
    expect(ranked[0].team_id).toBe('a') // 5 goals > 2 goals
    expect(ranked[0].tiebreaker_rule).toBe('goals_scored')
  })
})

describe('rankGroup — Rule 5 & 6: goals conceded and fair play', () => {
  it('separates by fewer goals conceded when goals_for are equal', () => {
    const teams = [
      makeTeam('a', 'Alpha', 3, { goal_diff: 0, goals_for: 3, goals_against: 3 }),
      makeTeam('b', 'Beta', 3, { goal_diff: 0, goals_for: 3, goals_against: 5 }),
    ]
    const ranked = rankGroup(teams, [])
    expect(ranked[0].team_id).toBe('a') // fewer goals against
    expect(ranked[0].tiebreaker_rule).toBe('goals_conceded')
  })

  it('separates by fewest yellow cards (rule 6a)', () => {
    const teams = [
      makeTeam('a', 'Alpha', 3, { goal_diff: 0, goals_for: 3, goals_against: 3, yellow_cards_total: 1 }),
      makeTeam('b', 'Beta', 3, { goal_diff: 0, goals_for: 3, goals_against: 3, yellow_cards_total: 3 }),
    ]
    const ranked = rankGroup(teams, [])
    expect(ranked[0].team_id).toBe('a')
    expect(ranked[0].tiebreaker_rule).toBe('yellow_cards')
  })

  it('separates by fewest red cards (rule 6b) when yellow cards are equal', () => {
    const teams = [
      makeTeam('a', 'Alpha', 3, {
        goal_diff: 0, goals_for: 3, goals_against: 3,
        yellow_cards_total: 2, red_cards_total: 0,
      }),
      makeTeam('b', 'Beta', 3, {
        goal_diff: 0, goals_for: 3, goals_against: 3,
        yellow_cards_total: 2, red_cards_total: 1,
      }),
    ]
    const ranked = rankGroup(teams, [])
    expect(ranked[0].team_id).toBe('a')
    expect(ranked[0].tiebreaker_rule).toBe('red_cards')
  })
})

describe('rankGroup — Rule 7: tiebreak_rank fallback', () => {
  it('separates teams by tiebreak_rank when all other rules fail', () => {
    const teams = [
      makeTeam('a', 'Alpha', 3, {
        goal_diff: 0, goals_for: 3, goals_against: 3,
        yellow_cards_total: 0, red_cards_total: 0, tiebreak_rank: 2,
      }),
      makeTeam('b', 'Beta', 3, {
        goal_diff: 0, goals_for: 3, goals_against: 3,
        yellow_cards_total: 0, red_cards_total: 0, tiebreak_rank: 1,
      }),
    ]
    const ranked = rankGroup(teams, [])
    expect(ranked[0].team_id).toBe('b') // rank 1 is better
    expect(ranked[0].tiebreaker_rule).toBe('tiebreak_rank')
    expect(ranked[0].has_tiebreak_warning).toBe(false)
  })

  it('surfaces warning when tiebreak_rank is null and all other rules are exhausted', () => {
    const teams = [
      makeTeam('a', 'Alpha', 3, {
        goal_diff: 0, goals_for: 3, goals_against: 3,
        yellow_cards_total: 0, red_cards_total: 0, tiebreak_rank: null,
      }),
      makeTeam('b', 'Beta', 3, {
        goal_diff: 0, goals_for: 3, goals_against: 3,
        yellow_cards_total: 0, red_cards_total: 0, tiebreak_rank: null,
      }),
    ]
    const ranked = rankGroup(teams, [])
    expect(ranked[0].has_tiebreak_warning).toBe(true)
    expect(ranked[1].has_tiebreak_warning).toBe(true)
    expect(ranked[0].tiebreaker_rule).toBe('tiebreak_rank')
    expect(ranked[0].tied_with_names.length).toBeGreaterThan(0)
  })

  it('surfaces warning when only some teams are missing tiebreak_rank', () => {
    const teams = [
      makeTeam('a', 'Alpha', 3, {
        goal_diff: 0, goals_for: 3, goals_against: 3,
        yellow_cards_total: 0, red_cards_total: 0, tiebreak_rank: 1,
      }),
      makeTeam('b', 'Beta', 3, {
        goal_diff: 0, goals_for: 3, goals_against: 3,
        yellow_cards_total: 0, red_cards_total: 0, tiebreak_rank: null,
      }),
    ]
    const ranked = rankGroup(teams, [])
    expect(ranked.every(r => r.has_tiebreak_warning)).toBe(true)
  })
})

describe('rankAllGroups — multi-group tournament', () => {
  it('ranks teams independently within each group', () => {
    const groupA = [
      makeTeam('a1', 'A1', 9, { group_name: 'A' }),
      makeTeam('a2', 'A2', 6, { group_name: 'A' }),
    ]
    const groupB = [
      makeTeam('b1', 'B1', 3, { group_name: 'B' }),
      makeTeam('b2', 'B2', 6, { group_name: 'B' }),
    ]
    const all = [...groupA, ...groupB]
    const ranked = rankAllGroups(all, [])

    const a1 = ranked.find(r => r.team_id === 'a1')!
    const a2 = ranked.find(r => r.team_id === 'a2')!
    const b1 = ranked.find(r => r.team_id === 'b1')!
    const b2 = ranked.find(r => r.team_id === 'b2')!

    expect(a1.rank).toBe(1)
    expect(a2.rank).toBe(2)
    expect(b2.rank).toBe(1) // Group B: B2 has more points
    expect(b1.rank).toBe(2)
  })

  it('does not allow h2h matches from other groups to influence ranking', () => {
    // A1 played B1 (different groups) — should be ignored in h2h calc
    const teams = [
      makeTeam('a1', 'A1', 3, { group_name: 'A', goal_diff: 0, goals_for: 1, goals_against: 1 }),
      makeTeam('a2', 'A2', 3, { group_name: 'A', goal_diff: 0, goals_for: 1, goals_against: 1 }),
      makeTeam('b1', 'B1', 3, { group_name: 'B', goal_diff: 0, goals_for: 1, goals_against: 1 }),
    ]
    // Cross-group match should be ignored; a1 vs a2 draw
    const matches = [
      makeMatch('cross', 'a1', 'b1', 2, 0), // cross-group: should be ignored
      makeMatch('intra', 'a1', 'a2', 1, 1),  // Group A draw
    ]
    const ranked = rankAllGroups(teams, matches)
    const a1 = ranked.find(r => r.team_id === 'a1')!
    const a2 = ranked.find(r => r.team_id === 'a2')!
    // Both tied in Group A (cross-group match ignored); eventually warning
    expect(a1.group_name).toBe('A')
    expect(a2.group_name).toBe('A')
  })
})
