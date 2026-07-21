import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHome() {
  const supabase = await createClient();
  const { count: challengeCount } = await supabase
    .from("challenges")
    .select("*", { count: "exact", head: true });
  const { count: submissionCount } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true });

  return (
    <div>
      <div className="card mb-6 border-l-4 border-l-green-500 bg-green-50">
        <h1 className="text-xl font-bold text-green-700">Admin Panel</h1>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{challengeCount ?? 0}</div>
            <div className="text-xs text-gray-500">Challenges</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{submissionCount ?? 0}</div>
            <div className="text-xs text-gray-500">Submissions</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <AdminLink href="/admin/challenges/new" label="➕ Create Challenge" />
        <AdminLink href="/admin/challenges" label="📅 Manage Challenges" />
        <AdminLink href="/admin/stats" label="📊 Statistics" />
        <AdminLink href="/admin/users" label="👥 Users" />
        <AdminLink href="/admin/hospitals" label="🏥 Hospitals" />
        <AdminLink href="/admin/categories" label="🏷️ Categories" />
      </div>
    </div>
  );
}

function AdminLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="btn-secondary justify-start">
      {label}
    </Link>
  );
}
