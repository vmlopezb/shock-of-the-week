"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotUsernameAction, type AuthFormState } from "@/app/actions/auth";

const initialState: AuthFormState = {};

export default function ForgotUsernamePage() {
  const [state, formAction, pending] = useActionState(forgotUsernameAction, initialState);

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <div className="card">
        <h1 className="mb-1 text-center text-2xl font-bold">Forgot Username</h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Enter your email and we'll send you your username.
        </p>

        {state.success ? (
          <p className="text-center text-sm text-green-600">{state.success}</p>
        ) : (
          <form action={formAction} className="space-y-1">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            {state.error ? (
              <p className="mb-2 text-sm text-brand-600">{state.error}</p>
            ) : null}

            <button type="submit" className="btn-primary mt-2 w-full" disabled={pending}>
              {pending ? "Sending..." : "Send username"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/login" className="font-medium text-brand-600">
            ← Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
