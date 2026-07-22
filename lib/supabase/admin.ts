import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only client using the service role key — bypasses RLS entirely and
 * can manage auth.users directly (e.g. deleting an account). Every caller
 * MUST verify the current user is an admin before using this; never import
 * this file from a Client Component or expose it to the browser bundle.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
