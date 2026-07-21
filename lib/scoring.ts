/**
 * points = correct ? (100 * difficulty) + (confidence * 10 * difficulty) + 25 : 0
 * Rewards correct answers more when the resident was more confident and the
 * question was harder; incorrect answers always score 0.
 */
export function calculatePoints(
  isCorrect: boolean,
  difficulty: number,
  confidence: number
): number {
  if (!isCorrect) return 0;
  return 100 * difficulty + confidence * 10 * difficulty + 25;
}

export function normalizeAnswerText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isShortAnswerCorrect(
  submitted: string,
  acceptedAnswers: string[]
): boolean {
  const normalizedSubmitted = normalizeAnswerText(submitted);
  return acceptedAnswers.some(
    (accepted) => normalizeAnswerText(accepted) === normalizedSubmitted
  );
}
