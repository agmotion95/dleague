import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'
import MatchDetailClient from '@/components/MatchDetailClient'
import type { Match, MatchEvent } from '@/lib/supabase/database.types'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: match } = await supabase
    .from('matches')
    .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*)`)
    .eq('id', id)
    .single()
  if (!match) return { title: 'Match' }
  return {
    title: `${(match.team1 as {name:string})?.name ?? 'TBD'} vs ${(match.team2 as {name:string})?.name ?? 'TBD'}`
  }
}

export const dynamic = 'force-dynamic'
export default async function FutsalMatchPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: match } = await supabase
    .from('matches')
    .select(`*, team1:teams!matches_team1_id_fkey(*), team2:teams!matches_team2_id_fkey(*), winner:teams!matches_winner_id_fkey(*)`)
    .eq('id', id)
    .single()

  if (!match) notFound()

  const { data: events } = await supabase
    .from('match_events')
    .select(`*, player:players(*), team:teams(*)`)
    .eq('match_id', id)
    .order('minute', { ascending: true })

  return (
    <div className="min-h-screen">
      <Navbar sport="futsal" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6">
          <Link href="/futsal/results" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Results
          </Link>
        </div>
        <MatchDetailClient
          initialMatch={match as Match}
          initialEvents={(events ?? []) as MatchEvent[]}
        />
      </div>
    </div>
  )
}
