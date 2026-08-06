"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeExplanationHtml } from "@/lib/sanitizeHtml";
import type { ChallengeStatus, MediaType, QuestionOption, QuestionType } from "@/lib/types";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { supabase, user, isAdmin: profile?.role === "admin" };
}

export interface NewQuestionInput {
  question_text: string;
  type: QuestionType;
  options: QuestionOption[] | null;
  correct_option_id: string | null;
  accepted_answers: string[] | null;
  difficulty: 1 | 2 | 3;
  explanation: string;
  category_id: string | null;
  explanation_media_url: string | null;
  explanation_media_type: MediaType | null;
}

export interface NewChallengeInput {
  id: string;
  title: string;
  vignette: string;
  media_url: string | null;
  media_type: MediaType | null;
  category_id: string | null;
  status: ChallengeStatus;
  publish_at: string;
  questions: NewQuestionInput[];
}

export interface ActionResult {
  error?: string;
  id?: string;
}

export async function createChallenge(input: NewChallengeInput): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return { error: "Admins only." };

  if (!input.title.trim() || !input.vignette.trim()) {
    return { error: "Title and vignette are required." };
  }
  if (input.questions.length === 0) {
    return { error: "Add at least one question." };
  }

  const { error: challengeError } = await supabase.from("challenges").insert({
    id: input.id,
    title: input.title.trim(),
    vignette: input.vignette.trim(),
    media_url: input.media_url,
    media_type: input.media_type,
    category_id: input.category_id,
    status: input.status,
    publish_at: input.publish_at,
    created_by: user.id,
  });

  if (challengeError) {
    return { error: `Could not create challenge: ${challengeError.message}` };
  }

  const questionRows = input.questions.map((q, index) => ({
    challenge_id: input.id,
    position: index,
    question_text: q.question_text.trim(),
    type: q.type,
    options: q.options,
    correct_option_id: q.correct_option_id,
    accepted_answers: q.accepted_answers,
    difficulty: q.difficulty,
    explanation: sanitizeExplanationHtml(q.explanation) || null,
    category_id: q.category_id,
    explanation_media_url: q.explanation_media_url,
    explanation_media_type: q.explanation_media_type,
  }));

  const { error: questionsError } = await supabase.from("questions").insert(questionRows);

  if (questionsError) {
    return { error: `Challenge created, but questions failed to save: ${questionsError.message}` };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/admin/challenges");

  return { id: input.id };
}

export async function updateChallenge(
  challengeId: string,
  formData: FormData
): Promise<void> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return;

  const status = String(formData.get("status") ?? "draft") as ChallengeStatus;
  const publishAtLocal = String(formData.get("publish_at") ?? "");
  const publishAt = publishAtLocal ? new Date(publishAtLocal).toISOString() : new Date().toISOString();

  await supabase
    .from("challenges")
    .update({ status, publish_at: publishAt })
    .eq("id", challengeId);

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/admin/challenges");
}

