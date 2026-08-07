"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, getEmailFrom } from "@/lib/resend";
import { usernameRecoveryEmail } from "@/lib/emailTemplates";
import type { PgyLevel } from "@/lib/types";

export interface AuthFormState {
  error?: string;
  success?: string;
}

const PGY_LEVELS: PgyLevel[] = [
  "Medical Student",
  "PGY-1",
  "PGY-2",
  "PGY-3",
  "PGY-4",
  "Attending/Faculty",
  "Allied Health Professional",
];

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const hospitalId = String(formData.get("hospital_id") ?? "");
  const otherInstitution = String(formData.get("other_institution") ?? "").trim();
  const pgyLevel = String(formData.get("pgy_level") ?? "") as PgyLevel;
  const isOtherInstitution = hospitalId === "other";

  if (!USERNAME_PATTERN.test(username)) {
    return {
      error:
        "Username must be 3-20 characters: letters, numbers, and underscores only.",
    };
  }
  if (!email || !password || !hospitalId || !PGY_LEVELS.includes(pgyLevel)) {
    return { error: "Please fill out every field." };
  }
  if (isOtherInstitution && !otherInstitution) {
    return { error: "Enter your institution's name." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();

  const { data: available, error: availabilityError } = await supabase.rpc(
    "is_username_available",
    { p_username: username }
  );
  if (availabilityError) {
    return { error: "Something went wrong. Please try again." };
  }
  if (!available) {
    return { error: "That username is already taken. Try another." };
  }

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        hospital_id: isOtherInstitution ? "" : hospitalId,
        other_institution: isOtherInstitution ? otherInstitution : "",
        pgy_level: pgyLevel,
      },
    },
  });

  if (signUpError) {
    if (signUpError.message.toLowerCase().includes("username")) {
      return { error: "That username is already taken. Try another." };
    }
    return { error: signUpError.message };
  }

  redirect("/dashboard");
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter your username and password." };
  }

  const supabase = await createClient();

  const { data: email, error: lookupError } = await supabase.rpc(
    "email_for_username",
    { p_username: username }
  );

  if (lookupError || !email) {
    return { error: "Invalid username or password." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: "Invalid username or password." };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPasswordAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Enter your email address." };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://shockoftheweek.com";

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/reset-password`,
  });

  // Always the same message whether or not the email is registered - avoids
  // leaking which emails have accounts (same reasoning as the login error).
  return {
    success: "If an account exists with that email, a password reset link is on its way.",
  };
}

export async function resetPasswordAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "This reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

const GENERIC_FORGOT_USERNAME_MESSAGE =
  "If an account exists with that email, we've sent the username to it.";

export async function forgotUsernameAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) {
    return { error: "Enter your email address." };
  }

  // Same non-enumeration reasoning as login/forgot-password: this always
  // returns the same message, whether or not the email matches an account,
  // so a visitor can't use this form to probe which emails are registered.
  try {
    const admin = createAdminClient();

    let matchedUserId: string | null = null;
    let page = 1;
    const perPage = 1000;
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error || !data) break;
      const match = data.users.find((u) => u.email?.toLowerCase() === email);
      if (match) {
        matchedUserId = match.id;
        break;
      }
      if (data.users.length < perPage) break;
      page++;
    }

    if (matchedUserId) {
      const { data: profile } = await admin
        .from("profiles")
        .select("username")
        .eq("id", matchedUserId)
        .single();

      if (profile?.username) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://shockoftheweek.com";
        const { subject, html } = usernameRecoveryEmail(profile.username, siteUrl);
        const resend = getResendClient();
        await resend.emails.send({
          from: getEmailFrom(),
          to: email,
          subject,
          html,
        });
      }
    }
  } catch {
    // Swallow errors (including "Resend not configured") - the response
    // must stay identical either way, and this is best-effort delivery.
  }

  return { success: GENERIC_FORGOT_USERNAME_MESSAGE };
}
