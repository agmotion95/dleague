import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'

const NEPAL_TIMEZONE = 'Asia/Kathmandu'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined, fmt = 'MMM d, yyyy') {
  if (!date) return 'TBD'
  return formatInTimeZone(new Date(date), NEPAL_TIMEZONE, fmt)
}

export function formatDateTime(date: string | null | undefined) {
  if (!date) return 'TBD'
  return formatInTimeZone(new Date(date), NEPAL_TIMEZONE, 'MMM d, yyyy · HH:mm')
}

export function formatTime(date: string | null | undefined) {
  if (!date) return 'TBD'
  return formatInTimeZone(new Date(date), NEPAL_TIMEZONE, 'HH:mm')
}

export function timeAgo(date: string | null | undefined) {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function getSportColor(sport: string) {
  return sport === 'futsal' ? 'futsal' : 'badminton'
}

export function getSportEmoji(sport: string) {
  return sport === 'futsal' ? '⚽' : '🏸'
}

export function getEventTypeLabel(type: string) {
  switch (type) {
    case 'goal': return '⚽ Goal'
    case 'yellow_card': return '🟨 Yellow Card'
    case 'red_card': return '🟥 Red Card'
    case 'assist': return '🎯 Assist'
    default: return type
  }
}
