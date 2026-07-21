import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold text-gray-900">
          ❤️ Shock of the Week
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {profile.role === "admin" ? (
            <Link href="/admin" className="text-gray-600 hover:text-brand-600">
              Admin
            </Link>
          ) : (
            <>
              <Link href="/leaderboard" className="text-gray-600 hover:text-brand-600">
                Leaderboard
              </Link>
              <Link href="/profile" className="text-gray-600 hover:text-brand-600">
                Profile
              </Link>
            </>
          )}
          <span className="badge">{profile.username}</span>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
