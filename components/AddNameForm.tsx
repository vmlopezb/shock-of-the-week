"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/app/actions/admin";

export default function AddNameForm({
  action,
  placeholder,
  buttonLabel,
}: {
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  placeholder: string;
  buttonLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="card flex items-end gap-3">
      <div className="flex-1">
        <label className="label" htmlFor="name">
          {placeholder}
        </label>
        <input id="name" name="name" className="input !mb-0" placeholder={placeholder} required />
      </div>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Adding..." : buttonLabel}
      </button>
      {state.error ? <p className="text-sm text-brand-600">{state.error}</p> : null}
    </form>
  );
}
