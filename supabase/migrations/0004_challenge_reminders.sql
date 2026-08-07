-- ============================================================================
-- Adds a reminder_sent_at marker so the challenge-reminder cron job never
-- emails participants twice about the same challenge.
-- ============================================================================

alter table public.challenges
  add column reminder_sent_at timestamptz;
