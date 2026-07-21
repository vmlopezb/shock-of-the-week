-- ============================================================================
-- DESTRUCTIVE — dev-only reset. Wipes everything 0001_init.sql creates so you
-- can re-run that migration cleanly from scratch. Only use this on a project
-- that has no real user data in it yet.
-- ============================================================================

-- Trigger on auth.users (we don't drop auth.users itself, so drop this explicitly)
drop trigger if exists on_auth_user_created on auth.users;

-- Storage policies on storage.objects (we don't own/drop that table, so its
-- policies referencing is_admin() must be dropped explicitly before the
-- function itself, or the function drop below fails with a dependency error)
drop policy if exists "challenge_media_select_all" on storage.objects;
drop policy if exists "challenge_media_admin_insert" on storage.objects;
drop policy if exists "challenge_media_admin_update" on storage.objects;
drop policy if exists "challenge_media_admin_delete" on storage.objects;

-- Views
drop view if exists public.user_category_stats;
drop view if exists public.leaderboard_global;
drop view if exists public.profiles_public;

-- Tables (cascade removes dependent triggers/policies/foreign keys automatically)
drop table if exists public.comments cascade;
drop table if exists public.answers cascade;
drop table if exists public.submissions cascade;
drop table if exists public.questions cascade;
drop table if exists public.challenges cascade;
drop table if exists public.profiles cascade;
drop table if exists public.categories cascade;
drop table if exists public.hospitals cascade;

-- Functions
drop function if exists public.email_for_username(text);
drop function if exists public.is_username_available(text);
drop function if exists public.prevent_profile_privilege_escalation();
drop function if exists public.handle_new_user();
drop function if exists public.is_admin();

-- Note: we deliberately do NOT touch storage.objects/storage.buckets here —
-- Supabase blocks direct DELETE on those tables from the SQL editor ("Use the
-- Storage API instead"). That's fine: 0001_init.sql creates the bucket with
-- `on conflict (id) do nothing`, so it's safe to leave the existing
-- 'challenge-media' bucket in place and just re-run the migration.
