import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { LeaderboardRow } from "@/lib/types";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ hospital?: string }>;
}) {
  const { hospital } = await searchParams;
  const supabase = await createClient();

  const { data: hospitals } = await supabase.from("hospitals").select("id, name").order("name");

  let query = supabase
    .from("leaderboard_global")
    .select("*")
    .order("total_points", { ascending: false });

  if (hospital) {
    query = query.eq("hospital_id", hospital);
  }

  const { data: rows } = await query;
  const leaderboard = (rows ?? []) as LeaderboardRow[];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">🏆 Leaderboard</h1>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link
          href="/leaderboard"
          className={`badge ${!hospital ? "bg-brand-500 text-white" : ""}`}
        >
          All Hospitals
        </Link>
        {(hospitals ?? []).map((h) => (
          <Link
            key={h.id}
            href={`/leaderboard?hospital=${h.id}`}
            className={`badge ${hospital === h.id ? "bg-brand-500 text-white" : ""}`}
          >
            {h.name}
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        {leaderboard.map((row, i) => (
          <div
            key={row.user_id}
            className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3"
          >
            <div>
              <span className="mr-2 text-lg">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "•"}
              </span>
              <strong>{row.username}</strong>
              <span className="ml-2 text-xs text-gray-500">
                {row.pgy_level} • {row.hospital_name ?? "—"}
              </span>
            </div>
            <strong className="text-brand-600">{row.total_points} pts</strong>
          </div>
        ))}
        {leaderboard.length === 0 ? (
          <p className="text-center text-sm text-gray-400">No scores yet.</p>
        ) : null}
      </div>
    </div>
  );
}
