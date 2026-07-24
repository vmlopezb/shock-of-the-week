import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Answer, Question } from "@/lib/types";

export default async function AdminChallengeStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: challenge } = await supabase.from("challenges").select("*").eq("id", id).single();
  if (!challenge) notFound();

  const { data: questionsRaw } = await supabase
    .from("questions")
    .select("*")
    .eq("challenge_id", id)
    .order("position");
  const questions = (questionsRaw ?? []) as unknown as Question[];

  const { data: answersRaw } = await supabase
    .from("answers")
    .select("*")
    .in("question_id", questions.map((q) => q.id));
  const answers = (answersRaw ?? []) as Answer[];

  const answersByQuestion = new Map<string, Answer[]>();
  for (const a of answers) {
    const list = answersByQuestion.get(a.question_id) ?? [];
    list.push(a);
    answersByQuestion.set(a.question_id, list);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{challenge.title}</h1>
      <p className="text-sm text-gray-500">
        {new Set(answers.map((a) => a.submission_id)).size} residents completed this challenge.
      </p>

      {questions.map((q, i) => {
        const qAnswers = answersByQuestion.get(q.id) ?? [];
        const correctCount = qAnswers.filter((a) => a.is_correct).length;
        const avgConfidence =
          qAnswers.length > 0
            ? (qAnswers.reduce((sum, a) => sum + a.confidence, 0) / qAnswers.length).toFixed(1)
            : "—";

        return (
          <div key={q.id} className="card">
            <p className="mb-1 font-medium">
              Q{i + 1}. {q.question_text}
            </p>
            <p className="mb-3 text-xs text-gray-500">
              Correct: {correctCount}/{qAnswers.length} • Avg confidence: {avgConfidence}/5
            </p>

            {q.type === "multiple_choice" ? (
              <div className="space-y-2">
                {(q.options ?? []).map((opt) => {
                  const count = qAnswers.filter((a) => a.selected_option_id === opt.id).length;
                  const pct = qAnswers.length ? Math.round((count / qAnswers.length) * 100) : 0;
                  const isCorrect = opt.id === q.correct_option_id;
                  return (
                    <div key={opt.id}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>
                          {isCorrect ? "✓ " : ""}
                          {opt.text}
                        </span>
                        <span>
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-200">
                        <div
                          className={`h-full rounded-full ${isCorrect ? "bg-green-500" : "bg-brand-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Submitted answers:</p>
                {qAnswers.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded px-2 py-1 text-xs ${
                      a.is_correct ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {a.is_correct ? "✓" : "✗"} {a.text_answer}
                  </div>
                ))}
                {qAnswers.length === 0 ? (
                  <p className="text-xs text-gray-400">No answers yet.</p>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
