import { createClient } from "@/lib/supabase/server";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("*")
    .order("name");

  return <RegisterForm hospitals={hospitals ?? []} />;
}
