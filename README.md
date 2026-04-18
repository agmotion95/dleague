# Sports Day Tournament Website

Live tournament website for Futsal and Badminton with real-time updates, powered by **Next.js 14**, **Supabase**, and **Tailwind CSS**.

---

## Features

- ⚽ **Futsal**: Group standings, fixtures, results, top scorers, card tally, match detail with event timeline
- 🏸 **Badminton**: Single-elimination bracket (QF Playoffs → QFs → SFs → Final), fixtures, results
- 🔴 **Real-time**: Scores and events update within ~1 second via Supabase subscriptions
- 🔒 **Admin Panel**: Protected by Supabase Auth — edit scores, status, winner, and match events from any device
- 📱 **Mobile-first**: Responsive design built for courtside data entry

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS (custom dark theme) |
| Database | Supabase (PostgreSQL) |
| Real-time | Supabase Realtime (postgres_changes) |
| Auth | Supabase Auth (email/password) |
| Deployment | Vercel |

---

## Setup Guide

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL** and **Anon key** from **Settings → API**

### 2. Run Database Migration

In **Supabase Studio → SQL Editor**, open and run:

```
supabase/migration.sql
```

This creates:
- All tables (`tournaments`, `teams`, `players`, `matches`, `match_events`)
- `standings` VIEW (auto-computed from completed matches)
- Bracket auto-advance trigger
- Row Level Security (public read, authenticated write)
- Realtime enabled on `matches` and `match_events`

### 3. Seed Sample Data

In **Supabase Studio → SQL Editor**, run:

```
supabase/seed.sql
```

This inserts:
- 2 tournaments (Futsal + Badminton)
- 8 futsal teams in 2 groups (Group A & B), 5 players each
- 10 badminton players with full bracket wired up
- Sample match results, goals, and cards

### 4. Create Admin User

In **Supabase Studio → Authentication → Users → Add user**:
- Set an email and password
- This will be your admin login at `/admin`

### 5. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 6. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Pages

### Public
| Route | Description |
|-------|-------------|
| `/` | Home: tournament selector, live ticker, upcoming matches |
| `/futsal` | Futsal overview |
| `/futsal/standings` | Group tables (auto-updated) |
| `/futsal/fixtures` | Upcoming matches |
| `/futsal/results` | Completed matches |
| `/futsal/scorers` | Top goal scorers |
| `/futsal/cards` | Yellow/red card tally |
| `/futsal/match/[id]` | Match detail + event timeline |
| `/badminton` | Badminton overview |
| `/badminton/bracket` | Visual knockout bracket |
| `/badminton/fixtures` | Upcoming matches |
| `/badminton/results` | Completed matches |

### Protected
| Route | Description |
|-------|-------------|
| `/admin` | Match management dashboard |
| `/admin/login` | Admin sign-in |

---

## Real-Time Updates

All public pages subscribe to `matches` and `match_events` tables via Supabase Realtime. To test:

1. Open any public page in your browser
2. Go to **Supabase Studio → Table Editor → matches**
3. Update a score or change status to `live`
4. Watch the page update within ~1 second ✨

---

## Deploy to Vercel

1. Push to GitHub
2. Import to [vercel.com](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

---

## Badminton Bracket Structure

```
QF Playoff 1 ──► Quarterfinal 1 ──► Semifinal 1 ──►
QF Playoff 2 ──► Quarterfinal 2 ──► Semifinal 1 ──► Final
      Seed 3 ──► Quarterfinal 3 ──► Semifinal 2 ──►
      Seed 4 ──► Quarterfinal 4 ──► Semifinal 2 ──►
      Seed 5 ──────── Quarterfinal 3 (already seeded)
      ...
```

10 players → 2 "unlucky" players play off for 2 QF spots. Winners auto-advance via database trigger.

---

## Admin Usage

1. Navigate to `/admin/login`
2. Sign in with your Supabase auth credentials
3. Click any match card to open the edit panel
4. Update scores, status, winner, and add/remove events
5. Changes are saved to Supabase and broadcast to all viewers instantly
