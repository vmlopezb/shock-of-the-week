-- ============================================================================
-- One-time data fix: marks every already-published challenge as "already
-- notified" so the new reminder-email cron job only sends mail for
-- challenges published from now on, not a backlog of old ones.
-- Run once in the Supabase SQL editor (clear the box, paste alone, run).
-- ============================================================================

update public.challenges
set reminder_sent_at = now()
where status = 'published'
  and publish_at <= now()
  and reminder_sent_at is null;
