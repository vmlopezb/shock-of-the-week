"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, type AuthFormState } from "@/app/actions/auth";

const initialState: AuthFormState = {};

function LinkExpiredNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("error") !== "invalid_or_expired_link") return null;
  return (
    <p className="mb-4 text-sm text-brand-600">
      That link has expired or was already used. Request a new one below.
    </p>
  );
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <div className="card">
        <h1 className="mb-1 text-center text-2xl font-bold">❤️ Shock of the Week</h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Master EKG interpretation
        </p>

        <Suspense fallback={null}>
          <LinkExpiredNotice />
        </Suspense>

        <form action={formAction} className="space-y-1">
          <label className="label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            name="username"
            className="input"
            placeholder="Your username"
            autoComplete="username"
            required
          />

          <label className="label mt-3" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            placeholder="Password"
            autoComplete="current-password"
            required
          />

          {state.error ? (
            <p className="mb-2 text-sm text-brand-600">{state.error}</p>
          ) : null}

          <button type="submit" className="btn-primary mt-2 w-full" disabled={pending}>
            {pending ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="mt-4 flex justify-center gap-3 text-sm text-gray-500">
          <Link href="/forgot-password" className="font-medium text-brand-600">
            Forgot password?
          </Link>
          <span>·</span>
          <Link href="/forgot-username" className="font-medium text-brand-600">
            Forgot username?
          </Link>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          New here?{" "}
          <Link href="/register" className="font-medium text-brand-600">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
