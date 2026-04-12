-- Permitir que un miembro se elimine a sí mismo de una quiniela
-- (el owner no puede, se valida en la server action)
create policy "Members can leave quinielas"
  on public.quiniela_members for delete using (auth.uid() = user_id);
