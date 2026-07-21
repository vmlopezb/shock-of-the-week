import { createBrowserClient } from "@supabase/ssr";

// Use in Client Components only (e.g. direct-to-Storage media upload,
// live username-availability check).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
