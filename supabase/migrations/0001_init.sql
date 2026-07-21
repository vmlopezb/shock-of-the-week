-- ============================================================================
-- Shock of the Week — initial schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`) on a
-- fresh project. Safe to re-run individual `create ... if not exists` /
-- `on conflict do nothing` statements, but table/policy creation is NOT
-- idempotent — this is meant to run once against an empty database.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Lookup tables
-- ----------------------------------------------------------------------------

create table public.hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Profiles — 1:1 with auth.users.
-- Deliberately has NO email column: nobody (including admins) should be able
-- to cross-reference a username with a real identity from inside the app.
-- ----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  hospital_id uuid references public.hospitals(id),
  pgy_level text not null check (pgy_level in ('PGY-1','PGY-2','PGY-3','PGY-4','Attending/Faculty')),
  role text not null default 'participant' check (role in ('participant','admin')),
  created_at timestamptz not null default now()
);

create unique index profiles_username_lower_idx on public.profiles (lower(username));

-- ----------------------------------------------------------------------------
-- Challenges ("cases") & questions
-- ----------------------------------------------------------------------------

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  vignette text not null,
  media_url text,
  media_type text check (media_type in ('image','video')),
  category_id uuid references public.categories(id),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  publish_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index challenges_status_publish_at_idx on public.challenges (status, publish_at desc);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  position int not null default 0,
  question_text text not null,
  type text not null check (type in ('multiple_choice','short_answer')),
  options jsonb,                 -- multiple_choice only: [{"id":"a","text":"..."}]
  correct_option_id text,        -- multiple_choice only
  accepted_answers jsonb,        -- short_answer only: ["inferior stemi","inferior mi"]
  difficulty int not null default 1 check (difficulty between 1 and 3),
  explanation text,
  explanation_media_url text,
  explanation_media_type text check (explanation_media_type in ('image','video')),
  category_id uuid references public.categories(id),
  constraint question_type_shape check (
    (type = 'multiple_choice' and options is not null and correct_option_id is not null)
    or
    (type = 'short_answer' and accepted_answers is not null)
  )
);

create index questions_challenge_id_idx on public.questions (challenge_id, position);

-- ----------------------------------------------------------------------------
-- Submissions & answers
-- ----------------------------------------------------------------------------

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id),
  user_id uuid not null references public.profiles(id),
  total_points int not null default 0,
  submitted_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

create index submissions_user_id_idx on public.submissions (user_id);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  question_id uuid not null references public.questions(id),
  selected_option_id text,
  text_answer text,
  confidence int not null check (confidence between 1 and 5),
  is_correct boolean not null,
  points int not null default 0,
  unique (submission_id, question_id)
);

-- ----------------------------------------------------------------------------
-- Comments (one per user per challenge)
-- ----------------------------------------------------------------------------

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id),
  user_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

-- ----------------------------------------------------------------------------
-- Helper: is_admin() — SECURITY DEFINER so RLS policies can check the
-- caller's role without recursing on the profiles table's own RLS.
-- ----------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ----------------------------------------------------------------------------
-- New-user trigger: creates the profiles row from signup metadata, in the
-- same transaction as the auth.users insert (atomic; duplicate usernames
-- fail the whole signup via the unique index above).
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, hospital_id, pgy_level)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    nullif(new.raw_user_meta_data ->> 'hospital_id', '')::uuid,
    new.raw_user_meta_data ->> 'pgy_level'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Prevent a user from escalating their own role via a direct table update
-- (defense in depth on top of RLS + the app never exposing this in the UI).
-- Does not block admin-to-admin promotion done via the Supabase SQL editor
-- (that runs as the postgres/service role, where auth.uid() is null).
-- ----------------------------------------------------------------------------

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() = old.id then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();

-- ----------------------------------------------------------------------------
-- Username RPCs (anonymous-friendly login/registration on top of Supabase's
-- email/password auth). email_for_username is the one deliberate, narrow
-- place email is ever read — only to feed signInWithPassword, never surfaced
-- in any UI.
-- ----------------------------------------------------------------------------

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(p_username)
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

create or replace function public.email_for_username(p_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(p_username)
  limit 1;
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.hospitals enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.questions enable row level security;
alter table public.submissions enable row level security;
alter table public.answers enable row level security;
alter table public.comments enable row level security;

-- hospitals: readable by everyone (needed for the registration dropdown
-- before login), writable by admins only.
create policy "hospitals_select_all" on public.hospitals
  for select using (true);
create policy "hospitals_admin_write" on public.hospitals
  for all using (public.is_admin()) with check (public.is_admin());

-- categories: same shape as hospitals.
create policy "categories_select_all" on public.categories
  for select using (true);
create policy "categories_admin_write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- profiles: only your own row (or admin). No INSERT policy — rows are only
-- ever created by the handle_new_user trigger (SECURITY DEFINER, bypasses RLS).
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- challenges: visible if published & released, or you created it, or you're admin.
create policy "challenges_select_visible" on public.challenges
  for select using (
    (status = 'published' and publish_at <= now())
    or created_by = auth.uid()
    or public.is_admin()
  );
create policy "challenges_admin_write" on public.challenges
  for all using (public.is_admin()) with check (public.is_admin());

-- questions: visibility follows the parent challenge's visibility.
create policy "questions_select_visible" on public.questions
  for select using (
    exists (
      select 1 from public.challenges c
      where c.id = questions.challenge_id
        and (
          (c.status = 'published' and c.publish_at <= now())
          or c.created_by = auth.uid()
          or public.is_admin()
        )
    )
  );
create policy "questions_admin_write" on public.questions
  for all using (public.is_admin()) with check (public.is_admin());

-- submissions: only your own; scoring is always computed server-side.
create policy "submissions_select_own" on public.submissions
  for select using (user_id = auth.uid() or public.is_admin());
create policy "submissions_insert_own" on public.submissions
  for insert with check (user_id = auth.uid());

-- answers: gated through the parent submission's ownership.
create policy "answers_select_own" on public.answers
  for select using (
    exists (
      select 1 from public.submissions s
      where s.id = answers.submission_id
        and (s.user_id = auth.uid() or public.is_admin())
    )
  );
create policy "answers_insert_own" on public.answers
  for insert with check (
    exists (
      select 1 from public.submissions s
      where s.id = answers.submission_id and s.user_id = auth.uid()
    )
  );

-- comments: visible on any visible challenge; one insert per user per challenge
-- (enforced by the unique constraint).
create policy "comments_select_visible" on public.comments
  for select using (
    exists (
      select 1 from public.challenges c
      where c.id = comments.challenge_id
        and (
          (c.status = 'published' and c.publish_at <= now())
          or public.is_admin()
        )
    )
  );
create policy "comments_insert_own" on public.comments
  for insert with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Views
-- ----------------------------------------------------------------------------

-- Cross-user-safe subset of profiles (no role, no email) for admin user lists
-- and anything that needs to join in a username/hospital/pgy without opening
-- up full profile RLS.
create view public.profiles_public as
select id, username, hospital_id, pgy_level, created_at
from public.profiles;

grant select on public.profiles_public to authenticated, anon;

-- Global leaderboard. Deliberately NOT security_invoker: this is meant to
-- aggregate across all participants for ranking purposes.
create view public.leaderboard_global as
select
  p.id as user_id,
  p.username,
  p.hospital_id,
  h.name as hospital_name,
  p.pgy_level,
  coalesce(sum(s.total_points), 0) as total_points,
  count(s.id) as cases_done
from public.profiles p
left join public.submissions s on s.user_id = p.id
left join public.hospitals h on h.id = p.hospital_id
where p.role = 'participant'
group by p.id, p.username, p.hospital_id, h.name, p.pgy_level;

grant select on public.leaderboard_global to authenticated;

-- Per-user, per-category accuracy ("great at ACS, bad at AV blocks").
-- security_invoker = true so it respects the querying user's own RLS on
-- answers/submissions — a participant only ever sees their own rows here.
create view public.user_category_stats
with (security_invoker = true) as
select
  s.user_id,
  q.category_id,
  c.name as category_name,
  count(*) as questions_answered,
  sum((a.is_correct)::int) as correct_count,
  round(100.0 * sum((a.is_correct)::int) / count(*), 1) as accuracy_pct,
  round(avg(a.confidence), 1) as avg_confidence,
  sum(a.points) as total_points
from public.answers a
join public.submissions s on s.id = a.submission_id
join public.questions q on q.id = a.question_id
join public.categories c on c.id = q.category_id
group by s.user_id, q.category_id, c.name;

grant select on public.user_category_stats to authenticated;

-- ----------------------------------------------------------------------------
-- Storage: challenge media bucket (EKG images / short video clips)
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('challenge-media', 'challenge-media', true)
on conflict (id) do nothing;

create policy "challenge_media_select_all" on storage.objects
  for select using (bucket_id = 'challenge-media');

create policy "challenge_media_admin_insert" on storage.objects
  for insert with check (bucket_id = 'challenge-media' and public.is_admin());

create policy "challenge_media_admin_update" on storage.objects
  for update using (bucket_id = 'challenge-media' and public.is_admin());

create policy "challenge_media_admin_delete" on storage.objects
  for delete using (bucket_id = 'challenge-media' and public.is_admin());

-- ----------------------------------------------------------------------------
-- Seed data
-- ----------------------------------------------------------------------------

insert into public.hospitals (name) values
  ('Sinai Hospital of Baltimore'),
  ('Ascension St. Agnes Hospital'),
  ('University of Maryland Medical Center Midtown Campus'),
  ('University of Maryland Medical Center Downtown Campus'),
  ('Tidal Health Salisbury'),
  ('Kaiser Permanente Mid-Atlantic States Program')
on conflict (name) do nothing;

insert into public.categories (name) values
  ('ACS / STEMI'),
  ('AV Blocks'),
  ('Arrhythmias (SVT, AFib, VT)'),
  ('Bundle Branch Blocks'),
  ('Pericarditis'),
  ('Electrolyte Abnormalities'),
  ('Pacemaker Rhythms')
on conflict (name) do nothing;
