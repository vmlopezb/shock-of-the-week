"use client";

import { useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RichTextEditor from "@/components/RichTextEditor";
import Lightbox from "@/components/Lightbox";
import type { Category, MediaType, QuestionOption, QuestionType } from "@/lib/types";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface QuestionDraft {
  mediaFolderId: string;
  type: QuestionType;
  question_text: string;
  options: QuestionOption[];
  correct_option_id: string;
  accepted_answers_text: string;
  difficulty: 1 | 2 | 3;
  explanation: string;
  category_id: string | null;
  explanationMediaPath: string | null;
  explanationMediaType: MediaType | null;
  /** Public URL for an already-saved image, or an object URL for one just
   * picked in this session - either way, just used for the preview. */
  explanationMediaPreview: string | null;
}

export function emptyQuestionDraft(defaultCategoryId: string | null): QuestionDraft {
  return {
    mediaFolderId: crypto.randomUUID(),
    type: "multiple_choice",
    question_text: "",
    options: [
      { id: "a", text: "" },
      { id: "b", text: "" },
      { id: "c", text: "" },
      { id: "d", text: "" },
    ],
    correct_option_id: "",
    accepted_answers_text: "",
    difficulty: 1,
    explanation: "",
    category_id: defaultCategoryId,
    explanationMediaPath: null,
    explanationMediaType: null,
    explanationMediaPreview: null,
  };
}

export default function QuestionFieldsEditor({
  challengeId,
  draft,
  setDraft,
  categories,
}: {
  challengeId: string;
  draft: QuestionDraft;
  setDraft: React.Dispatch<React.SetStateAction<QuestionDraft>>;
  categories: Category[];
}) {
  const [explanationUploading, setExplanationUploading] = useState(false);
  const [explanationUploadError, setExplanationUploadError] = useState<string | null>(null);
  // React-managed, stable across server/client render (unlike
  // crypto.randomUUID(), which would cause a hydration mismatch here since
  // this value is rendered into the radio inputs' `name` attribute).
  const radioGroupId = useId();

  async function handleExplanationMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExplanationUploadError(null);

    const isImage = IMAGE_TYPES.includes(file.type);
    if (!isImage) {
      setExplanationUploadError("Only JPG/PNG/WebP images are supported for explanations.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setExplanationUploadError("Images must be 10MB or smaller.");
      return;
    }

    setExplanationUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${challengeId}/questions/${draft.mediaFolderId}/explanation.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("challenge-media")
      .upload(path, file, { upsert: true });
    setExplanationUploading(false);

    if (error) {
      setExplanationUploadError(`Upload failed: ${error.message}`);
      return;
    }

    setDraft((d) => ({
      ...d,
      explanationMediaPath: path,
      explanationMediaType: "image",
      explanationMediaPreview: URL.createObjectURL(file),
    }));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDraft((d) => ({ ...d, type: "multiple_choice" }))}
          className={`rounded-md border-2 py-2 text-sm font-medium ${
            draft.type === "multiple_choice" ? "border-brand-500 bg-brand-50" : "border-gray-200"
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
                name={`correct-${radioGroupId}`}
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
        <RichTextEditor
          value={draft.explanation}
          onChange={(html) => setDraft((d) => ({ ...d, explanation: html }))}
          placeholder="Explain the correct answer..."
        />
      </div>

      <div>
        <label className="label">Explanation image (optional)</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleExplanationMediaChange}
        />
        {explanationUploading ? <p className="mt-1 text-xs text-gray-500">Uploading...</p> : null}
        {explanationUploadError ? (
          <p className="mt-1 text-xs text-brand-600">{explanationUploadError}</p>
        ) : null}
        {draft.explanationMediaPreview ? (
          <Lightbox
            src={draft.explanationMediaPreview}
            alt="Explanation preview"
            className="mt-2 max-h-48 rounded-md"
          />
        ) : null}
      </div>
    </div>
  );
}
