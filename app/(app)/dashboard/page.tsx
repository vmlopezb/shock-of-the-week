import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Challenge } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin");

  const { data: challenges } = await supabase
    .from("challenges")
    .select("*")
    .order("publish_at", { ascending: false });

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, challenge_id, total_points, submitted_at")
    .eq("user_id", user.id);

  const submittedChallengeIds = new Set((submissions ?? []).map((s) => s.challenge_id));
  const totalPoints = (submissions ?? []).reduce((sum, s) => sum + s.total_points, 0);
  const list = (challenges ?? []) as Challenge[];
  const current = list[0];
  const past = list.slice(1);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <div className="text-xs uppercase tracking-wide text-gray-400">Points</div>
          <div className="mt-1 text-3xl font-bold">{totalPoints}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs uppercase tracking-wide text-gray-400">Cases Done</div>
          <div className="mt-1 text-3xl font-bold">{submissions?.length ?? 0}</div>
        </div>
      </div>

      {current ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold">This Week's Challenge</h2>
          <ChallengeCard challenge={current} done={submittedChallengeIds.has(current.id)} />
        </div>
      ) : (
        <p className="text-center text-gray-500">No challenges have been published yet.</p>
      )}

      {past.length > 0 ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Past Challenges</h2>
          <div className="space-y-3">
            {past.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                done={submittedChallengeIds.has(c.id)}
                compact
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChallengeCard({
  challenge,
  done,
  compact = false,
}: {
  challenge: Challenge;
  done: boolean;
  compact?: boolean;
}) {
  const href = done ? `/challenges/${challenge.id}/review` : `/challenges/${challenge.id}`;

  return (
    <Link href={href} className="card block hover:border-brand-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className={compact ? "font-medium" : "text-xl font-semibold"}>
            {challenge.title}
          </h3>
          {!compact ? (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{challenge.vignette}</p>
          ) : null}
          <p className="mt-1 text-xs text-gray-400">
            Released {new Date(challenge.publish_at).toLocaleDateString()}
          </p>
        </div>
        <span className={done ? "badge bg-green-100 text-green-700" : "badge"}>
          {done ? "✓ Done — review" : "Start"}
        </span>
      </div>
    </Link>
  );
}
