import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CommentForm from "./CommentForm";
import type { Answer, Challenge, Question } from "@/lib/types";

export default async function ReviewPage({
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

  const { data: submission } = await supabase
    .from("submissions")
    .select("id, total_points, submitted_at")
    .eq("challenge_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!submission) redirect(`/challenges/${id}`);

  const [{ data: answers }, { data: questions }, { data: comments }] = await Promise.all([
    supabase.from("answers").select("*").eq("submission_id", submission.id),
    supabase.from("questions").select("*").eq("challenge_id", id).order("position"),
    supabase.from("comments").select("id, user_id, body, created_at").eq("challenge_id", id),
  ]);

  const answersByQuestion = new Map((answers ?? []).map((a) => [a.question_id, a as Answer]));

  const commenterIds = (comments ?? []).map((c) => c.user_id);
  const { data: commenterProfiles } =
    commenterIds.length > 0
      ? await supabase
          .from("profiles_public")
          .select("id, username, pgy_level")
          .in("id", commenterIds)
      : { data: [] };

  const profileById = new Map((commenterProfiles ?? []).map((p) => [p.id, p]));
  const myComment = (comments ?? []).find((c) => c.user_id === user.id);
  const otherComments = (comments ?? []).filter((c) => c.user_id !== user.id);

  let mediaUrl: string | null = null;
  if (challenge.media_url) {
    const { data } = supabase.storage.from("challenge-media").getPublicUrl(challenge.media_url);
    mediaUrl = data.publicUrl;
  }

  return (
    <div className="space-y-6">
      <div className="card border-l-4 border-l-green-500 bg-green-50">
        <h2 className="text-xl font-semibold">✓ {(challenge as Challenge).title}</h2>
        <p className="mt-1 text-lg font-medium text-green-700">
          {submission.total_points} points
        </p>
      </div>

      <div className="card">
        <p className="text-gray-700">{challenge.vignette}</p>
        {mediaUrl ? (
          challenge.media_type === "video" ? (
            <video src={mediaUrl} controls className="mt-3 max-h-96 w-full rounded-md" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl} alt="Challenge media" className="mt-3 max-h-96 rounded-md" />
          )
        ) : null}
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">Your Answers</h3>
        <div className="space-y-3">
          {(questions ?? []).map((q) => (
            <QuestionFeedback
              key={q.id}
              question={q as unknown as Question}
              answer={answersByQuestion.get(q.id)}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">Share Your Thoughts</h3>
        {myComment ? (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
            <p>{myComment.body}</p>
          </div>
        ) : (
          <CommentForm challengeId={id} />
        )}
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">Community Insights</h3>
        {otherComments.length > 0 ? (
          <div className="space-y-2">
            {otherComments.map((c) => {
              const profile = profileById.get(c.user_id);
              return (
                <div key={c.id} className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
                  <strong className="text-brand-600">
                    {profile?.username ?? "Anonymous"} ({profile?.pgy_level ?? "?"}):
                  </strong>
                  <p className="mt-1">{c.body}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm italic text-gray-400">Be the first to share!</p>
        )}
      </div>
    </div>
  );
}

function QuestionFeedback({ question, answer }: { question: Question; answer?: Answer }) {
  if (!answer) return null;

  const yourAnswerText =
    question.type === "multiple_choice"
      ? question.options?.find((o) => o.id === answer.selected_option_id)?.text ?? "—"
      : answer.text_answer ?? "—";

  const correctAnswerText =
    question.type === "multiple_choice"
      ? question.options?.find((o) => o.id === question.correct_option_id)?.text
      : question.accepted_answers?.[0];

  return (
    <div
      className={`rounded-md border-l-4 p-4 ${
        answer.is_correct ? "border-l-green-500 bg-green-50" : "border-l-brand-500 bg-red-50"
      }`}
    >
      <h4 className="font-medium">{question.question_text}</h4>
      <p className="mt-1 text-sm">
        <strong>Your answer:</strong> {yourAnswerText}
      </p>
      {!answer.is_correct ? (
        <p className="text-sm">
          <strong>Correct:</strong> <span className="text-green-700">✓ {correctAnswerText}</span>
        </p>
      ) : null}
      {question.explanation ? (
        <p className="mt-2 border-t border-black/10 pt-2 text-sm">
          <strong>📚 Learning:</strong> {question.explanation}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-gray-500">Points: {answer.points}</p>
    </div>
  );
}
