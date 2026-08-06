import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DemoTaker from "./DemoTaker";
import type { Challenge, Question } from "@/lib/types";

export default async function DemoPage() {
  const supabase = await createClient();

  const { data: challenge } = await supabase
    .from("challenges")
    .select("*")
    .eq("is_demo", true)
    .maybeSingle();

  if (!challenge) {
    return (
      <div className="card text-center">
        <p className="text-gray-500">No demo case is set up yet — check back soon!</p>
        <Link href="/" className="btn-secondary mt-4 inline-block">
          ← Back to home
        </Link>
      </div>
    );
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("challenge_id", challenge.id)
    .order("position");

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
    <DemoTaker
      challenge={challenge as Challenge}
      mediaUrl={mediaUrl}
      questionsWithUrls={questionsWithUrls}
    />
  );
}
