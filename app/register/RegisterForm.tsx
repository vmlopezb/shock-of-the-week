"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type AuthFormState } from "@/app/actions/auth";
import type { Hospital } from "@/lib/types";

const PGY_LEVELS = ["PGY-1", "PGY-2", "PGY-3", "PGY-4", "Attending/Faculty"];

const initialState: AuthFormState = {};

export default function RegisterForm({ hospitals }: { hospitals: Hospital[] }) {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <div className="card">
        <h1 className="mb-1 text-center text-2xl font-bold">❤️ Shock of the Week</h1>
        <p className="mb-6 text-center text-sm text-gray-500">Create your account</p>

        <form action={formAction} className="space-y-1">
          <label className="label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            name="username"
            className="input"
            placeholder="Choose a username"
            pattern="[a-zA-Z0-9_]{3,20}"
            title="3-20 characters: letters, numbers, underscores"
            autoComplete="username"
            required
          />

          <label className="label mt-3" htmlFor="email">
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
          <p className="mb-3 text-xs text-gray-400">
            Only used for login/password reset — never shown to other users or admins.
          </p>

          <label className="label" htmlFor="password">
            Password
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

          <label className="label mt-3" htmlFor="hospital_id">
            Hospital
          </label>
          <select id="hospital_id" name="hospital_id" className="input" required defaultValue="">
            <option value="" disabled>
              Select your hospital
            </option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>

          <label className="label mt-3" htmlFor="pgy_level">
            PGY Level
          </label>
          <select id="pgy_level" name="pgy_level" className="input" required defaultValue="">
            <option value="" disabled>
              Select your level
            </option>
            {PGY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>

          {state.error ? (
            <p className="mb-2 mt-3 text-sm text-brand-600">{state.error}</p>
          ) : null}

          <button type="submit" className="btn-primary mt-3 w-full" disabled={pending}>
            {pending ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
