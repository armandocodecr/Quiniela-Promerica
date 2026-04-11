-- ============================================================
-- Quiniela Promerica — Cache table for ESPN API responses
-- ============================================================

CREATE TABLE public.cache (
  key        text        PRIMARY KEY,
  data       jsonb       NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read cache (needed by server components via anon key)
CREATE POLICY "cache_select"
  ON public.cache
  FOR SELECT
  USING (true);

-- Cron and server actions can write (runs with anon key server-side)
CREATE POLICY "cache_upsert"
  ON public.cache
  FOR ALL
  USING (true)
  WITH CHECK (true);
