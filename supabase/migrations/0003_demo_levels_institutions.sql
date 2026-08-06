-- ============================================================================
-- Adds: demo-challenge flag, wider PGY-level options (Medical Student /
-- Allied Health Professional), and a free-text "other institution" field for
-- people outside the curated hospital list.
-- Run once in the Supabase SQL editor (clear the box, paste this alone, run).
-- ============================================================================

-- ---------- Demo challenge ----------
-- Exactly one challenge can be flagged as the public, playable-without-login
-- demo shown on the landing page.

alter table public.challenges
  add column is_demo boolean not null default false;

create unique index challenges_single_demo_idx on public.challenges (is_demo)
  where is_demo;

-- The public/anon-readable subset already covers this (challenges are
-- readable when published, regardless of auth state) but the demo must be
-- readable even if an admin leaves it in draft while building it out, or
-- wants a demo that isn't part of the real weekly rotation. Add that case
-- explicitly to the existing select policy.
drop policy "challenges_select_visible" on public.challenges;
create policy "challenges_select_visible" on public.challenges
  for select using (
    (status = 'published' and publish_at <= now())
    or is_demo
    or created_by = auth.uid()
    or public.is_admin()
  );

drop policy "questions_select_visible" on public.questions;
create policy "questions_select_visible" on public.questions
  for select using (
    exists (
      select 1 from public.challenges c
      where c.id = questions.challenge_id
        and (
          (c.status = 'published' and c.publish_at <= now())
          or c.is_demo
          or c.created_by = auth.uid()
          or public.is_admin()
        )
    )
  );

-- ---------- Wider PGY-level / role options ----------
-- Looks up the auto-generated check constraint name rather than hardcoding
-- it, in case Postgres named it differently than the usual
-- <table>_<column>_check convention.

do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'profiles'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%pgy_level%';

  if constraint_name is not null then
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.profiles add constraint profiles_pgy_level_check
  check (pgy_level in (
    'Medical Student',
    'PGY-1',
    'PGY-2',
    'PGY-3',
    'PGY-4',
    'Attending/Faculty',
    'Allied Health Professional'
  ));

-- ---------- Free-text "other" institution ----------
-- When hospital_id is null, other_institution holds a manually-entered
-- institution name (for people outside the curated hospitals list).

alter table public.profiles add column other_institution text;

-- handle_new_user must also capture other_institution from signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, hospital_id, other_institution, pgy_level)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    nullif(new.raw_user_meta_data ->> 'hospital_id', '')::uuid,
    nullif(new.raw_user_meta_data ->> 'other_institution', ''),
    new.raw_user_meta_data ->> 'pgy_level'
  );
  return new;
end;
$$;

-- Refresh the leaderboard view so it surfaces other_institution as a
-- fallback display name when hospital_id is null.
drop view public.leaderboard_global;
create view public.leaderboard_global as
select
  p.id as user_id,
  p.username,
  p.hospital_id,
  coalesce(h.name, p.other_institution) as hospital_name,
  p.pgy_level,
  coalesce(sum(s.total_points), 0) as total_points,
  count(s.id) as cases_done
from public.profiles p
left join public.submissions s on s.user_id = p.id
left join public.hospitals h on h.id = p.hospital_id
where p.role = 'participant'
group by p.id, p.username, p.hospital_id, h.name, p.other_institution, p.pgy_level;

grant select on public.leaderboard_global to authenticated;

-- profiles_public also gets other_institution so admin/user-facing lists can
-- fall back to it the same way.
drop view public.profiles_public;
create view public.profiles_public as
select id, username, hospital_id, other_institution, pgy_level, created_at
from public.profiles;

grant select on public.profiles_public to authenticated, anon;
