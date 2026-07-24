import { createClient } from "@/lib/supabase/server";
import { addHospital } from "@/app/actions/admin";
import AddNameForm from "@/components/AddNameForm";

export default async function AdminHospitalsPage() {
  const supabase = await createClient();
  const { data: hospitals } = await supabase.from("hospitals").select("id, name").order("name");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🏥 Hospitals</h1>
      <AddNameForm action={addHospital} placeholder="Hospital name" buttonLabel="Add Hospital" />
      <div className="space-y-2">
        {(hospitals ?? []).map((h) => (
          <div key={h.id} className="rounded-md border border-gray-200 bg-white p-3 text-sm">
            {h.name}
          </div>
        ))}
      </div>
    </div>
  );
}
