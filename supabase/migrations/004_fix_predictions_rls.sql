-- Fix: predictions are allowed for any match whose status is still 'upcoming'
-- (not 'live' or 'finished'), regardless of clock time or jornada lock_datetime.
-- This lets users predict remaining matches in an ongoing jornada until each
-- individual match kicks off and its status is updated to 'live'/'finished'.

drop policy if exists "Users can insert predictions before lock" on public.predictions;
drop policy if exists "Users can update predictions before lock" on public.predictions;

create policy "Users can insert predictions before lock"
  on public.predictions for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.status = 'upcoming'
    )
  );

create policy "Users can update predictions before lock"
  on public.predictions for update using (
    auth.uid() = user_id and
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.status = 'upcoming'
    )
  );
