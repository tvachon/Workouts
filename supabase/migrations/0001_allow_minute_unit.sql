-- Allow duration-based exercises (unit 'min').
--
-- schema.sql uses `create table if not exists`, so databases created before
-- 'min' was added to the exercises.unit CHECK constraint keep the old
-- definition `check (unit in ('lb', 'kg'))` and reject updates to 'min'.
-- Run this once in the Supabase SQL Editor to widen the constraint.
alter table public.exercises drop constraint if exists exercises_unit_check;
alter table public.exercises
  add constraint exercises_unit_check check (unit in ('lb', 'kg', 'min'));
