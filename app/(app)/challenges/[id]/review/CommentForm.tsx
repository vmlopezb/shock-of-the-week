"use client";

import { useState, useTransition } from "react";
import { addComment } from "@/app/actions/challenges";

export default function CommentForm({ challengeId }: { challengeId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [posted, setPosted] = useState(false);

  if (posted) {
    return <p className="text-sm text-green-600">✓ Thanks for sharing!</p>;
  }

  return (
    <div>
      <textarea
        className="input"
        rows={3}
        placeholder="What did you learn? Share with others..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {error ? <p className="mb-2 text-sm text-brand-600">{error}</p> : null}
      <button
        type="button"
        className="btn-primary"
        disabled={isPending || !body.trim()}
        onClick={() =>
          startTransition(async () => {
            const result = await addComment(challengeId, body);
            if (result.error) {
              setError(result.error);
              return;
            }
            setPosted(true);
          })
        }
      >
        {isPending ? "Posting..." : "Post Comment"}
      </button>
    </div>
  );
}
