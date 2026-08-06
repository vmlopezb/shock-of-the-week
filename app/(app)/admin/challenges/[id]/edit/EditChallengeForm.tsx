"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  addQuestionToChallenge,
  deleteQuestion,
  setDemoChallenge,
  updateChallengeDetails,
  updateQuestion,
  type NewQuestionInput,
} from "@/app/actions/admin";
import QuestionFieldsEditor, {
  emptyQuestionDraft,
  type QuestionDraft,
} from "@/components/QuestionFieldsEditor";
import Lightbox from "@/components/Lightbox";
import DeleteButton from "@/components/DeleteButton";
import type { Category, Challenge, MediaType, Question } from "@/lib/types";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 75 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];

function questionToDraft(question: Question, explanationMediaUrl: string | null): QuestionDraft {
  return {
    mediaFolderId: question.id,
    type: question.type,
    question_text: question.question_text,
    options: question.options ?? [
      { id: "a", text: "" },
      { id: "b", text: "" },
      { id: "c", text: "" },
      { id: "d", text: "" },
    ],
    correct_option_id: question.correct_option_id ?? "",
    accepted_answers_text: (question.accepted_answers ?? []).join(", "),
    difficulty: question.difficulty,
    explanation: question.explanation ?? "",
    category_id: question.category_id,
    explanationMediaPath: question.explanation_media_url,
    explanationMediaType: question.explanation_media_type,
    explanationMediaPreview: explanationMediaUrl,
  };
}

function draftToQuestionInput(draft: QuestionDraft): NewQuestionInput | { error: string } {
  const text = draft.question_text.trim();
  if (!text) return { error: "Enter the question text." };

  if (draft.type === "multiple_choice") {
    const filled = draft.options.filter((o) => o.text.trim());
    if (filled.length < 2) return { error: "Fill in at least two options." };
    const correct = draft.options.find((o) => o.id === draft.correct_option_id);
    if (!correct || !correct.text.trim()) return { error: "Select which option is correct." };
    return {
      question_text: text,
      type: "multiple_choice",
      options: filled,
      correct_option_id: draft.correct_option_id,
      accepted_answers: null,
      difficulty: draft.difficulty,
      explanation: draft.explanation,
      category_id: draft.category_id,
      explanation_media_url: draft.explanationMediaPath,
      explanation_media_type: draft.explanationMediaType,
    };
  }

  const accepted = draft.accepted_answers_text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (accepted.length === 0) return { error: "Enter at least one accepted answer." };
  return {
    question_text: text,
    type: "short_answer",
    options: null,
    correct_option_id: null,
    accepted_answers: accepted,
    difficulty: draft.difficulty,
    explanation: draft.explanation,
    category_id: draft.category_id,
    explanation_media_url: draft.explanationMediaPath,
    explanation_media_type: draft.explanationMediaType,
  };
}

