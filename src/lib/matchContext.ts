import type { Match } from '@/lib/supabase/database.types'

function stageLabel(stage: string | null): string {
  if (!stage) return 'next round'
  const s = stage.toLowerCase()
  if (s.includes('semifinal') || s === 'semi') return 'Semifinal'
  if (s.includes('quarterfinal') || s === 'qf') return 'Quarterfinal'
  if (s === 'final') return 'Final'
  if (s.includes('playoff')) return 'Quarterfinal'
  return stage
}

export function getBadmintonMatchContext(match: Match, allMatches: Match[]): string | null {
  const tournament = match.tournament as { sport: string } | null
  if (tournament?.sport !== 'badminton') return null

  const stage = match.stage?.toLowerCase() ?? ''
  const isFinal = stage === 'final'

  const nextMatch = match.next_match_id
    ? allMatches.find(m => m.id === match.next_match_id) ?? null
    : null

  const siblingMatch = nextMatch
    ? allMatches.find(m => m.next_match_id === nextMatch.id && m.id !== match.id) ?? null
    : null

  const nextStage = nextMatch ? stageLabel(nextMatch.stage) : null

  if (match.status === 'completed') {
    const winner = match.winner as { name: string } | null
    const winnerName = winner?.name ?? 'Winner'

    if (isFinal) return `${winnerName} wins the tournament!`
    if (!nextStage) return null

    const siblingWinner = siblingMatch?.winner as { name: string } | null

    if (siblingMatch?.status === 'completed' && siblingWinner) {
      return `${winnerName} advances to the ${nextStage} — set to face ${siblingWinner.name}`
    }

    if (siblingMatch && (siblingMatch.team1_id || siblingMatch.team2_id)) {
      const t1 = (siblingMatch.team1 as { name: string } | null)?.name ?? 'TBD'
      const t2 = (siblingMatch.team2 as { name: string } | null)?.name ?? 'TBD'
      return `${winnerName} advances to the ${nextStage} — will face winner of ${t1} vs ${t2}`
    }

    return `${winnerName} advances to the ${nextStage}`
  }

  // live or scheduled
  if (isFinal) return 'Winner takes the title'
  if (!nextStage) return null

  const siblingWinner = siblingMatch?.winner as { name: string } | null

  if (siblingMatch?.status === 'completed' && siblingWinner) {
    return `Winner advances to the ${nextStage} — set to face ${siblingWinner.name}`
  }

  return `Winner advances to the ${nextStage}`
}
