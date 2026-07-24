import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserCategoryStat } from "@/lib/types";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, pgy_level, hospitals(name)")
    .eq("id", user.id)
    .single();

  const { data: stats } = await supabase
    .from("user_category_stats")
    .select("*")
    .eq("user_id", user.id)
    .order("accuracy_pct", { ascending: true });

  const categoryStats = (stats ?? []) as UserCategoryStat[];
  const hospitalName = (profile?.hospitals as unknown as { name: string } | null)?.name;

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-xl font-bold">{profile?.username}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {profile?.pgy_level} • {hospitalName ?? "—"}
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Performance by Category</h2>
        {categoryStats.length === 0 ? (
          <p className="text-sm text-gray-400">
            Complete a few challenges to see your strengths and weaknesses here.
          </p>
        ) : (
          <div className="space-y-3">
            {categoryStats.map((stat) => (
              <div key={stat.category_id} className="card">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{stat.category_name}</h3>
                  <span
                    className={`badge ${
                      stat.accuracy_pct >= 70
                        ? "bg-green-100 text-green-700"
                        : stat.accuracy_pct >= 40
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {stat.accuracy_pct}% correct
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${stat.accuracy_pct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {stat.correct_count}/{stat.questions_answered} correct • avg confidence{" "}
                  {stat.avg_confidence}/5 • {stat.total_points} pts
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
