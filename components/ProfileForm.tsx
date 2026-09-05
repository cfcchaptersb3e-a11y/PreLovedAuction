"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfile, type FormState } from "@/app/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? "Saving…" : "Save details"}
    </button>
  );
}

export function ProfileForm({
  name,
  phone,
}: {
  name: string | null;
  phone: string | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(updateProfile, {});

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Your name
          </label>
          <input id="name" name="name" defaultValue={name ?? ""} className="field" />
          <p className="hint">Shown to other bidders as first name + last initial.</p>
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Contact number
          </label>
          <input id="phone" name="phone" defaultValue={phone ?? ""} className="field" />
          <p className="hint">So organisers can reach you about payment and pickup.</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton />
        {state.message && <span className="text-sm text-forest">{state.message}</span>}
        {state.error && <span className="text-sm text-clay">{state.error}</span>}
      </div>
    </form>
  );
}
