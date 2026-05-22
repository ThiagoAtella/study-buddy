# Estudo — Study Manager

A study management app built with TanStack Start (SSR React), Supabase, and Tailwind CSS v4. Designed to help students organize their academic life.

## Features
- Subjects & topics tracking
- Weekly schedule with reminders
- Pomodoro timer
- Flashcards & Quiz
- AI-powered study suggestions & tutor
- Goals and statistics
- Study resource links

## Tech Stack
- **Framework**: TanStack Start (SSR) + TanStack Router
- **UI**: React 19 + Radix UI + Tailwind CSS v4
- **Backend/Auth/DB**: Supabase (PostgreSQL)
- **Build**: Vite 7 + Bun
- **Forms**: React Hook Form + Zod

## Development
```bash
bun run dev   # Start dev server on port 5000
bun run build # Production build
```

## Environment Variables
- `VITE_SUPABASE_URL` / `SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` — Supabase anon key
- `VITE_SUPABASE_PROJECT_ID` — Supabase project ID

## Project Structure
- `src/routes/` — File-based routing (index, login)
- `src/components/` — Feature components (Pomodoro, FlashcardsView, etc.)
- `src/integrations/supabase/` — Supabase client, types, auth middleware
- `src/lib/` — Utilities, AI logic, notifications
- `supabase/migrations/` — Database schema migrations

## User Preferences
- Language: Portuguese (Brazilian) UI
- Package manager: Bun
