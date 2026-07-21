import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChallengeTaker from "./ChallengeTaker";
import type { Challenge, QuestionForTaking } from "@/lib/types";

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: challenge } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", id)
    .single();

  if (!challenge) notFound();

  const { data: existingSubmission } = await supabase
    .from("submissions")
    .select("id")
    .eq("challenge_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingSubmission) redirect(`/challenges/${id}/review`);

  // Only select columns safe to show before submission — no answer key.
  const { data: questionsRaw } = await supabase
    .from("questions")
    .select("id, challenge_id, position, question_text, type, options, difficulty, category_id")
    .eq("challenge_id", id)
    .order("position");

  const questions = (questionsRaw ?? []) as QuestionForTaking[];

  let mediaUrl: string | null = null;
  if (challenge.media_url) {
    const { data } = supabase.storage.from("challenge-media").getPublicUrl(challenge.media_url);
    mediaUrl = data.publicUrl;
  }

  return (
    <ChallengeTaker
      challenge={challenge as Challenge}
      mediaUrl={mediaUrl}
      questions={questions}
    />
  );
}
