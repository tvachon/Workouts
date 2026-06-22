-- Workouts app schema. Run this in the Supabase dashboard:
--   SQL Editor -> New query -> paste -> Run.
--
-- Data model: one reps/weight entry per exercise per day. Exercises can be
-- grouped onto weekdays via routine_days. Every row is owned by a user and
-- Row-Level Security ensures users only ever see their own data.

-- ============ extensions ============
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============ exercises (definitions) ============
create table if not exists public.exercises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name        text not null,
  description text,
  unit        text not null default 'lb' check (unit in ('lb', 'kg')),
  created_at  timestamptz not null default now()
);
create index if not exists exercises_user_idx on public.exercises(user_id);

-- ============ workout_logs (dated reps/weight/notes) ============
create table if not exists public.workout_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  exercise_id  uuid not null references public.exercises(id) on delete cascade,
  performed_on date not null default current_date,
  reps         integer not null check (reps >= 0),
  weight       numeric(7, 2) not null check (weight >= 0),
  notes        text,
  created_at   timestamptz not null default now(),
  -- one entry per exercise per day:
  unique (user_id, exercise_id, performed_on)
);
create index if not exists workout_logs_exercise_date_idx
  on public.workout_logs(user_id, exercise_id, performed_on);

-- ============ routine_days (weekday grouping) ============
-- weekday: 0 = Sunday ... 6 = Saturday (JavaScript Date.getDay convention)
create table if not exists public.routine_days (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  exercise_id  uuid not null references public.exercises(id) on delete cascade,
  weekday      smallint not null check (weekday between 0 and 6),
  sort_order   integer not null default 0,
  unique (user_id, exercise_id, weekday)
);
create index if not exists routine_days_user_weekday_idx
  on public.routine_days(user_id, weekday);

-- ============ Row-Level Security ============
-- Without these, the public anon key would expose every row. RLS is the actual
-- access control; the anon key only identifies the project.
alter table public.exercises    enable row level security;
alter table public.workout_logs enable row level security;
alter table public.routine_days enable row level security;

-- exercises
drop policy if exists "exercises_select_own" on public.exercises;
create policy "exercises_select_own" on public.exercises
  for select using (auth.uid() = user_id);
drop policy if exists "exercises_insert_own" on public.exercises;
create policy "exercises_insert_own" on public.exercises
  for insert with check (auth.uid() = user_id);
drop policy if exists "exercises_update_own" on public.exercises;
create policy "exercises_update_own" on public.exercises
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "exercises_delete_own" on public.exercises;
create policy "exercises_delete_own" on public.exercises
  for delete using (auth.uid() = user_id);

-- workout_logs
drop policy if exists "logs_select_own" on public.workout_logs;
create policy "logs_select_own" on public.workout_logs
  for select using (auth.uid() = user_id);
drop policy if exists "logs_insert_own" on public.workout_logs;
create policy "logs_insert_own" on public.workout_logs
  for insert with check (auth.uid() = user_id);
drop policy if exists "logs_update_own" on public.workout_logs;
create policy "logs_update_own" on public.workout_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "logs_delete_own" on public.workout_logs;
create policy "logs_delete_own" on public.workout_logs
  for delete using (auth.uid() = user_id);

-- routine_days
drop policy if exists "routine_select_own" on public.routine_days;
create policy "routine_select_own" on public.routine_days
  for select using (auth.uid() = user_id);
drop policy if exists "routine_insert_own" on public.routine_days;
create policy "routine_insert_own" on public.routine_days
  for insert with check (auth.uid() = user_id);
drop policy if exists "routine_update_own" on public.routine_days;
create policy "routine_update_own" on public.routine_days
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "routine_delete_own" on public.routine_days;
create policy "routine_delete_own" on public.routine_days
  for delete using (auth.uid() = user_id);
