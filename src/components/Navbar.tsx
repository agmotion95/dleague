'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

interface NavbarProps {
  sport?: 'futsal' | 'badminton'
}

const futsalSections = [
  { href: '/futsal', label: 'Overview' },
  { href: '/futsal/standings', label: 'Standings' },
  { href: '/futsal/fixtures', label: 'Fixtures' },
  { href: '/futsal/results', label: 'Results' },
  { href: '/futsal/scorers', label: 'Top Scorers' },
  { href: '/futsal/cards', label: 'Cards' },
]

const badmintonSections = [
  { href: '/badminton', label: 'Overview' },
  { href: '/badminton/bracket', label: 'Bracket' },
  { href: '/badminton/fixtures', label: 'Fixtures' },
  { href: '/badminton/results', label: 'Results' },
]

export default function Navbar({ sport }: NavbarProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const sections = sport === 'futsal' ? futsalSections : sport === 'badminton' ? badmintonSections : []

  return (
    <header className="sticky top-0 z-50">
      {/* Bar 1 — Global nav */}
      <div
        style={{
          background: '#0a0a0a',
          borderBottom: '1px solid #222',
          height: 52,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Wordmark */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{
            fontFamily: 'var(--font-barlow), sans-serif',
            fontSize: 20,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Sports Day
          </span>
          <span style={{
            fontFamily: 'var(--font-barlow), sans-serif',
            fontSize: 10,
            fontWeight: 700,
            color: '#CC0000',
            border: '1px solid #CC0000',
            padding: '2px 6px',
            borderRadius: 2,
            letterSpacing: '0.08em',
            verticalAlign: 'middle',
          }}>
            2026
          </span>
        </Link>

        {/* Sport tabs (desktop) */}
        <nav aria-label="Sport switcher" style={{ display: 'flex', alignItems: 'center', gap: 24 }} className="hidden sm:flex">
          {[
            { href: '/futsal', label: 'FUTSAL' },
            { href: '/badminton', label: 'BADMINTON' },
          ].map(({ href, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                style={{
                  fontFamily: 'var(--font-barlow), sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: active ? '#fff' : '#555',
                  borderBottom: active ? '2px solid #CC0000' : '2px solid transparent',
                  paddingBottom: 2,
                  textDecoration: 'none',
                  transition: 'color 0.15s',
                }}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Mobile toggle */}
        <button
          className="sm:hidden"
          style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen
            ? <X style={{ width: 20, height: 20, color: '#999' }} />
            : <Menu style={{ width: 20, height: 20, color: '#999' }} />}
        </button>
      </div>

      {/* Bar 2 — Section sub-nav (desktop only, shown inside a sport) */}
      {sport && (
        <div
          className="hidden sm:block"
          style={{
            background: '#111',
            borderBottom: '1px solid #222',
            height: 40,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            padding: '0 24px',
          }}
        >
          {sections.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                style={{
                  fontFamily: 'var(--font-barlow), sans-serif',
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: active ? '#fff' : '#555',
                  padding: '0 16px',
                  height: 40,
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderBottom: active ? '2px solid #CC0000' : '2px solid transparent',
                  textDecoration: 'none',
                  transition: 'color 0.15s',
                }}
              >
                {label}
              </Link>
            )
          })}
        </div>
      )}

      {/* Mobile menu */}
      {menuOpen && (
        <nav
          aria-label="Mobile navigation"
          style={{ background: '#111', borderBottom: '1px solid #222', padding: '12px 16px' }}
          className="sm:hidden flex flex-col gap-1"
        >
          {/* Sport switcher */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {[
              { href: '/futsal', label: 'FUTSAL' },
              { href: '/badminton', label: 'BADMINTON' },
            ].map(({ href, label }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 0',
                    fontFamily: 'var(--font-barlow), sans-serif',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    background: active ? '#CC0000' : '#1a1a1a',
                    color: active ? '#fff' : '#555',
                    borderRadius: 2,
                    textDecoration: 'none',
                  }}
                >
                  {label}
                </Link>
              )
            })}
          </div>
          {/* Section links */}
          {sections.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                style={{
                  padding: '10px 12px',
                  fontFamily: 'var(--font-barlow), sans-serif',
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: active ? '#fff' : '#555',
                  background: active ? '#1a1a1a' : 'transparent',
                  borderRadius: 2,
                  textDecoration: 'none',
                  borderLeft: active ? '3px solid #CC0000' : '3px solid transparent',
                }}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      )}
    </header>
  )
}
