"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfile, type FormState } from "@/app/actions/auth";
import { MOBILE_FORMAT_HINT, formatMobile } from "@/lib/identity";

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
  email,
  mobile,
  phone,
}: {
  name: string | null;
  email: string | null;
  mobile: string | null;
  phone: string | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(updateProfile, {});

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          Your name
        </label>
        <input id="name" name="name" defaultValue={name ?? ""} className="field" />
        <p className="hint">Shown to other bidders as first name + last initial.</p>
      </div>

      <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={email ?? ""}
            className="field"
          />
          <p className="hint">Where outbid alerts and your winner&rsquo;s notice go.</p>
        </div>
        <div>
          <label className="label" htmlFor="mobile">
            Mobile number
          </label>
          <input
            id="mobile"
            name="mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder={MOBILE_FORMAT_HINT}
            defaultValue={mobile ? formatMobile(mobile) : (phone ?? "")}
            className="field"
          />
          <p className="hint">So organizers can reach you about payment and pickup.</p>
        </div>
      </div>

      <p className="hint">
        You sign in with either of these, so keep at least one.
      </p>

      <div className="flex items-center gap-3">
        <SubmitButton />
        {state.message && <span className="text-sm text-forest">{state.message}</span>}
        {state.error && <span className="text-sm text-clay">{state.error}</span>}
      </div>
    </form>
  );
}
