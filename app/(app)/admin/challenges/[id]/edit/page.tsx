import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditChallengeForm from "./EditChallengeForm";
import type { Challenge, Question } from "@/lib/types";

export default async function EditChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: challenge }, { data: questions }, { data: categories }] = await Promise.all([
    supabase.from("challenges").select("*").eq("id", id).single(),
    supabase.from("questions").select("*").eq("challenge_id", id).order("position"),
    supabase.from("categories").select("*").order("name"),
  ]);

  if (!challenge) notFound();

  let mediaUrl: string | null = null;
  if (challenge.media_url) {
    mediaUrl = supabase.storage.from("challenge-media").getPublicUrl(challenge.media_url).data
      .publicUrl;
  }

  const questionsWithUrls = (questions ?? []).map((q) => {
    const question = q as unknown as Question;
    const explanationMediaUrl = question.explanation_media_url
      ? supabase.storage.from("challenge-media").getPublicUrl(question.explanation_media_url)
          .data.publicUrl
      : null;
    return { question, explanationMediaUrl };
  });

  return (
    <EditChallengeForm
      challenge={challenge as Challenge}
      mediaUrl={mediaUrl}
      questionsWithUrls={questionsWithUrls}
      categories={categories ?? []}
    />
  );
}
