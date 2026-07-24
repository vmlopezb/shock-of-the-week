import { createClient } from "@/lib/supabase/server";

export default async function AdminMessagesPage() {
  const supabase = await createClient();
  const { data: messages } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">✉️ Messages</h1>

      <div className="space-y-3">
        {(messages ?? []).map((m) => (
          <div key={m.id} className="card">
            <div className="flex items-center justify-between">
              <strong>{m.name}</strong>
              <span className="text-xs text-gray-400">
                {new Date(m.created_at).toLocaleString()}
              </span>
            </div>
            <a href={`mailto:${m.email}`} className="text-sm text-brand-600">
              {m.email}
            </a>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{m.message}</p>
          </div>
        ))}
        {(messages ?? []).length === 0 ? (
          <p className="text-center text-sm text-gray-400">No messages yet.</p>
        ) : null}
      </div>
    </div>
  );
}
