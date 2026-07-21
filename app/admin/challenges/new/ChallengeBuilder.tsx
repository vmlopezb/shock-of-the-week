"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createChallenge, type NewQuestionInput } from "@/app/actions/admin";
import type { Category, ChallengeStatus, MediaType, QuestionType } from "@/lib/types";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 75 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];

const EMPTY_OPTIONS = [
  { id: "a", text: "" },
  { id: "b", text: "" },
  { id: "c", text: "" },
  { id: "d", text: "" },
];

function emptyQuestionDraft(defaultCategoryId: string | null) {
  return {
    type: "multiple_choice" as QuestionType,
    question_text: "",
    options: EMPTY_OPTIONS.map((o) => ({ ...o })),
    correct_option_id: "" as string,
    accepted_answers_text: "",
    difficulty: 1 as 1 | 2 | 3,
    explanation: "",
    category_id: defaultCategoryId,
  };
}

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function ChallengeBuilder({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [challengeId] = useState(() => crypto.randomUUID());

  const [title, setTitle] = useState("");
  const [vignette, setVignette] = useState("");
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "");
  const [status, setStatus] = useState<ChallengeStatus>("published");
  const [publishAt, setPublishAt] = useState(() => toLocalInputValue(new Date()));

  const [mediaPath, setMediaPath] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<NewQuestionInput[]>([]);
  const [draft, setDraft] = useState(() => emptyQuestionDraft(categories[0]?.id ?? null));
  const [draftError, setDraftError] = useState<string | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const isImage = IMAGE_TYPES.includes(file.type);
    const isVideo = VIDEO_TYPES.includes(file.type);
    if (!isImage && !isVideo) {
      setUploadError("Only JPG/PNG/WebP images or MP4/WebM video are supported.");
      return;
    }
    if (isImage && file.size > MAX_IMAGE_BYTES) {
      setUploadError("Images must be 10MB or smaller.");
      return;
    }
    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      setUploadError("Videos must be 75MB or smaller.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() ?? (isImage ? "jpg" : "mp4");
    const path = `${challengeId}/main.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("challenge-media")
      .upload(path, file, { upsert: true });
    setUploading(false);

    if (error) {
      setUploadError(`Upload failed: ${error.message}`);
      return;
    }

    setMediaPath(path);
    setMediaType(isImage ? "image" : "video");
    setMediaPreview(URL.createObjectURL(file));
  }

  function addQuestion() {
    setDraftError(null);
    const text = draft.question_text.trim();
    if (!text) {
      setDraftError("Enter the question text.");
      return;
    }

    if (draft.type === "multiple_choice") {
      const filled = draft.options.filter((o) => o.text.trim());
      if (filled.length < 2) {
        setDraftError("Fill in at least two options.");
        return;
      }
      const correct = draft.options.find((o) => o.id === draft.correct_option_id);
      if (!correct || !correct.text.trim()) {
        setDraftError("Select which option is correct.");
        return;
      }
      setQuestions((prev) => [
        ...prev,
        {
          question_text: text,
          type: "multiple_choice",
          options: filled,
          correct_option_id: draft.correct_option_id,
          accepted_answers: null,
          difficulty: draft.difficulty,
          explanation: draft.explanation,
          category_id: draft.category_id,
        },
      ]);
    } else {
      const accepted = draft.accepted_answers_text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (accepted.length === 0) {
        setDraftError("Enter at least one accepted answer.");
        return;
      }
      setQuestions((prev) => [
        ...prev,
        {
          question_text: text,
          type: "short_answer",
          options: null,
          correct_option_id: null,
          accepted_answers: accepted,
          difficulty: draft.difficulty,
          explanation: draft.explanation,
          category_id: draft.category_id,
        },
      ]);
    }

    setDraft(emptyQuestionDraft(draft.category_id));
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleCreate() {
    setSubmitError(null);
    if (!title.trim() || !vignette.trim()) {
      setSubmitError("Title and vignette are required.");
      return;
    }
    if (questions.length === 0) {
      setSubmitError("Add at least one question.");
      return;
    }

    startTransition(async () => {
      const result = await createChallenge({
        id: challengeId,
        title,
        vignette,
        media_url: mediaPath,
        media_type: mediaType,
        category_id: categoryId || null,
        status,
        publish_at: new Date(publishAt).toISOString(),
        questions,
      });

      if (result.error) {
        setSubmitError(result.error);
        return;
      }
      router.push("/admin/challenges");
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create Challenge</h1>

      <div className="card space-y-3">
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 45M with Chest Pain"
          />
        </div>
        <div>
          <label className="label">Vignette</label>
          <textarea
            className="input"
            rows={3}
            value={vignette}
            onChange={(e) => setVignette(e.target.value)}
            placeholder="Patient presentation..."
          />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">EKG image or video</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            onChange={handleMediaChange}
          />
          {uploading ? <p className="mt-1 text-xs text-gray-500">Uploading...</p> : null}
          {uploadError ? <p className="mt-1 text-xs text-brand-600">{uploadError}</p> : null}
          {mediaPreview ? (
            mediaType === "video" ? (
              <video src={mediaPreview} controls className="mt-2 max-h-64 rounded-md" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaPreview} alt="Preview" className="mt-2 max-h-64 rounded-md" />
            )
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as ChallengeStatus)}
            >
              <option value="published">Published (scheduled)</option>
              <option value="draft">Draft (hidden)</option>
            </select>
          </div>
          <div>
            <label className="label">Release date/time</label>
            <input
              type="datetime-local"
              className="input"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">
          Questions <span className="text-gray-400">({questions.length} added)</span>
        </h2>

        {questions.length > 0 ? (
          <div className="mb-4 space-y-2">
            {questions.map((q, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md bg-gray-50 p-3 text-sm"
              >
                <span>
                  Q{i + 1}. {q.question_text}{" "}
                  <span className="text-xs text-gray-400">
                    ({q.type === "multiple_choice" ? "Multiple choice" : "Short answer"})
                  </span>
                </span>
                <button
                  type="button"
                  className="text-xs text-brand-600"
                  onClick={() => removeQuestion(i)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-3 border-t border-gray-200 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, type: "multiple_choice" }))}
              className={`rounded-md border-2 py-2 text-sm font-medium ${
                draft.type === "multiple_choice"
                  ? "border-brand-500 bg-brand-50"
                  : "border-gray-200"
              }`}
            >
              Multiple choice
            </button>
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, type: "short_answer" }))}
              className={`rounded-md border-2 py-2 text-sm font-medium ${
                draft.type === "short_answer" ? "border-brand-500 bg-brand-50" : "border-gray-200"
              }`}
            >
              Short answer
            </button>
          </div>

          <textarea
            className="input"
            rows={2}
            placeholder="Question text"
            value={draft.question_text}
            onChange={(e) => setDraft((d) => ({ ...d, question_text: e.target.value }))}
          />

          {draft.type === "multiple_choice" ? (
            <div className="space-y-2">
              <label className="label">Options — select the correct one</label>
              {draft.options.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={draft.correct_option_id === opt.id}
                    onChange={() => setDraft((d) => ({ ...d, correct_option_id: opt.id }))}
                  />
                  <input
                    className="input !mb-0"
                    placeholder={`Option ${i + 1}`}
                    value={opt.text}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        options: d.options.map((o) =>
                          o.id === opt.id ? { ...o, text: e.target.value } : o
                        ),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <label className="label">Accepted answers (comma-separated)</label>
              <input
                className="input"
                placeholder="inferior stemi, inferior mi"
                value={draft.accepted_answers_text}
                onChange={(e) => setDraft((d) => ({ ...d, accepted_answers_text: e.target.value }))}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Difficulty</label>
              <select
                className="input"
                value={draft.difficulty}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, difficulty: Number(e.target.value) as 1 | 2 | 3 }))
                }
              >
                <option value={1}>Easy</option>
                <option value={2}>Medium</option>
                <option value={3}>Hard</option>
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={draft.category_id ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, category_id: e.target.value || null }))}
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Explanation (shown after answering)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Explain the correct answer..."
              value={draft.explanation}
              onChange={(e) => setDraft((d) => ({ ...d, explanation: e.target.value }))}
            />
          </div>

          {draftError ? <p className="text-sm text-brand-600">{draftError}</p> : null}

          <button type="button" className="btn-secondary w-full" onClick={addQuestion}>
            + Add Question
          </button>
        </div>
      </div>

      {submitError ? <p className="text-sm text-brand-600">{submitError}</p> : null}

      <button
        type="button"
        className="btn-primary w-full"
        onClick={handleCreate}
        disabled={isPending || uploading}
      >
        {isPending ? "Creating..." : "✓ Create Challenge"}
      </button>
    </div>
  );
}
