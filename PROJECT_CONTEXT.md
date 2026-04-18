# Project Context: Sports Day Tournament Platform

## Overview
A real-time tournament management and tracking platform built for "Sports Day". It handles multiple sports, primarily **Futsal** and **Badminton**, providing live updates, standings, brackets, and administrative controls.

## Tech Stack
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Database/Auth**: [Supabase](https://supabase.com/) (PostgreSQL + Real-time)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) + [Lucide React](https://lucide.dev/)
- **Deployment**: [Netlify](https://www.netlify.com/)
- **Data Initialization**: Python scripts for generating SQL seeds from raw tournament data.

## Project Structure
- `src/app/`: Core application routes.
  - `admin/`: Protected admin dashboard for match management and live scoring.
  - `futsal/`: Futsal-specific pages (standings, fixtures, scorers).
  - `badminton/`: Badminton-specific pages (10-player draw logic, brackets).
- `src/components/`: Reusable UI components.
  - `MatchListClient.tsx`: Live-updating match lists.
  - `LiveTicker.tsx`: Real-time score ticker.
  - `BracketClient.tsx`: Visual tournament bracket.
- `src/lib/`: Shared utilities.
  - `supabase/`: Database clients and generated TypeScript types.
- `supabase/`:
  - `seed.sql` / `seed_real_data.sql`: Database initialization and tournament data.
  - `migration.sql`: Schema definitions.
- `generate_seed_v2.py`: Python script used to convert team/player/schedule lists into Supabase-compatible SQL.

## Core Features
1. **Live Scoring**: Admins can update scores and log events (goals, cards) in real-time.
2. **Automated Standings**: Futsal standings are calculated based on match results stored in Supabase.
3. **Badminton Draw**: Custom logic for a 10-player bracket, including preliminary rounds to feed into an 8-player quarterfinal.
4. **Real-time Updates**: Client-side components listen to Supabase broadcast/changes for instant score updates.

## Critical Workflows for Agents
- **Database Updates**: When changing the schema, update `src/lib/supabase/database.types.ts`.
- **Seeding**: Use `generate_seed_v2.py` if new team or schedule info needs to be imported.
- **Admin Access**: Requires Supabase authentication. The login is handled in `/admin/login`.
- **Deployment**: Deploying is handled via Netlify CLI (`netlify deploy --build --prod`).

## Deployment Status
- **URL**: [https://brsh-tournament-app.netlify.app](https://brsh-tournament-app.netlify.app)
- **Team**: brsh
- **Project Name**: brsh-tournament-app
