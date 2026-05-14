
ALTER TABLE public.schedule_slots ADD COLUMN IF NOT EXISTS reminder_minutes integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  minutes_per_week integer NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, subject_id)
);
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals select" ON public.weekly_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own goals insert" ON public.weekly_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own goals update" ON public.weekly_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own goals delete" ON public.weekly_goals FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid,
  front text NOT NULL,
  back text NOT NULL,
  ease_factor real NOT NULL DEFAULT 2.5,
  interval_days integer NOT NULL DEFAULT 0,
  repetitions integer NOT NULL DEFAULT 0,
  due_at timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cards select" ON public.flashcards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own cards insert" ON public.flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own cards update" ON public.flashcards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own cards delete" ON public.flashcards FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS flashcards_due_idx ON public.flashcards (user_id, due_at);
