import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteChallenge, updateChallenge } from "@/app/actions/admin";
import DeleteButton from "@/components/DeleteButton";
import type { Challenge } from "@/lib/types";

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminChallengesPage() {
  const supabase = await createClient();
  const { data: challenges } = await supabase
    .from("challenges")
    .select("*")
    .order("publish_at", { ascending: false });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Challenges</h1>
        <Link href="/admin/challenges/new" className="btn-primary">
          + New Challenge
        </Link>
      </div>

      <div className="space-y-3">
        {((challenges ?? []) as Challenge[]).map((c) => (
          <form key={c.id} action={updateChallenge.bind(null, c.id)} className="card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">{c.title}</h3>
                <p className="text-xs text-gray-500">Created {new Date(c.created_at).toLocaleDateString()}</p>
              </div>
              <span
                className={`badge ${
                  c.status === "published"
                    ? "bg-green-100 text-green-700"
                    : c.status === "draft"
                      ? "bg-gray-100 text-gray-600"
                      : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {c.status}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="label">Status</label>
                <select name="status" defaultValue={c.status} className="input">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="label">Release date/time</label>
                <input
                  type="datetime-local"
                  name="publish_at"
                  defaultValue={toLocalInputValue(c.publish_at)}
                  className="input"
                />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-4">
              <button type="submit" className="btn-secondary">
                Save
              </button>
              <DeleteButton
                action={deleteChallenge.bind(null, c.id)}
                confirmMessage={`Delete "${c.title}"? This also permanently deletes every submission and comment on it. This cannot be undone.`}
              />
            </div>
          </form>
        ))}
        {(challenges ?? []).length === 0 ? (
          <p className="text-center text-sm text-gray-400">No challenges yet.</p>
        ) : null}
      </div>
    </div>
  );
}