export default function EditChallengeForm({
  challenge,
  mediaUrl,
  questionsWithUrls,
  categories,
}: {
  challenge: Challenge;
  mediaUrl: string | null;
  questionsWithUrls: { question: Question; explanationMediaUrl: string | null }[];
  categories: Category[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Challenge</h1>
        <DemoToggle challengeId={challenge.id} isDemo={challenge.is_demo} />
      </div>

      <ChallengeDetailsCard challenge={challenge} mediaUrl={mediaUrl} categories={categories} />

      <div className="card">
        <h2 className="mb-3 font-semibold">
          Questions <span className="text-gray-400">({questionsWithUrls.length})</span>
        </h2>
        <div className="space-y-4">
          {questionsWithUrls.map(({ question, explanationMediaUrl }) => (
            <QuestionEditCard
              key={question.id}
              question={question}
              explanationMediaUrl={explanationMediaUrl}
              challengeId={challenge.id}
              categories={categories}
            />
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">+ Add a New Question</h2>
        <AddQuestionCard challengeId={challenge.id} categories={categories} />
      </div>
    </div>
  );
}

function DemoToggle({ challengeId, isDemo }: { challengeId: string; isDemo: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await setDemoChallenge(challengeId, !isDemo);
          router.refresh();
        })
      }
      className={isDemo ? "btn-primary" : "btn-secondary"}
    >
      {isPending ? "Saving..." : isDemo ? "★ Public Demo (click to unset)" : "☆ Make Public Demo"}
    </button>
  );
}

function ChallengeDetailsCard({
  challenge,
  mediaUrl,
  categories,
}: {
  challenge: Challenge;
  mediaUrl: string | null;
  categories: Category[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(challenge.title);
  const [vignette, setVignette] = useState(challenge.vignette);
  const [categoryId, setCategoryId] = useState(challenge.category_id ?? "");
  const [mediaPath, setMediaPath] = useState(challenge.media_url);
  const [mediaType, setMediaType] = useState<MediaType | null>(challenge.media_type);
  const [mediaPreview, setMediaPreview] = useState(mediaUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
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
    const path = `${challenge.id}/main.${ext}`;
    const supabase = createClient();
    const { error: uploadErr } = await supabase.storage
      .from("challenge-media")
      .upload(path, file, { upsert: true });
    setUploading(false);

    if (uploadErr) {
      setUploadError(`Upload failed: ${uploadErr.message}`);
      return;
    }

    setMediaPath(path);
    setMediaType(isImage ? "image" : "video");
    setMediaPreview(URL.createObjectURL(file));
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateChallengeDetails(challenge.id, {
        title,
        vignette,
        media_url: mediaPath,
        media_type: mediaType,
        category_id: categoryId || null,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="card space-y-3">
      <div>
        <label className="label">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label">Vignette</label>
        <textarea
          className="input"
          rows={3}
          value={vignette}
          onChange={(e) => setVignette(e.target.value)}
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
            <Lightbox src={mediaPreview} alt="Preview" className="mt-2 max-h-64 rounded-md" />
          )
        ) : null}
      </div>

      {error ? <p className="text-sm text-brand-600">{error}</p> : null}
      {saved ? <p className="text-sm text-green-600">✓ Saved</p> : null}

      <button type="button" className="btn-primary" onClick={handleSave} disabled={isPending || uploading}>
        {isPending ? "Saving..." : "Save Challenge Details"}
      </button>
    </div>
  );
}

function QuestionEditCard({
  question,
  explanationMediaUrl,
  challengeId,
  categories,
}: {
  question: Question;
  explanationMediaUrl: string | null;
  challengeId: string;
  categories: Category[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<QuestionDraft>(() =>
    questionToDraft(question, explanationMediaUrl)
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);
    const result = draftToQuestionInput(draft);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    startTransition(async () => {
      const res = await updateQuestion(question.id, result);
      if (res.error) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="rounded-md border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-500">
          Q{question.position + 1}. {question.question_text}
        </h3>
        <DeleteButton
          action={() => deleteQuestion(question.id)}
          confirmMessage="Remove this question? This can't be undone."
          label="Remove"
        />
      </div>

      <QuestionFieldsEditor
        challengeId={challengeId}
        draft={draft}
        setDraft={setDraft}
        categories={categories}
      />

      {error ? <p className="mt-2 text-sm text-brand-600">{error}</p> : null}
      {saved ? <p className="mt-2 text-sm text-green-600">✓ Saved</p> : null}

      <button
        type="button"
        className="btn-secondary mt-3 w-full"
        onClick={handleSave}
        disabled={isPending}
      >
        {isPending ? "Saving..." : "Save Question"}
      </button>
    </div>
  );
}

function AddQuestionCard({
  challengeId,
  categories,
}: {
  challengeId: string;
  categories: Category[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<QuestionDraft>(() =>
    emptyQuestionDraft(categories[0]?.id ?? null)
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    setError(null);
    const result = draftToQuestionInput(draft);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    startTransition(async () => {
      const res = await addQuestionToChallenge(challengeId, result);
      if (res.error) {
        setError(res.error);
        return;
      }
      setDraft(emptyQuestionDraft(draft.category_id));
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <QuestionFieldsEditor
        challengeId={challengeId}
        draft={draft}
        setDraft={setDraft}
        categories={categories}
      />
      {error ? <p className="text-sm text-brand-600">{error}</p> : null}
      <button type="button" className="btn-primary w-full" onClick={handleAdd} disabled={isPending}>
        {isPending ? "Adding..." : "+ Add Question"}
      </button>
    </div>
  );
}
