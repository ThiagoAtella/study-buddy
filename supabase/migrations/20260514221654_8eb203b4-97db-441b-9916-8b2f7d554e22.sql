
-- Subjects
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2d2d2d',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subjects select" ON public.subjects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own subjects insert" ON public.subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own subjects update" ON public.subjects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own subjects delete" ON public.subjects FOR DELETE USING (auth.uid() = user_id);

-- Topics
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own topics select" ON public.topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own topics insert" ON public.topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own topics update" ON public.topics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own topics delete" ON public.topics FOR DELETE USING (auth.uid() = user_id);

-- Schedule slots
CREATE TABLE public.schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL, -- 0=Sunday..6=Saturday
  start_time TIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schedule_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own slots select" ON public.schedule_slots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own slots insert" ON public.schedule_slots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own slots update" ON public.schedule_slots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own slots delete" ON public.schedule_slots FOR DELETE USING (auth.uid() = user_id);

-- Recommended links
CREATE TABLE public.recommended_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recommended_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own links select" ON public.recommended_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own links insert" ON public.recommended_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own links update" ON public.recommended_links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own links delete" ON public.recommended_links FOR DELETE USING (auth.uid() = user_id);

-- Study logs
CREATE TABLE public.study_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  duration_minutes INT NOT NULL,
  notes TEXT,
  studied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs select" ON public.study_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own logs insert" ON public.study_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own logs update" ON public.study_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own logs delete" ON public.study_logs FOR DELETE USING (auth.uid() = user_id);
