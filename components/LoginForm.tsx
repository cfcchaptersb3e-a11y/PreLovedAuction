"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestLoginLink, type FormState } from "@/app/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Sending…" : "Email me a sign-in link"}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState<FormState, FormData>(requestLoginLink, {});

  if (state.message) {
    return (
      <div className="rounded-xl bg-forest-light p-5 text-center">
        <p className="text-3xl" aria-hidden>
          ✉️
        </p>
        <p className="mt-2 font-semibold text-forest">Check your inbox</p>
        <p className="mt-1 text-sm text-forest/80">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="field"
        />
      </div>
      <SubmitButton />
      {state.error && (
        <p className="rounded-lg bg-clay-light px-3 py-2 text-sm text-clay" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
