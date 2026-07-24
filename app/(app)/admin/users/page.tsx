import { createClient } from "@/lib/supabase/server";
import { deleteUser } from "@/app/actions/admin";
import DeleteButton from "@/components/DeleteButton";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, pgy_level, created_at, hospitals(name)")
    .eq("role", "participant")
    .order("created_at", { ascending: false });

  const { data: submissions } = await supabase.from("submissions").select("user_id");

  const caseCounts = new Map<string, number>();
  for (const s of submissions ?? []) {
    caseCounts.set(s.user_id, (caseCounts.get(s.user_id) ?? 0) + 1);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">👥 Users</h1>
      <p className="mb-4 text-xs text-gray-400">
        Emails are never shown here — usernames stay anonymous by design.
      </p>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="grid grid-cols-5 gap-3 border-b border-gray-200 bg-gray-50 p-3 text-xs font-semibold uppercase text-gray-500">
          <div>Username</div>
          <div>Hospital</div>
          <div>PGY / Joined</div>
          <div>Cases</div>
          <div>Actions</div>
        </div>
        {(profiles ?? []).map((p) => (
          <div key={p.id} className="grid grid-cols-5 items-center gap-3 border-b border-gray-100 p-3 text-sm">
            <div className="font-medium">{p.username}</div>
            <div>{(p.hospitals as unknown as { name: string } | null)?.name ?? "—"}</div>
            <div>
              {p.pgy_level}
              <br />
              <span className="text-xs text-gray-400">
                {new Date(p.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="font-semibold text-brand-600">{caseCounts.get(p.id) ?? 0}</div>
            <div>
              <DeleteButton
                action={deleteUser.bind(null, p.id)}
                confirmMessage={`Delete ${p.username}? This permanently removes their account, submissions, and comments. This cannot be undone.`}
              />
            </div>
          </div>
        ))}
        {(profiles ?? []).length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-400">No participants yet.</p>
        ) : null}
      </div>
    </div>
  );
}
