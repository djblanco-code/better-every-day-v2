"use client";
import { useActionState } from "react";
import { acceptInvite, type InviteState } from "./actions";

export function InviteForm() {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(acceptInvite, { error: null });
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="block">
        <span className="text-sm text-neutral-600">Invite code</span>
        <input
          name="code"
          autoComplete="off"
          autoCapitalize="characters"
          required
          className="mt-1 h-11 w-full rounded-lg border border-neutral-300 px-3 font-mono text-sm tracking-wider outline-none focus:border-neutral-500"
          placeholder="BED-XXXXXXXX"
        />
      </label>
      {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      <button
        disabled={pending}
        className="h-11 rounded-lg bg-neutral-900 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}
