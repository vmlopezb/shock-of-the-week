import { createClient } from "@/lib/supabase/server";
import { addCategory } from "@/app/actions/admin";
import AddNameForm from "@/components/AddNameForm";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("id, name").order("name");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🏷️ Categories</h1>
      <AddNameForm action={addCategory} placeholder="Category name" buttonLabel="Add Category" />
      <div className="space-y-2">
        {(categories ?? []).map((c) => (
          <div key={c.id} className="rounded-md border border-gray-200 bg-white p-3 text-sm">
            {c.name}
          </div>
        ))}
      </div>
    </div>
  );
}
