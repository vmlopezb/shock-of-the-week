"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitChallenge, type AnswerInput } from "@/app/actions/challenges";
import type { Challenge, QuestionForTaking } from "@/lib/types";

interface AnswerState {
  selectedOptionId?: string;
  textAnswer?: string;
}

export default function ChallengeTaker({
  challenge,
  mediaUrl,
  questions,
}: {
  challenge: Challenge;
  mediaUrl: string | null;
  questions: QuestionForTaking[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [confidences, setConfidences] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const progress = ((index + 1) / questions.length) * 100;
  const confidence = confidences[question?.id] ?? 3;
  const currentAnswer = answers[question?.id] ?? {};

  const hasAnswer = useMemo(() => {
    if (!question) return false;
    if (question.type === "multiple_choice") return Boolean(currentAnswer.selectedOptionId);
    return Boolean(currentAnswer.textAnswer?.trim());
  }, [question, currentAnswer]);

  if (!question) {
    return <p className="text-center text-gray-500">This challenge has no questions yet.</p>;
  }

  function setConfidence(value: number) {
    setConfidences((prev) => ({ ...prev, [question.id]: value }));
  }

  function selectOption(optionId: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: { selectedOptionId: optionId } }));
  }

  function setTextAnswer(value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: { textAnswer: value } }));
  }

  function handleSubmit() {
    setError(null);
    const payload: AnswerInput[] = questions.map((q) => ({
      question_id: q.id,
      selected_option_id: answers[q.id]?.selectedOptionId,
      text_answer: answers[q.id]?.textAnswer,
      confidence: confidences[q.id] ?? 3,
    }));

    startTransition(async () => {
      const result = await submitChallenge(challenge.id, payload);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/challenges/${challenge.id}/review`);
    });
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold">{challenge.title}</h2>
      <p className="mt-1 text-sm text-gray-500">
        Question {index + 1} of {questions.length}
      </p>
      <div className="mt-3 h-1.5 w-full rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-5">
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

      <h3 className="mt-6 font-medium">{question.question_text}</h3>

      {question.type === "multiple_choice" ? (
        <div className="mt-4 space-y-2">
          {(question.options ?? []).map((opt) => {
            const selected = currentAnswer.selectedOptionId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => selectOption(opt.id)}
                className={`w-full rounded-md border-2 px-4 py-3 text-left text-sm font-medium transition-colors ${
                  selected
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
              >
                {selected ? "✓ " : ""}
                {opt.text}
              </button>
            );
          })}
        </div>
      ) : (
        <input
          className="input mt-4"
          placeholder="Type your answer..."
          value={currentAnswer.textAnswer ?? ""}
          onChange={(e) => setTextAnswer(e.target.value)}
        />
      )}

      <label className="label mt-6">
        Confidence: <strong>{confidence}/5</strong>
      </label>
      <input
        type="range"
        min={1}
        max={5}
        value={confidence}
        onChange={(e) => setConfidence(Number(e.target.value))}
        className="mb-2 w-full"
      />

      {error ? <p className="mt-2 text-sm text-brand-600">{error}</p> : null}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0 || isPending}
        >
          ← Prev
        </button>
        {isLast ? (
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={handleSubmit}
            disabled={!hasAnswer || isPending}
          >
            {isPending ? "Submitting..." : "Submit"}
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={() => setIndex((i) => i + 1)}
            disabled={!hasAnswer}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
