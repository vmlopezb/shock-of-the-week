import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, getEmailFrom } from "@/lib/resend";
import { challengeReminderEmail } from "@/lib/emailTemplates";

// Resend caps combined to/cc/bcc recipients per send around 50 - verify
// against current docs once the account exists; adjust if it changes.
const BCC_CHUNK_SIZE = 50;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://shockoftheweek.com";

  // Test mode: ?test_email=you@example.com sends exactly one sample email to
  // that single address and returns immediately - it never touches
  // challenges, participant data, or reminder_sent_at. Use this to verify
  // Resend/domain setup before letting the real job run against everyone.
  const testEmail = new URL(request.url).searchParams.get("test_email");
  if (testEmail) {
    let resendTest;
    try {
      resendTest = getResendClient();
    } catch {
      return NextResponse.json({ error: "RESEND_API_KEY is not configured yet." }, { status: 500 });
    }
    const { subject, html } = challengeReminderEmail("Sample Test Challenge", siteUrl);
    const { data, error } = await resendTest.emails.send({
      from: getEmailFrom(),
      to: testEmail,
      subject: `[TEST] ${subject}`,
      html,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ testSentTo: testEmail, id: data?.id });
  }

  const admin = createAdminClient();

  const { data: challenges, error: challengesError } = await admin
    .from("challenges")
    .select("id, title")
    .eq("status", "published")
    .lte("publish_at", new Date().toISOString())
    .is("reminder_sent_at", null);

  if (challengesError) {
    return NextResponse.json({ error: challengesError.message }, { status: 500 });
  }
  if (!challenges || challenges.length === 0) {
    return NextResponse.json({ sent: 0, message: "No new challenges to notify about." });
  }

  const { data: participants, error: participantsError } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "participant");

  if (participantsError) {
    return NextResponse.json({ error: participantsError.message }, { status: 500 });
  }

  const participantIds = new Set((participants ?? []).map((p) => p.id));

  // Emails are never stored on profiles (see lib/sanitizeHtml.ts / schema
  // comments for why) - the only place they exist is auth.users, reached
  // here the same way admin account deletion already does: via the
  // service-role client, never surfaced in any UI.
  const emails: string[] = [];
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data) break;
    for (const u of data.users) {
      if (u.email && participantIds.has(u.id)) emails.push(u.email);
    }
    if (data.users.length < perPage) break;
    page++;
  }

  if (emails.length === 0) {
    return NextResponse.json({ sent: 0, message: "No participant emails found." });
  }

  let resend;
  try {
    resend = getResendClient();
  } catch {
    return NextResponse.json({ error: "RESEND_API_KEY is not configured yet." }, { status: 500 });
  }

  const results: { challengeId: string; title: string; ok: boolean; error?: string }[] = [];

  for (const challenge of challenges) {
    const { subject, html } = challengeReminderEmail(challenge.title, siteUrl);
    let allChunksOk = true;

    for (let i = 0; i < emails.length; i += BCC_CHUNK_SIZE) {
      const chunk = emails.slice(i, i + BCC_CHUNK_SIZE);
      // BCC (not "to") so recipients never see each other's addresses -
      // same anonymity guarantee as the rest of the app.
      const { error } = await resend.emails.send({
        from: getEmailFrom(),
        to: getEmailFrom(),
        bcc: chunk,
        subject,
        html,
      });
      if (error) {
        allChunksOk = false;
        results.push({ challengeId: challenge.id, title: challenge.title, ok: false, error: error.message });
      }
    }

    if (allChunksOk) {
      await admin
        .from("challenges")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", challenge.id);
      results.push({ challengeId: challenge.id, title: challenge.title, ok: true });
    }
  }

  return NextResponse.json({ recipientCount: emails.length, results });
}
