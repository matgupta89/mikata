"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function RegisterInterest({
  opportunityId,
  memberId,
}: {
  opportunityId: number;
  memberId: number | null;
}) {
  const [ack, setAck] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (memberId === null) {
    return (
      <p className="text-sm text-ink/40">
        Sign in as a member to register interest.
      </p>
    );
  }

  if (done) {
    return (
      <p className="text-sm text-cobalt">
        Interest registered ✓ — IR will be in touch. This is an expression of
        interest only, not an offer or transaction.
      </p>
    );
  }

  async function register() {
    if (!ack) return;
    setBusy(true);
    setErr(null);
    try {
      const sb = getSupabase();
      const { error } = await sb.from("interest_registrations").insert({
        opportunity_id: opportunityId,
        member_id: memberId,
        created_at: new Date().toISOString(),
        ir_status: "new",
      });
      if (error) throw new Error(error.message);
      setDone(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="flex items-start gap-2.5 text-sm text-ink/70 mb-3">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-cobalt shrink-0"
        />
        <span>
          I confirm I&apos;m an eligible / professional investor, and I
          understand this is an expression of interest only — not an offer,
          application, or transaction.
        </span>
      </label>
      <button
        onClick={register}
        disabled={!ack || busy}
        className={`rounded-full text-sm px-5 py-2 transition ${
          ack && !busy
            ? "bg-cobalt text-white hover:bg-cobalt/90"
            : "bg-ink/10 text-ink/40 cursor-not-allowed"
        }`}
      >
        {busy ? "Registering…" : "Register interest"}
      </button>
      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
    </div>
  );
}

