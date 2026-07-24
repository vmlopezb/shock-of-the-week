import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Challenge } from "@/lib/types";

export default async function AdminStatsPage() {
  const supabase = await createClient();
  const { data: challenges } = await supabase
    .from("challenges")
    .select("*")
    .order("publish_at", { ascending: false });

  const { data: submissions } = await supabase.from("submissions").select("challenge_id");
  const counts = new Map<string, number>();
  for (const s of submissions ?? []) {
    counts.set(s.challenge_id, (counts.get(s.challenge_id) ?? 0) + 1);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">📊 Statistics</h1>
      <div className="space-y-2">
        {((challenges ?? []) as Challenge[]).map((c) => (
          <Link
            key={c.id}
            href={`/admin/stats/${c.id}`}
            className="card flex items-center justify-between hover:border-brand-500"
          >
            <span className="font-medium">{c.title}</span>
            <span className="badge">{counts.get(c.id) ?? 0} residents</span>
          </Link>
        ))}
        {(challenges ?? []).length === 0 ? (
          <p className="text-center text-sm text-gray-400">No challenges yet.</p>
        ) : null}
      </div>
    </div>
  );
}
