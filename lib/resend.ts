import { Resend } from "resend";

/** Server-only. Throws at call time (not import time) if RESEND_API_KEY
 * isn't configured yet, so the rest of the app keeps working before it's set up. */
export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }
  return new Resend(apiKey);
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "Shock of the Week <onboarding@resend.dev>";
}
