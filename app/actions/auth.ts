"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PgyLevel } from "@/lib/types";

export interface AuthFormState {
  error?: string;
}

const PGY_LEVELS: PgyLevel[] = [
  "PGY-1",
  "PGY-2",
  "PGY-3",
  "PGY-4",
  "Attending/Faculty",
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
  const pgyLevel = String(formData.get("pgy_level") ?? "") as PgyLevel;

  if (!USERNAME_PATTERN.test(username)) {
    return {
      error:
        "Username must be 3-20 characters: letters, numbers, and underscores only.",
    };
  }
  if (!email || !password || !hospitalId || !PGY_LEVELS.includes(pgyLevel)) {
    return { error: "Please fill out every field." };
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
        hospital_id: hospitalId,
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

  redirect("/");
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

  redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
