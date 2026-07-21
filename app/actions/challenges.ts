"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calculatePoints, isShortAnswerCorrect } from "@/lib/scoring";
import type { Question } from "@/lib/types";

export interface AnswerInput {
  question_id: string;
  selected_option_id?: string;
  text_answer?: string;
  confidence: number;
}

export interface SubmitResult {
  error?: string;
  submissionId?: string;
}

export async function submitChallenge(
  challengeId: string,
  answers: AnswerInput[]
): Promise<SubmitResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're not signed in." };

  // Friendly up-front check; the unique constraint on submissions is the real guard.
  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("challenge_id", challengeId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return { error: "You already completed this challenge." };

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("*")
    .eq("challenge_id", challengeId);

  if (questionsError || !questions || questions.length === 0) {
    return { error: "Could not load this challenge's questions." };
  }

  const questionsById = new Map<string, Question>(
    questions.map((q) => [q.id as string, q as unknown as Question])
  );

  let totalPoints = 0;
  const answerRows: {
    question_id: string;
    selected_option_id: string | null;
    text_answer: string | null;
    confidence: number;
    is_correct: boolean;
    points: number;
  }[] = [];

  for (const answer of answers) {
    const question = questionsById.get(answer.question_id);
    if (!question) continue;

    const isCorrect =
      question.type === "multiple_choice"
        ? answer.selected_option_id === question.correct_option_id
        : isShortAnswerCorrect(answer.text_answer ?? "", question.accepted_answers ?? []);

    const points = calculatePoints(isCorrect, question.difficulty, answer.confidence);
    totalPoints += points;

    answerRows.push({
      question_id: question.id,
      selected_option_id: answer.selected_option_id ?? null,
      text_answer: answer.text_answer ?? null,
      confidence: answer.confidence,
      is_correct: isCorrect,
      points,
    });
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .insert({ challenge_id: challengeId, user_id: user.id, total_points: totalPoints })
    .select("id")
    .single();

  if (submissionError || !submission) {
    return { error: "You already completed this challenge, or something went wrong." };
  }

  const { error: answersError } = await supabase
    .from("answers")
    .insert(answerRows.map((row) => ({ ...row, submission_id: submission.id })));

  if (answersError) {
    return { error: "Something went wrong saving your answers." };
  }

  revalidatePath("/");
  revalidatePath(`/challenges/${challengeId}`);
  revalidatePath("/leaderboard");
  revalidatePath("/profile");

  return { submissionId: submission.id };
}

export interface CommentResult {
  error?: string;
}

export async function addComment(
  challengeId: string,
  body: string
): Promise<CommentResult> {
  const trimmed = body.trim();
  if (!trimmed) return { error: "Comment can't be empty." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're not signed in." };

  const { error } = await supabase
    .from("comments")
    .insert({ challenge_id: challengeId, user_id: user.id, body: trimmed });

  if (error) {
    return { error: "You've already shared a comment on this case." };
  }

  revalidatePath(`/challenges/${challengeId}/review`);
  return {};
}
