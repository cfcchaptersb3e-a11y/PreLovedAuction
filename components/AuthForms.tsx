"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  requestPasswordReset,
  resetPassword,
  signIn,
  signUp,
  type FormState,
} from "@/app/actions/auth";

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * React 19 resets a form once its action completes, which would wipe every
 * field on a validation error and make the person retype everything. Holding
 * the values in state keeps what they typed.
 */
function useField(initial = "") {
  const [value, setValue] = useState(initial);
  return {
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setValue(event.target.value),
  };
}

function Problem({ state }: { state: FormState }) {
  if (!state.error) return null;
  return (
    <p className="rounded-lg bg-clay-light px-3 py-2 text-sm text-clay" role="alert">
      {state.error}
    </p>
  );
}

export function SignInForm() {
  const [state, action] = useActionState<FormState, FormData>(signIn, {});
  const email = useField();
  const password = useField();

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
          className="field"
          {...email}
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
          {...password}
        />
      </div>
      <Submit label="Sign in" pendingLabel="Signing in…" />
      <Problem state={state} />
      <div className="flex flex-wrap justify-between gap-2 pt-1 text-sm">
        <Link href="/forgot-password" className="text-muted hover:text-ink hover:underline">
          Forgot your password?
        </Link>
        <Link href="/signup" className="font-medium text-forest hover:underline">
          Create an account
        </Link>
      </div>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState<FormState, FormData>(signUp, {});
  const name = useField();
  const email = useField();
  const phone = useField();
  const password = useField();
  const confirm = useField();

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Your name
        </label>
        <input id="name" name="name" autoComplete="name" required className="field" {...name} />
        <p className="hint">Other bidders see your first name and last initial.</p>
      </div>
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
          className="field"
          {...email}
        />
      </div>
      <div>
        <label className="label" htmlFor="phone">
          Contact number <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="phone" name="phone" autoComplete="tel" className="field" {...phone} />
        <p className="hint">So organisers can reach you about payment and pickup if you win.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="field"
            {...password}
          />
          <p className="hint">At least 8 characters.</p>
        </div>
        <div>
          <label className="label" htmlFor="confirm">
            Confirm password
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="field"
            {...confirm}
          />
        </div>
      </div>
      <Submit label="Create account" pendingLabel="Creating…" />
      <Problem state={state} />
      <p className="pt-1 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-forest hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, {});
  const email = useField();

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
          className="field"
          {...email}
        />
      </div>
      <Submit label="Email me a reset link" pendingLabel="Sending…" />
      <Problem state={state} />
      <p className="pt-1 text-sm">
        <Link href="/login" className="text-muted hover:text-ink hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetPassword, {});
  const password = useField();
  const confirm = useField();

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="label" htmlFor="password">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="field"
          {...password}
        />
        <p className="hint">At least 8 characters.</p>
      </div>
      <div>
        <label className="label" htmlFor="confirm">
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="field"
          {...confirm}
        />
      </div>
      <Submit label="Save new password" pendingLabel="Saving…" />
      <Problem state={state} />
    </form>
  );
}