export async function deleteChallenge(challengeId: string): Promise<ActionResult> {
  const { user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return { error: "Admins only." };

  // Service-role client: bypasses RLS so it can clear out submissions/comments
  // that reference this challenge before deleting it (questions cascade
  // automatically via the FK on the questions table).
  const admin = createAdminClient();
  await admin.from("submissions").delete().eq("challenge_id", challengeId);
  await admin.from("comments").delete().eq("challenge_id", challengeId);
  const { error } = await admin.from("challenges").delete().eq("id", challengeId);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/admin/challenges");
  revalidatePath("/admin/stats");
  revalidatePath("/leaderboard");
  return {};
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const { user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return { error: "Admins only." };
  if (userId === user.id) return { error: "You can't delete your own account here." };

  const admin = createAdminClient();
  await admin.from("submissions").delete().eq("user_id", userId);
  await admin.from("comments").delete().eq("user_id", userId);

  // Deleting the auth user cascades to the profiles row automatically.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  revalidatePath("/leaderboard");
  return {};
}

export async function addHospital(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return { error: "Admins only." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a hospital name." };

  const { error } = await supabase.from("hospitals").insert({ name });
  if (error) return { error: error.message.includes("duplicate") ? "That hospital already exists." : error.message };

  revalidatePath("/admin/hospitals");
  revalidatePath("/register");
  return {};
}

export async function addCategory(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return { error: "Admins only." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a category name." };

  const { error } = await supabase.from("categories").insert({ name });
  if (error) return { error: error.message.includes("duplicate") ? "That category already exists." : error.message };

  revalidatePath("/admin/categories");
  revalidatePath("/admin/challenges/new");
  return {};
}

export interface ChallengeDetailsInput {
  title: string;
  vignette: string;
  media_url: string | null;
  media_type: MediaType | null;
  category_id: string | null;
}

export async function updateChallengeDetails(
  challengeId: string,
  input: ChallengeDetailsInput
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return { error: "Admins only." };

  if (!input.title.trim() || !input.vignette.trim()) {
    return { error: "Title and vignette are required." };
  }

  const { error } = await supabase
    .from("challenges")
    .update({
      title: input.title.trim(),
      vignette: input.vignette.trim(),
      media_url: input.media_url,
      media_type: input.media_type,
      category_id: input.category_id,
    })
    .eq("id", challengeId);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath(`/challenges/${challengeId}`);
  revalidatePath(`/admin/challenges/${challengeId}/edit`);
  return {};
}

export async function addQuestionToChallenge(
  challengeId: string,
  input: NewQuestionInput
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return { error: "Admins only." };

  const { count } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("challenge_id", challengeId);

  const { error } = await supabase.from("questions").insert({
    challenge_id: challengeId,
    position: count ?? 0,
    question_text: input.question_text.trim(),
    type: input.type,
    options: input.options,
    correct_option_id: input.correct_option_id,
    accepted_answers: input.accepted_answers,
    difficulty: input.difficulty,
    explanation: sanitizeExplanationHtml(input.explanation) || null,
    category_id: input.category_id,
    explanation_media_url: input.explanation_media_url,
    explanation_media_type: input.explanation_media_type,
  });

  if (error) return { error: error.message };

  revalidatePath(`/admin/challenges/${challengeId}/edit`);
  revalidatePath(`/challenges/${challengeId}`);
  return {};
}

export async function updateQuestion(
  questionId: string,
  input: NewQuestionInput
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return { error: "Admins only." };

  const { data: existing } = await supabase
    .from("questions")
    .select("challenge_id")
    .eq("id", questionId)
    .single();

  const { error } = await supabase
    .from("questions")
    .update({
      question_text: input.question_text.trim(),
      type: input.type,
      options: input.options,
      correct_option_id: input.correct_option_id,
      accepted_answers: input.accepted_answers,
      difficulty: input.difficulty,
      explanation: sanitizeExplanationHtml(input.explanation) || null,
      category_id: input.category_id,
      explanation_media_url: input.explanation_media_url,
      explanation_media_type: input.explanation_media_type,
    })
    .eq("id", questionId);

  if (error) return { error: error.message };

  if (existing) {
    revalidatePath(`/admin/challenges/${existing.challenge_id}/edit`);
    revalidatePath(`/challenges/${existing.challenge_id}`);
  }
  return {};
}

export async function deleteQuestion(questionId: string): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return { error: "Admins only." };

  const { data: existing } = await supabase
    .from("questions")
    .select("challenge_id")
    .eq("id", questionId)
    .single();

  const { error } = await supabase.from("questions").delete().eq("id", questionId);

  if (error) {
    if (error.code === "23503") {
      return {
        error: "Can't remove this question — one or more residents have already answered it.",
      };
    }
    return { error: error.message };
  }

  if (existing) {
    revalidatePath(`/admin/challenges/${existing.challenge_id}/edit`);
  }
  return {};
}

export async function setDemoChallenge(
  challengeId: string,
  makeDemo: boolean
): Promise<ActionResult> {
  const { user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) return { error: "Admins only." };

  const admin = createAdminClient();

  if (makeDemo) {
    await admin.from("challenges").update({ is_demo: false }).eq("is_demo", true);
  }

  const { error } = await admin
    .from("challenges")
    .update({ is_demo: makeDemo })
    .eq("id", challengeId);

  if (error) return { error: error.message };

  revalidatePath("/admin/challenges");
  revalidatePath("/");
  revalidatePath("/demo");
  return {};
}
