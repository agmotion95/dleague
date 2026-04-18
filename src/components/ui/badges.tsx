import { cn } from '@/lib/utils'
import { MatchStatus } from '@/lib/supabase/database.types'

interface StatusBadgeProps {
  status: MatchStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (status === 'live') {
    return (
      <span className={cn('live-badge', className)}>
        <span className="live-dot" />
        LIVE
      </span>
    )
  }
  if (status === 'completed') {
    return (
      <span
        className={cn('inline-flex items-center', className)}
        style={{
          fontFamily: 'var(--font-barlow), sans-serif',
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          background: '#CC0000',
          color: '#fff',
          padding: '3px 8px',
          borderRadius: 2,
        }}
      >
        FT
      </span>
    )
  }
  return (
    <span
      className={cn('inline-flex items-center', className)}
      style={{
        fontFamily: 'var(--font-barlow), sans-serif',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        background: '#1a1a1a',
        color: '#555',
        padding: '3px 8px',
        borderRadius: 2,
        border: '1px solid #222',
      }}
    >
      Soon
    </span>
  )
}

interface SportBadgeProps {
  sport: string
  className?: string
}

export function SportBadge({ sport, className }: SportBadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center', className)}
      style={{
        fontFamily: 'var(--font-barlow), sans-serif',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: '#CC0000',
      }}
    >
      {sport === 'futsal' ? 'FUTSAL' : 'BADMINTON'}
    </span>
  )
}

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('glass-card p-5', className)}>
      {children}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('glass-card p-5 space-y-3', className)}>
      <div className="h-4 shimmer w-2/3" style={{ borderRadius: 2 }} />
      <div className="h-3 shimmer w-1/2" style={{ borderRadius: 2 }} />
      <div className="h-3 shimmer w-3/4" style={{ borderRadius: 2 }} />
    </div>
  )
}
