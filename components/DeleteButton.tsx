"use client";

import { useTransition } from "react";

export default function DeleteButton({
  action,
  confirmMessage,
  label = "Delete",
}: {
  action: () => Promise<{ error?: string } | void>;
  confirmMessage: string;
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(async () => {
          const result = await action();
          if (result?.error) {
            window.alert(result.error);
          }
        });
      }}
    >
      {isPending ? "Deleting..." : label}
    </button>
  );
}
