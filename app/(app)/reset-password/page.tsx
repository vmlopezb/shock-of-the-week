"use client";

import { useActionState } from "react";
import { resetPasswordAction, type AuthFormState } from "@/app/actions/auth";

const initialState: AuthFormState = {};

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <div className="card">
        <h1 className="mb-1 text-center text-2xl font-bold">Set a New Password</h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Choose a new password for your account.
        </p>

        <form action={formAction} className="space-y-1">
          <label className="label" htmlFor="password">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            placeholder="Min 6 characters"
            autoComplete="new-password"
            minLength={6}
            required
          />

          <label className="label mt-3" htmlFor="confirm_password">
            Confirm new password
          </label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            className="input"
            placeholder="Retype password"
            autoComplete="new-password"
            minLength={6}
            required
          />

          {state.error ? (
            <p className="mb-2 mt-3 text-sm text-brand-600">{state.error}</p>
          ) : null}

          <button type="submit" className="btn-primary mt-3 w-full" disabled={pending}>
            {pending ? "Saving..." : "Set new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
