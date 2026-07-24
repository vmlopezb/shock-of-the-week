"use client";

import { useActionState } from "react";
import { submitContactMessage, type ContactFormState } from "@/app/actions/contact";

const initialState: ContactFormState = {};

export default function ContactPage() {
  const [state, formAction, pending] = useActionState(submitContactMessage, initialState);

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <div className="card">
        <h1 className="mb-1 text-center text-2xl font-bold">Contact Us</h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Questions, feedback, or want your program to join? Send us a note.
        </p>

        {state.success ? (
          <p className="text-center text-sm text-green-600">
            ✓ Thanks — we&rsquo;ve received your message and will get back to you soon.
          </p>
        ) : (
          <form action={formAction} className="space-y-1">
            <label className="label" htmlFor="name">
              Name
            </label>
            <input id="name" name="name" className="input" placeholder="Your name" required />

            <label className="label mt-3" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              required
            />

            <label className="label mt-3" htmlFor="message">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              className="input"
              rows={4}
              placeholder="How can we help?"
              required
            />

            {state.error ? (
              <p className="mb-2 text-sm text-brand-600">{state.error}</p>
            ) : null}

            <button type="submit" className="btn-primary mt-2 w-full" disabled={pending}>
              {pending ? "Sending..." : "Send Message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
