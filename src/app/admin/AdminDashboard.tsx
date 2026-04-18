'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Match, Tournament, Team, Player, MatchEvent, EventType } from '@/lib/supabase/database.types'
import type { RankedStanding, StandingRow, MatchForTiebreaker } from '@/lib/standings'
import { rankAllGroups } from '@/lib/standings'
import { StatusBadge, SportBadge } from '@/components/ui/badges'
import { formatDateTime, getEventTypeLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { LogOut, RefreshCw, PlusCircle, Trash2, Trophy, AlertTriangle, Users, Zap } from 'lucide-react'
import Link from 'next/link'

function computeWinnerId(match: Match): string | null {
  if (match.status !== 'completed') return null
  if (match.score1 != null && match.score2 != null) {
    if (match.score1 > match.score2) return match.team1_id ?? null
    if (match.score2 > match.score1) return match.team2_id ?? null
  }
  return null
}

interface AdminDashboardProps {
  initialMatches: Match[]
  tournaments: Tournament[]
  teams: Team[]
  players: Player[]
  userEmail: string
  tiebreakerWarnings: RankedStanding[]
  futsalTournamentId: string
}

type ExtendedPlayer = Player & { team?: { name: string } | null }
type ActiveTab = 'matches' | 'teams'

export default function AdminDashboard({
  initialMatches,
  tournaments,
  teams: initialTeams,
  players: initialPlayers,
  userEmail,
  tiebreakerWarnings: initialWarnings,
  futsalTournamentId,
}: AdminDashboardProps) {
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [filterTournament, setFilterTournament] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [saving, setSaving] = useState(false)
  const [byeLoading, setByeLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [newEvent, setNewEvent] = useState<Partial<MatchEvent>>({ event_type: 'goal', minute: undefined })
  const [newEventErrors, setNewEventErrors] = useState<string[]>([])
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [statusChangeWarning, setStatusChangeWarning] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('matches')
  const [tiebreakerWarnings] = useState<RankedStanding[]>(initialWarnings)
  const [teamTiebreakerEdits, setTeamTiebreakerEdits] = useState<Record<string, string>>({})
  const [savingTiebreaker, setSavingTiebreaker] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const players = initialPlayers as ExtendedPlayer[]

  const validateNewEvent = (ev: Partial<MatchEvent>): string[] => {
    const errors: string[] = []
    if (!ev.event_type) errors.push('Event type is required.')
    if (!ev.team_id) errors.push('Team is required.')
    if (ev.event_type === 'goal' && !ev.player_id) errors.push('Scorer is required for goals.')
    if (ev.event_type === 'assist' && !ev.player_id) errors.push('Player is required for assists.')
    if (ev.minute !== undefined && ev.minute !== null) {
      if (ev.minute < 1 || ev.minute > 120) errors.push('Minute must be between 1 and 120.')
    }
    return errors
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const refreshMatches = useCallback(async () => {
    const { data } = await supabase
      .from('matches')
      .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), winner:teams!matches_winner_id_fkey(*), tournament:tournaments(*)`)
      .order('scheduled_at', { ascending: true })
    if (data) setMatches(data as Match[])
  }, [supabase])

  const openEdit = async (match: Match) => {
    setEditingMatch({ ...match })
    const { data } = await supabase
      .from('match_events')
      .select(`*, player:players(*), team:teams(*)`)
      .eq('match_id', match.id)
      .order('minute', { ascending: true })
    setEvents((data ?? []) as MatchEvent[])
  }

  const autoFillFutsalFinal = async (tournamentId: string) => {
    const [{ data: standings }, { data: allGroupMatches }, { data: finalMatch }] = await Promise.all([
      supabase.from('standings').select('*').eq('tournament_id', tournamentId),
      supabase
        .from('matches')
        .select('id, team1_id, team2_id, score1, score2, winner_id, status, stage')
        .eq('tournament_id', tournamentId)
        .ilike('stage', 'group%'),
      supabase
        .from('matches')
        .select('id, team1_id, team2_id')
        .eq('tournament_id', tournamentId)
        .ilike('stage', 'final')
        .is('team1_id', null)
        .maybeSingle(),
    ])

    if (!finalMatch || !standings || standings.length === 0) return
    if (!allGroupMatches || allGroupMatches.length === 0) return

    const allGroupMatchesDone = allGroupMatches.every(m => m.status === 'completed')
    if (!allGroupMatchesDone) return

    const completedMatches = allGroupMatches.filter(m => m.status === 'completed')
    const ranked = rankAllGroups(
      standings as StandingRow[],
      completedMatches as MatchForTiebreaker[]
    )
    const top2 = ranked
      .filter(s => s.rank <= 2)
      .sort((a, b) => a.rank - b.rank)

    if (top2.length < 2) return

    await supabase
      .from('matches')
      .update({ team1_id: top2[0].team_id, team2_id: top2[1].team_id })
      .eq('id', finalMatch.id)
  }

  const saveMatch = async (newStatus?: Match['status'], force = false) => {
    if (!editingMatch) return
    
    // Determine the status to save
    const statusToSave = newStatus ?? editingMatch.status

    if (
      !force &&
      statusToSave === 'completed' &&
      (editingMatch.score1 ?? 0) === 0 &&
      (editingMatch.score2 ?? 0) === 0
    ) {
      setStatusChangeWarning('Score is 0–0. Are you sure this match is complete?')
      return
    }
    
    setStatusChangeWarning(null)
    setSaving(true)
    
    // If status changed, update local state so computeWinnerId works correctly
    const matchToSave = { ...editingMatch, status: statusToSave }
    const winner_id = computeWinnerId(matchToSave)
    
    const { error } = await supabase
      .from('matches')
      .update({
        score1: editingMatch.score1,
        score2: editingMatch.score2,
        status: statusToSave,
        winner_id,
      })
      .eq('id', editingMatch.id)
      
    setSaving(false)
    if (error) { 
      showMessage('error', error.message) 
    } else {
      setEditingMatch(prev => prev ? { ...prev, status: statusToSave, winner_id } : null)
      showMessage('success', statusToSave === 'completed' ? 'Match completed!' : 'Match updated!')
      if (editingMatch.tournament_id === futsalTournamentId) {
        await autoFillFutsalFinal(futsalTournamentId)
      }
      await refreshMatches()
    }
  }

  const resetMatch = async () => {
    if (!editingMatch) return
    if (!window.confirm('This will delete all match events and reset the score and status to zero/scheduled. Continue?')) return
    
    setSaving(true)
    // 1. Delete events
    await supabase.from('match_events').delete().eq('match_id', editingMatch.id)
    
    // 2. Reset match record
    const { error } = await supabase.from('matches').update({
      score1: 0,
      score2: 0,
      status: 'scheduled',
      winner_id: null,
    }).eq('id', editingMatch.id)
    
    setSaving(false)
    
    if (error) {
      showMessage('error', error.message)
    } else {
      setEditingMatch(prev => prev ? { ...prev, score1: 0, score2: 0, status: 'scheduled', winner_id: null } : null)
      setEvents([])
      showMessage('success', 'Match has been reset')
      if (editingMatch.tournament_id === futsalTournamentId) {
        await autoFillFutsalFinal(futsalTournamentId)
      }
      await refreshMatches()
    }
  }

  const applyBye = async (teamId: string) => {
    if (!editingMatch) return
    if (!window.confirm('This will clear all events and set a 3-0 bye result. Continue?')) return
    setByeLoading(true)
    await supabase.from('match_events').delete().eq('match_id', editingMatch.id)
    const isTeam1 = teamId === editingMatch.team1_id
    const score1 = isTeam1 ? 3 : 0
    const score2 = isTeam1 ? 0 : 3
    const { error } = await supabase.from('matches').update({
      score1,
      score2,
      status: 'completed',
      winner_id: teamId,
    }).eq('id', editingMatch.id)
    setByeLoading(false)
    if (error) {
      showMessage('error', error.message)
    } else {
      setEditingMatch(prev => prev ? { ...prev, score1, score2, status: 'completed', winner_id: teamId } : null)
      setEvents([])
      setMatches(prev => prev.map(m => m.id === editingMatch.id ? { ...m, score1, score2, status: 'completed', winner_id: teamId } : m))
      showMessage('success', `Bye awarded — ${isTeam1 ? editingMatch.team1?.name : editingMatch.team2?.name} wins 3-0`)
      if (editingMatch.tournament_id === futsalTournamentId) {
        await autoFillFutsalFinal(futsalTournamentId)
        await refreshMatches()
      }
    }
  }

  const addEvent = async () => {
    if (!editingMatch) return
    const errors = validateNewEvent(newEvent)
    if (errors.length > 0) {
      setNewEventErrors(errors)
      return
    }
    setNewEventErrors([])

    const { error } = await supabase.from('match_events').insert({
      match_id: editingMatch.id,
      player_id: newEvent.player_id ?? null,
      team_id: newEvent.team_id ?? null,
      event_type: newEvent.event_type as EventType,
      minute: newEvent.minute ?? null,
      notes: newEvent.notes ?? null,
    })

    if (error) {
      showMessage('error', error.message)
    } else {
      const statusUpdate = editingMatch.status === 'scheduled' ? { status: 'live' as const } : {}
      
      if (newEvent.event_type === 'goal' && newEvent.team_id) {
        const isTeam1 = newEvent.team_id === editingMatch.team1_id
        const newScore1 = (editingMatch.score1 ?? 0) + (isTeam1 ? 1 : 0)
        const evIsTeam2 = newEvent.team_id === editingMatch.team2_id
        const newScore2 = (editingMatch.score2 ?? 0) + (evIsTeam2 ? 1 : 0)

        await supabase.from('matches').update({
          score1: newScore1,
          score2: newScore2,
          ...statusUpdate
        }).eq('id', editingMatch.id)

        setEditingMatch(prev => prev ? { 
          ...prev, 
          score1: newScore1, 
          score2: newScore2,
          ...(statusUpdate.status ? { status: statusUpdate.status } : {}) 
        } : null)
        setMatches(prev => prev.map(m => m.id === editingMatch.id ? { 
          ...m, 
          score1: newScore1, 
          score2: newScore2,
          ...(statusUpdate.status ? { status: statusUpdate.status } : {}) 
        } : m))
      } else if (statusUpdate.status) {
        // Just status update for non-goal events (e.g. cards)
        await supabase.from('matches').update({
          ...statusUpdate
        }).eq('id', editingMatch.id)
        
        setEditingMatch(prev => prev ? { 
          ...prev, 
          status: statusUpdate.status 
        } : null)
        setMatches(prev => prev.map(m => m.id === editingMatch.id ? { 
          ...m, 
          status: statusUpdate.status as Match['status']
        } : m))
      }

      const { data } = await supabase
        .from('match_events').select(`*, player:players(*), team:teams(*)`)
        .eq('match_id', editingMatch.id).order('minute', { ascending: true })
      setEvents((data ?? []) as MatchEvent[])
      // Preserve team for quick back-to-back entry; clear player and minute only
      setNewEvent(prev => ({ event_type: prev.event_type ?? 'goal', team_id: prev.team_id, minute: undefined }))
      showMessage('success', 'Event added!')
    }
  }

  const confirmDeleteEvent = async (eventId: string) => {
    setPendingDeleteId(null)
    const ev = events.find(e => e.id === eventId)
    await supabase.from('match_events').delete().eq('id', eventId)

    if (ev && ev.event_type === 'goal' && ev.team_id && editingMatch) {
      const isTeam1 = ev.team_id === editingMatch.team1_id
      const evIsTeam2 = ev.team_id === editingMatch.team2_id
      const newScore1 = Math.max(0, (editingMatch.score1 ?? 0) - (isTeam1 ? 1 : 0))
      const newScore2 = Math.max(0, (editingMatch.score2 ?? 0) - (evIsTeam2 ? 1 : 0))

      const statusUpdate = editingMatch.status === 'scheduled' ? { status: 'live' as const } : {}

      await supabase.from('matches').update({
        score1: newScore1,
        score2: newScore2,
        ...statusUpdate
      }).eq('id', editingMatch.id)

      setEditingMatch(prev => prev ? { 
        ...prev, 
        score1: newScore1, 
        score2: newScore2,
        ...(statusUpdate.status ? { status: statusUpdate.status } : {}) 
      } : null)
      setMatches(prev => prev.map(m => m.id === editingMatch.id ? { 
        ...m, 
        score1: newScore1, 
        score2: newScore2,
        ...(statusUpdate.status ? { status: statusUpdate.status } : {}) 
      } : m))
    }

    setEvents(prev => prev.filter(e => e.id !== eventId))
  }

  const saveTiebreakerRank = async (teamId: string) => {
    const raw = teamTiebreakerEdits[teamId]
    const rank = raw === '' || raw === undefined ? null : parseInt(raw, 10)

    if (rank !== null && (isNaN(rank) || rank < 1)) {
      showMessage('error', 'Tiebreak rank must be a positive integer')
      return
    }

    setSavingTiebreaker(teamId)
    const { error } = await supabase
      .from('teams')
      .update({ tiebreak_rank: rank })
      .eq('id', teamId)
    setSavingTiebreaker(null)

    if (error) {
      showMessage('error', error.message)
    } else {
      showMessage('success', 'Tiebreak rank saved!')
      setTeams(prev =>
        prev.map(t => t.id === teamId ? { ...t, tiebreak_rank: rank } : t)
      )
      setTeamTiebreakerEdits(prev => {
        const next = { ...prev }
        delete next[teamId]
        return next
      })
    }
  }

  const resetAllData = async () => {
    if (!window.confirm('WARNING: This will delete ALL match events and reset ALL scores and statuses to 0/scheduled across every tournament. This cannot be undone. Are you sure?')) return
    if (!window.confirm('Last chance — are you absolutely sure you want to reset the entire database?')) return

    setSaving(true)
    await supabase.from('match_events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error } = await supabase.from('matches').update({
      score1: 0,
      score2: 0,
      status: 'scheduled',
      winner_id: null,
    }).neq('id', '00000000-0000-0000-0000-000000000000')
    setSaving(false)

    if (error) {
      showMessage('error', error.message)
    } else {
      showMessage('success', 'All scores and events have been reset')
      await refreshMatches()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const filteredMatches = matches.filter(m => {
    if (filterTournament !== 'all' && m.tournament_id !== filterTournament) return false
    if (filterStatus !== 'all' && m.status !== filterStatus) return false
    return true
  })

  const matchTeams = editingMatch
    ? teams.filter(t => t.id === editingMatch.team1_id || t.id === editingMatch.team2_id)
    : []

  const isFutsal = editingMatch && (editingMatch.tournament as { sport: string })?.sport !== 'badminton'

  // Players for the current match, filtered by selected team when one is chosen
  const matchPlayers = players.filter(p => matchTeams.some(t => t.id === p.team_id))
  const filteredPlayers = newEvent.team_id
    ? matchPlayers.filter(p => p.team_id === newEvent.team_id)
    : matchPlayers

  const playerLabel: Record<string, string> = {
    goal: 'Scorer *',
    assist: 'Assisting Player *',
    yellow_card: 'Player Receiving Card',
    red_card: 'Player Receiving Card',
  }

  const futsalTeams = teams.filter(t => t.tournament_id === futsalTournamentId)
  const warnedTeamIds = new Set(tiebreakerWarnings.map(w => w.team_id))

  return (
    <div className="min-h-screen bg-background">
      {/* Admin header */}
      <header className="glass border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="font-display font-bold text-foreground hidden sm:block">Sports Day</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-sm text-foreground">Admin Panel</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">{userEmail}</span>
            <button onClick={refreshMatches} className="btn-secondary !py-1.5 !px-3" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} id="admin-logout-btn" className="btn-secondary !py-1.5 !px-3 gap-1.5">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast */}
      {message && (
        <div className={cn(
          'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-slide-up',
          message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
        )}>
          {message.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {editingMatch ? (
          /* ---- MATCH EDIT PANEL ---- */
          <div className="space-y-6">
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => {
                setEditingMatch(null)
                setNewEvent({ event_type: 'goal', minute: undefined })
                setNewEventErrors([])
                setPendingDeleteId(null)
                setStatusChangeWarning(null)
              }} className="btn-secondary !py-1.5">← Back</button>
              <button onClick={() => openEdit(editingMatch)} className="btn-secondary !py-1.5 !px-3" title="Refresh match data">
                <RefreshCw className="w-4 h-4" />
              </button>
              <div>
                <h2 className="font-display font-bold text-xl">
                  {editingMatch.team1?.name ?? 'TBD'} vs {editingMatch.team2?.name ?? 'TBD'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(editingMatch.tournament as { name: string })?.name} · {formatDateTime(editingMatch.scheduled_at)}
                  {editingMatch.stage ? ` · ${editingMatch.stage}` : ''}
                </p>
              </div>
            </div>

            {isFutsal ? (
              /* ---- FUTSAL: events-driven ---- */
              <div className="grid md:grid-cols-2 gap-6">
                {/* Status + score display + save */}
                <div className="glass-card p-5 space-y-4">
                  <h3 className="font-semibold text-foreground">Match Status</h3>

                  {/* Read-only score derived from events */}
                  <p className="text-xs text-muted-foreground -mt-1">Score calculated from events below</p>
                  <div className="flex items-center justify-center gap-4 py-3 rounded-lg bg-secondary/40">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">{editingMatch.team1?.name ?? 'Team 1'}</div>
                      <div className="font-display font-black text-3xl text-foreground">{editingMatch.score1 ?? 0}</div>
                    </div>
                    <span className="text-muted-foreground font-display font-bold text-xl">–</span>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">{editingMatch.team2?.name ?? 'Team 2'}</div>
                      <div className="font-display font-black text-3xl text-foreground">{editingMatch.score2 ?? 0}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => saveMatch('live')}
                        disabled={saving}
                        className={cn(
                          "flex-1 !py-2.5 justify-center gap-2",
                          editingMatch.status === 'scheduled' ? "btn-success" : "btn-secondary"
                        )}
                      >
                        <Zap className="w-4 h-4" />
                        {editingMatch.status === 'scheduled' ? 'Start Match' : 'Update Score'}
                      </button>
                      <button 
                        onClick={() => saveMatch('completed')}
                        disabled={saving || editingMatch.status === 'scheduled'}
                        className="flex-1 btn-primary !py-2.5 justify-center gap-2 disabled:opacity-30"
                      >
                        <Trophy className="w-4 h-4" />
                        Complete
                      </button>
                    </div>

                    {statusChangeWarning && (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p>{statusChangeWarning}</p>
                          <div className="flex gap-2 mt-1.5">
                            <button onClick={() => saveMatch('completed', true)} className="text-xs font-semibold underline">Yes, complete it</button>
                            <button onClick={() => setStatusChangeWarning(null)} className="text-xs text-yellow-400/70 underline">Cancel</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {editingMatch.status === 'completed' && (
                      <button 
                        onClick={() => saveMatch('live')} 
                        className="w-full text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                      >
                        Re-open match for corrections
                      </button>
                    )}
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={resetMatch} 
                      disabled={saving} 
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reset Match
                    </button>
                  </div>

                  {/* Bye action */}
                  <div className="border-t border-border pt-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Zap className="w-3.5 h-3.5" />Award Bye (3-0)
                    </div>
                    <div className="flex gap-2">
                      {matchTeams.map(t => (
                        <button
                          key={t.id}
                          onClick={() => applyBye(t.id)}
                          disabled={byeLoading}
                          className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-xs font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                          {t.name} wins
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Match events */}
                <div className="glass-card p-5 space-y-4">
                  <h3 className="font-semibold text-foreground">Match Events</h3>

                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {events.length === 0 && (
                      <div className="text-xs text-muted-foreground py-4 text-center">No events yet</div>
                    )}
                    {events.map(ev => (
                      <div key={ev.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-secondary/50 text-sm">
                        <span className="text-xs w-8 text-center text-muted-foreground">{ev.minute ?? '–'}&apos;</span>
                        <span className="flex-1 font-medium">{getEventTypeLabel(ev.event_type)}</span>
                        <span className="text-muted-foreground text-xs truncate max-w-[80px]">{ev.player?.name ?? ev.team?.name}</span>
                        {pendingDeleteId === ev.id ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs text-red-400">Delete?</span>
                            <button onClick={() => confirmDeleteEvent(ev.id)} className="text-xs text-red-400 font-semibold hover:text-red-300 px-1">Yes</button>
                            <button onClick={() => setPendingDeleteId(null)} className="text-xs text-muted-foreground hover:text-foreground px-1">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setPendingDeleteId(ev.id)} className="p-1 text-red-400 hover:text-red-300 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border pt-4 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add Event</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Type</label>
                        <select value={newEvent.event_type}
                          onChange={e => {
                            setNewEventErrors([])
                            setNewEvent(prev => ({ ...prev, event_type: e.target.value as EventType }))
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring mt-1"
                        >
                          <option value="goal">⚽ Goal</option>
                          <option value="yellow_card">🟨 Yellow Card</option>
                          <option value="red_card">🟥 Red Card</option>
                          <option value="assist">🎯 Assist</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Minute (1–120)</label>
                        <input type="number" min={1} max={120} value={newEvent.minute ?? ''}
                          onChange={e => {
                            setNewEventErrors([])
                            setNewEvent(prev => ({ ...prev, minute: +e.target.value || undefined }))
                          }}
                          placeholder="e.g. 23"
                          className={cn(
                            'w-full px-2 py-1.5 rounded-lg bg-secondary border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring mt-1',
                            newEvent.minute != null && (newEvent.minute < 1 || newEvent.minute > 120)
                              ? 'border-red-500/60'
                              : 'border-border'
                          )}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Team *</label>
                      <select value={newEvent.team_id ?? ''}
                        onChange={e => {
                          setNewEventErrors([])
                          const teamId = e.target.value || undefined
                          setNewEvent(prev => ({
                            ...prev,
                            team_id: teamId,
                            // Clear player if they don't belong to the newly selected team
                            player_id: teamId && prev.player_id
                              ? (players.find(p => p.id === prev.player_id)?.team_id === teamId ? prev.player_id : undefined)
                              : prev.player_id,
                          }))
                        }}
                        className={cn(
                          'w-full px-2 py-1.5 rounded-lg bg-secondary border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring mt-1',
                          newEventErrors.some(e => e.includes('Team')) ? 'border-red-500/60' : 'border-border'
                        )}
                      >
                        <option value="">Select team...</option>
                        {matchTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">
                        {playerLabel[newEvent.event_type ?? 'goal'] ?? 'Player'}
                      </label>
                      <select value={newEvent.player_id ?? ''}
                        onChange={e => {
                          setNewEventErrors([])
                          const p = players.find(pl => pl.id === e.target.value)
                          setNewEvent(prev => ({
                            ...prev,
                            player_id: e.target.value || undefined,
                            team_id: p?.team_id ?? prev.team_id,
                          }))
                        }}
                        className={cn(
                          'w-full px-2 py-1.5 rounded-lg bg-secondary border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring mt-1',
                          newEventErrors.some(e => e.includes('Scorer') || e.includes('Player')) ? 'border-red-500/60' : 'border-border'
                        )}
                      >
                        <option value="">
                          {filteredPlayers.length === 0 && newEvent.team_id
                            ? 'No players for this team'
                            : 'Select player...'}
                        </option>
                        {newEvent.team_id
                          ? filteredPlayers.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name}
                              </option>
                            ))
                          : matchTeams.map(t => (
                              <optgroup key={t.id} label={t.name}>
                                {matchPlayers.filter(p => p.team_id === t.id).map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.jersey_number ? `#${p.jersey_number} ` : ''}{p.name}
                                  </option>
                                ))}
                              </optgroup>
                            ))
                        }
                      </select>
                    </div>

                    {newEventErrors.length > 0 && (
                      <ul className="space-y-0.5">
                        {newEventErrors.map((err, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-xs text-red-400">
                            <AlertTriangle className="w-3 h-3 shrink-0" />{err}
                          </li>
                        ))}
                      </ul>
                    )}

                    <button
                      onClick={addEvent}
                      disabled={!!newEventErrors.length}
                      title={newEventErrors.length ? newEventErrors.join(' ') : undefined}
                      className="btn-primary w-full justify-center !py-1.5 text-xs gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />Add Event
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ---- BADMINTON: score + status only ---- */
              <div className="max-w-sm">
                <div className="glass-card p-5 space-y-4">
                  <h3 className="font-semibold text-foreground">Score & Status</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">{editingMatch.team1?.name ?? 'Team 1'}</label>
                      <input type="number" min={0} value={editingMatch.score1 ?? 0}
                        onChange={e => setEditingMatch(prev => prev ? { ...prev, score1: +e.target.value } : null)}
                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-center font-display font-bold text-xl focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <span className="text-muted-foreground font-display font-bold text-xl mt-5">–</span>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">{editingMatch.team2?.name ?? 'Team 2'}</label>
                      <input type="number" min={0} value={editingMatch.score2 ?? 0}
                        onChange={e => setEditingMatch(prev => prev ? { ...prev, score2: +e.target.value } : null)}
                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-center font-display font-bold text-xl focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => saveMatch('live')}
                        disabled={saving}
                        className={cn(
                          "flex-1 !py-2.5 justify-center gap-2",
                          editingMatch.status === 'scheduled' ? "btn-success" : "btn-secondary"
                        )}
                      >
                        <Zap className="w-4 h-4" />
                        {editingMatch.status === 'scheduled' ? 'Start Match' : 'Update Score'}
                      </button>
                      <button 
                        onClick={() => saveMatch('completed')}
                        disabled={saving || editingMatch.status === 'scheduled'}
                        className="flex-1 btn-primary !py-2.5 justify-center gap-2 disabled:opacity-30"
                      >
                        <Trophy className="w-4 h-4" />
                        Complete
                      </button>
                    </div>

                    {statusChangeWarning && (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p>{statusChangeWarning}</p>
                          <div className="flex gap-2 mt-1.5">
                            <button onClick={() => saveMatch('completed', true)} className="text-xs font-semibold underline">Yes, complete it</button>
                            <button onClick={() => setStatusChangeWarning(null)} className="text-xs text-yellow-400/70 underline">Cancel</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {editingMatch.status === 'completed' && (
                      <button 
                        onClick={() => saveMatch('live')} 
                        className="w-full text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                      >
                        Re-open match for corrections
                      </button>
                    )}
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={resetMatch} 
                      disabled={saving} 
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reset Match
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ---- MAIN DASHBOARD ---- */
          <div className="space-y-6">
            {/* Tiebreaker warning banner */}
            {tiebreakerWarnings.length > 0 && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-yellow-400 mb-1">
                    Unresolved ties require tiebreak rank — Rule 7
                  </p>
                  <p className="text-yellow-400/80 text-xs mb-2">
                    The following teams are equally ranked after all 6 tiebreaker rules. Set a{' '}
                    <code className="bg-yellow-500/20 px-1 rounded">tiebreak_rank</code> for each in the Teams tab.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tiebreakerWarnings.map(w => (
                      <span key={w.team_id} className="text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-2 py-0.5 rounded-full">
                        {w.team_name}
                        {w.tied_with_names.length > 0 && (
                          <span className="opacity-70"> vs {w.tied_with_names.join(', ')}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-border">
              <button
                onClick={() => setActiveTab('matches')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                  activeTab === 'matches'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                Matches
              </button>
              <button
                onClick={() => setActiveTab('teams')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5',
                  activeTab === 'teams'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Users className="w-3.5 h-3.5" />
                Teams
                {tiebreakerWarnings.length > 0 && (
                  <span className="ml-1 w-4 h-4 rounded-full bg-yellow-500 text-black text-xs font-bold flex items-center justify-center">
                    {tiebreakerWarnings.length}
                  </span>
                )}
              </button>
            </div>

            {/* Matches tab */}
            {activeTab === 'matches' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="font-display font-black text-2xl text-foreground">Match Management</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{filteredMatches.length} matches shown</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <select value={filterTournament}
                      onChange={e => setFilterTournament(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="all">All Tournaments</option>
                      {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <select value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="all">All Status</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="live">Live</option>
                      <option value="completed">Completed</option>
                    </select>
                    <button onClick={refreshMatches} className="btn-secondary !py-2 !px-3" title="Refresh">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={resetAllData}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Reset All
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredMatches.length === 0 && (
                    <div className="glass-card p-10 text-center text-muted-foreground">No matches found for selected filters.</div>
                  )}
                  {filteredMatches.map(match => (
                    <div key={match.id}
                      className={cn('glass-card p-4 hover:bg-white/5 transition-colors cursor-pointer',
                        match.status === 'live' && 'ring-1 ring-red-500/30')}
                      onClick={() => openEdit(match)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && openEdit(match)}
                      aria-label={`Edit match ${match.team1?.name} vs ${match.team2?.name}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={match.status} />
                          <SportBadge sport={(match.tournament as { sport: string })?.sport ?? 'futsal'} />
                          {match.stage && <span className="text-xs text-muted-foreground">{match.stage}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(match.scheduled_at)}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn('flex-1 text-right font-semibold text-sm',
                          match.winner_id === match.team1_id ? 'text-foreground' : match.status === 'completed' ? 'text-muted-foreground' : 'text-foreground')}>
                          {match.team1?.name ?? 'TBD'}
                        </span>
                        <div className="glass px-3 py-1 rounded-lg shrink-0">
                          <span className="score-display text-lg">
                            {match.score1 ?? '–'} : {match.score2 ?? '–'}
                          </span>
                        </div>
                        <span className={cn('flex-1 font-semibold text-sm',
                          match.winner_id === match.team2_id ? 'text-foreground' : match.status === 'completed' ? 'text-muted-foreground' : 'text-foreground')}>
                          {match.team2?.name ?? 'TBD'}
                        </span>
                      </div>
                      {match.venue && <div className="text-center text-xs text-muted-foreground mt-2">📍 {match.venue}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teams tab */}
            {activeTab === 'teams' && (
              <div className="space-y-4">
                <div>
                  <h1 className="font-display font-black text-2xl text-foreground">Team Settings</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Set tiebreak ranks for futsal teams. Only used as the final tiebreaker (Rule 7) when all other rules fail.
                  </p>
                </div>

                {futsalTeams.length === 0 && (
                  <div className="glass-card p-10 text-center text-muted-foreground">No futsal teams found.</div>
                )}

                {/* Group teams by group_name */}
                {Array.from(new Set(futsalTeams.map(t => t.group_name))).sort().map(groupName => {
                  const groupTeams = futsalTeams.filter(t => t.group_name === groupName)
                  return (
                    <div key={groupName ?? 'ungrouped'} className="glass-card overflow-hidden">
                      <div className="px-5 py-3 bg-futsal/10 border-b border-border">
                        <h3 className="font-display font-bold text-sm text-futsal uppercase tracking-wider">
                          {groupName ? `Group ${groupName}` : 'Ungrouped Teams'}
                        </h3>
                      </div>
                      <div className="divide-y divide-border">
                        {groupTeams.map(team => {
                          const isWarned = warnedTeamIds.has(team.id)
                          const editValue = teamTiebreakerEdits[team.id]
                          const displayValue = editValue !== undefined
                            ? editValue
                            : (team.tiebreak_rank?.toString() ?? '')

                          return (
                            <div key={team.id} className="px-5 py-3 flex items-center gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground text-sm">{team.name}</span>
                                  {isWarned && (
                                    <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded-full">
                                      <AlertTriangle className="w-3 h-3" />
                                      Needs rank
                                    </span>
                                  )}
                                </div>
                                {isWarned && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Tied with: {tiebreakerWarnings.find(w => w.team_id === team.id)?.tied_with_names.join(', ')}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex flex-col gap-0.5">
                                  <label className="text-xs text-muted-foreground">
                                    Tiebreak rank
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={displayValue}
                                    onChange={e =>
                                      setTeamTiebreakerEdits(prev => ({
                                        ...prev,
                                        [team.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="–"
                                    className={cn(
                                      'w-24 px-2 py-1.5 rounded-lg bg-secondary border text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring',
                                      isWarned ? 'border-yellow-500/50' : 'border-border'
                                    )}
                                    aria-label={`Tiebreak rank for ${team.name}`}
                                  />
                                </div>
                                <button
                                  onClick={() => saveTiebreakerRank(team.id)}
                                  disabled={
                                    savingTiebreaker === team.id ||
                                    editValue === undefined
                                  }
                                  className={cn(
                                    'btn-primary !py-1.5 !px-3 text-xs mt-4',
                                    (savingTiebreaker === team.id || editValue === undefined) && 'opacity-50 cursor-not-allowed'
                                  )}
                                >
                                  {savingTiebreaker === team.id ? '…' : 'Save'}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="px-5 py-2 border-t border-border bg-secondary/30">
                        <p className="text-xs text-muted-foreground">
                          ⚠️ <strong>Only used as Rule 7 fallback</strong> when all other tiebreakers (goal difference, head-to-head, goals scored, fair play) fail to separate teams. Lower number = higher position.
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
