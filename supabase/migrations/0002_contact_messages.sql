-- ============================================================================
-- Contact form submissions from the public landing page.
-- Run once in the Supabase SQL editor (same process as 0001_init.sql: clear
-- the box, paste this alone, run it).
-- ============================================================================

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Anyone (including logged-out visitors) can submit the contact form.
create policy "contact_messages_insert_public" on public.contact_messages
  for insert with check (true);

-- Only admins can read submitted messages.
create policy "contact_messages_select_admin" on public.contact_messages
  for select using (public.is_admin());
