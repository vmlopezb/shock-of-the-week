import { createClient } from "@/lib/supabase/server";
import ChallengeBuilder from "./ChallengeBuilder";

export default async function NewChallengePage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("*").order("name");

  return <ChallengeBuilder categories={categories ?? []} />;
}
