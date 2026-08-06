"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { calculatePoints, isShortAnswerCorrect } from "@/lib/scoring";
import Lightbox from "@/components/Lightbox";
import type { Challenge, Question } from "@/lib/types";

interface AnswerState {
  selectedOptionId?: string;
  textAnswer?: string;
}

interface QuestionResult {
  question: Question;
  explanationMediaUrl: string | null;
  yourAnswerText: string;
  correctAnswerText: string | undefined;
  isCorrect: boolean;
  points: number;
}

export default function DemoTaker({
  challenge,
  mediaUrl,
  questionsWithUrls,
}: {
  challenge: Challenge;
  mediaUrl: string | null;
  questionsWithUrls: { question: Question; explanationMediaUrl: string | null }[];
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [confidences, setConfidences] = useState<Record<string, number>>({});
  const [results, setResults] = useState<QuestionResult[] | null>(null);

  const { question } = questionsWithUrls[index] ?? {};
  const isLast = index === questionsWithUrls.length - 1;
  const progress = ((index + 1) / questionsWithUrls.length) * 100;
  const confidence = question ? (confidences[question.id] ?? 3) : 3;
  const currentAnswer = question ? (answers[question.id] ?? {}) : {};

  const hasAnswer = useMemo(() => {
    if (!question) return false;
    if (question.type === "multiple_choice") return Boolean(currentAnswer.selectedOptionId);
    return Boolean(currentAnswer.textAnswer?.trim());
  }, [question, currentAnswer]);

  if (questionsWithUrls.length === 0) {
    return <p className="text-center text-gray-500">This demo case has no questions yet.</p>;
  }

  function setConfidence(value: number) {
    if (!question) return;
    setConfidences((prev) => ({ ...prev, [question.id]: value }));
  }

  function selectOption(optionId: string) {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: { selectedOptionId: optionId } }));
  }

  function setTextAnswer(value: string) {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: { textAnswer: value } }));
  }

  function handleFinish() {
    const computed: QuestionResult[] = questionsWithUrls.map(({ question: q, explanationMediaUrl }) => {
      const answer = answers[q.id] ?? {};
      const conf = confidences[q.id] ?? 3;

      const isCorrect =
        q.type === "multiple_choice"
          ? answer.selectedOptionId === q.correct_option_id
          : isShortAnswerCorrect(answer.textAnswer ?? "", q.accepted_answers ?? []);

      const yourAnswerText =
        q.type === "multiple_choice"
          ? (q.options?.find((o) => o.id === answer.selectedOptionId)?.text ?? "—")
          : (answer.textAnswer || "—");

      const correctAnswerText =
        q.type === "multiple_choice"
          ? q.options?.find((o) => o.id === q.correct_option_id)?.text
          : q.accepted_answers?.[0];

      return {
        question: q,
        explanationMediaUrl,
        yourAnswerText,
        correctAnswerText,
        isCorrect,
        points: calculatePoints(isCorrect, q.difficulty, conf),
      };
    });

    setResults(computed);
  }

  if (results) {
    const totalPoints = results.reduce((sum, r) => sum + r.points, 0);
    return (
      <div className="space-y-6">
        <div className="card border-l-4 border-l-green-500 bg-green-50">
          <h2 className="text-xl font-semibold">✓ Demo Complete!</h2>
          <p className="mt-1 text-lg font-medium text-green-700">
            You'd have scored {totalPoints} points
          </p>
          <p className="mt-1 text-sm text-gray-600">
            This is just a preview — nothing here was saved.
          </p>
        </div>

        <div className="space-y-3">
          {results.map((r) => (
            <div
              key={r.question.id}
              className={`rounded-md border-l-4 p-4 ${
                r.isCorrect ? "border-l-green-500 bg-green-50" : "border-l-brand-500 bg-red-50"
              }`}
            >
              <h4 className="font-medium">{r.question.question_text}</h4>
              <p className="mt-1 text-sm">
                <strong>Your answer:</strong> {r.yourAnswerText}
              </p>
              {!r.isCorrect ? (
                <p className="text-sm">
                  <strong>Correct:</strong>{" "}
                  <span className="text-green-700">✓ {r.correctAnswerText}</span>
                </p>
              ) : null}
              {r.question.explanation ? (
                <div className="mt-2 border-t border-black/10 pt-2 text-sm">
                  <strong>📚 Learning:</strong>
                  <div
                    className="rich-text mt-1"
                    dangerouslySetInnerHTML={{ __html: r.question.explanation }}
                  />
                  {r.explanationMediaUrl ? (
                    <Lightbox
                      src={r.explanationMediaUrl}
                      alt="Explanation"
                      className="mt-2 max-h-72 rounded-md"
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="card border-l-4 border-l-brand-500 bg-brand-50 text-center">
          <h3 className="text-lg font-semibold">Like what you see?</h3>
          <p className="mt-1 text-sm text-gray-600">
            Create a free account to track your real score, build a case history, and join the
            leaderboard.
          </p>
          <Link href="/register" className="btn-primary mt-3 inline-block">
            Create your free account →
          </Link>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="space-y-4">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-brand-600">
        Sample case — try it, nothing is saved
      </p>
      <div className="card">
        <h2 className="text-xl font-semibold">{challenge.title}</h2>
        <p className="mt-1 text-sm text-gray-500">
          Question {index + 1} of {questionsWithUrls.length}
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
              <Lightbox src={mediaUrl} alt="Challenge media" className="mt-3 max-h-96 rounded-md" />
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

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
          >
            ← Prev
          </button>
          {isLast ? (
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={handleFinish}
              disabled={!hasAnswer}
            >
              See Results
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
    </div>
  );
}
