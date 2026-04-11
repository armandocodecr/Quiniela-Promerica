-- ============================================================
-- Quiniela Promerica — Schema inicial
-- Todas las tablas primero, políticas después
-- ============================================================

-- ------------------------------------------------------------
-- TIPOS
-- ------------------------------------------------------------
create type public.jornada_status as enum ('upcoming', 'active', 'completed');
create type public.match_status   as enum ('upcoming', 'live', 'finished');

-- ------------------------------------------------------------
-- TABLAS
-- ------------------------------------------------------------

create table public.profiles (
  id         uuid        references auth.users on delete cascade primary key,
  username   text        unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table public.quinielas (
  id          uuid    default gen_random_uuid() primary key,
  name        text    not null,
  created_by  uuid    references public.profiles(id) on delete cascade not null,
  invite_code char(8) unique not null default substr(md5(random()::text), 1, 8),
  season      text    not null default 'clausura-2026',
  created_at  timestamptz default now()
);

create table public.quiniela_members (
  quiniela_id  uuid references public.quinielas(id) on delete cascade,
  user_id      uuid references public.profiles(id)  on delete cascade,
  total_points integer     default 0 not null,
  joined_at    timestamptz default now(),
  primary key (quiniela_id, user_id)
);

create table public.jornadas (
  id            uuid                  default gen_random_uuid() primary key,
  number        integer               not null,
  season        text                  not null default 'clausura-2026',
  lock_datetime timestamptz           not null,
  status        public.jornada_status default 'upcoming' not null,
  created_at    timestamptz           default now(),
  unique(number, season)
);

create table public.matches (
  id             uuid                default gen_random_uuid() primary key,
  jornada_id     uuid                references public.jornadas(id) on delete cascade not null,
  home_team      text                not null,
  away_team      text                not null,
  home_team_logo text,
  away_team_logo text,
  match_datetime timestamptz         not null,
  home_score     integer,
  away_score     integer,
  status         public.match_status default 'upcoming' not null,
  espn_id        text                unique,
  created_at     timestamptz         default now()
);

create table public.predictions (
  id               uuid    default gen_random_uuid() primary key,
  user_id          uuid    references public.profiles(id)  on delete cascade not null,
  quiniela_id      uuid    references public.quinielas(id) on delete cascade not null,
  match_id         uuid    references public.matches(id)   on delete cascade not null,
  home_score_pred  integer not null,
  away_score_pred  integer not null,
  points_earned    integer default 0,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique(user_id, quiniela_id, match_id)
);

-- ------------------------------------------------------------
-- ÍNDICES
-- ------------------------------------------------------------
create index matches_jornada_id_idx     on public.matches(jornada_id);
create index matches_status_idx         on public.matches(status);
create index predictions_user_q_idx     on public.predictions(user_id, quiniela_id);
create index predictions_match_idx      on public.predictions(match_id);

-- ------------------------------------------------------------
-- RLS — habilitar en todas las tablas
-- ------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.quinielas         enable row level security;
alter table public.quiniela_members  enable row level security;
alter table public.jornadas          enable row level security;
alter table public.matches           enable row level security;
alter table public.predictions       enable row level security;

-- ------------------------------------------------------------
-- POLÍTICAS — profiles
-- ------------------------------------------------------------
create policy "Profiles are publicly visible"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- ------------------------------------------------------------
-- POLÍTICAS — quinielas
-- (quiniela_members ya existe en este punto)
-- ------------------------------------------------------------
create policy "Members can view their quinielas"
  on public.quinielas for select using (
    exists (
      select 1 from public.quiniela_members qm
      where qm.quiniela_id = quinielas.id and qm.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create quinielas"
  on public.quinielas for insert with check (auth.uid() = created_by);

-- ------------------------------------------------------------
-- POLÍTICAS — quiniela_members
-- ------------------------------------------------------------
create policy "Members can view quiniela members"
  on public.quiniela_members for select using (
    exists (
      select 1 from public.quiniela_members qm2
      where qm2.quiniela_id = quiniela_members.quiniela_id
        and qm2.user_id = auth.uid()
    )
  );

create policy "Authenticated users can join quinielas"
  on public.quiniela_members for insert with check (auth.uid() = user_id);

create policy "System can update total_points"
  on public.quiniela_members for update using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- POLÍTICAS — jornadas
-- ------------------------------------------------------------
create policy "Jornadas are publicly visible"
  on public.jornadas for select using (true);

-- ------------------------------------------------------------
-- POLÍTICAS — matches
-- ------------------------------------------------------------
create policy "Matches are publicly visible"
  on public.matches for select using (true);

-- ------------------------------------------------------------
-- POLÍTICAS — predictions
-- ------------------------------------------------------------
create policy "Users can view predictions in their quinielas"
  on public.predictions for select using (
    exists (
      select 1 from public.quiniela_members qm
      where qm.quiniela_id = predictions.quiniela_id
        and qm.user_id = auth.uid()
    )
  );

create policy "Users can insert predictions before lock"
  on public.predictions for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.matches m
      join public.jornadas j on j.id = m.jornada_id
      where m.id = match_id and now() < j.lock_datetime
    )
  );

create policy "Users can update predictions before lock"
  on public.predictions for update using (
    auth.uid() = user_id and
    exists (
      select 1 from public.matches m
      join public.jornadas j on j.id = m.jornada_id
      where m.id = match_id and now() < j.lock_datetime
    )
  );

-- ------------------------------------------------------------
-- TRIGGER — auto-crear profile al registrarse
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
