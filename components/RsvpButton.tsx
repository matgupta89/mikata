"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function RsvpButton({
  invitationId,
  memberId,
  capacity,
  initialGoing,
  initialWait,
  initialStatus,
}: {
  invitationId: number;
  memberId: number | null;
  capacity: number;
  initialGoing: number;
  initialWait: number;
  initialStatus: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [going, setGoing] = useState(initialGoing);
  const [wait, setWait] = useState(initialWait);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (memberId === null) {
    return (
      <p className="text-sm text-ink/40">
        Sign in to RSVP · {initialGoing} of {capacity} seats taken
      </p>
    );
  }

  async function toggle() {
    setErr(null);
    const prev = { status, going, wait };
    const action = status ? "cancel" : going >= capacity ? "waitlist" : "going";

    // Optimistic: update the UI immediately.
    if (action === "cancel") {
      if (status === "going") setGoing((g) => g - 1);
      else if (status === "waitlist") setWait((w) => w - 1);
      setStatus(null);
    } else if (action === "going") {
      setGoing((g) => g + 1);
      setStatus("going");
    } else {
      setWait((w) => w + 1);
      setStatus("waitlist");
    }

    setBusy(true);
    try {
      const sb = getSupabase();
      if (action === "cancel") {
        const { error } = await sb
          .from("rsvps")
          .delete()
          .eq("invitation_id", invitationId)
          .eq("member_id", memberId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await sb
          .from("rsvps")
          .insert({ invitation_id: invitationId, member_id: memberId, status: action });
        if (error) throw new Error(error.message);
      }
      router.refresh(); // reconcile with the server in the background
    } catch (e: unknown) {
      // Revert on failure.
      setStatus(prev.status);
      setGoing(prev.going);
      setWait(prev.wait);
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const full = going >= capacity;
  let label: string;
  let hint: string | null = null;
  let style: string;
  if (status === "going") {
    label = "✓ Going";
    hint = "Tap to cancel";
    style = "border-cobalt text-cobalt bg-cobalt/5";
  } else if (status === "waitlist") {
    label = "On the waitlist";
    hint = "Tap to leave";
    style = "border-cobalt text-cobalt bg-cobalt/5";
  } else if (full) {
    label = "Join the waitlist";
    style = "border-ink/15 hover:border-cobalt hover:text-cobalt";
  } else {
    label = "RSVP";
    style = "bg-cobalt text-white border-cobalt hover:bg-cobalt/90";
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={toggle}
        disabled={busy}
        className={`text-sm rounded-full px-5 py-2 border transition ${style} ${
          busy ? "opacity-60" : ""
        }`}
      >
        {label}
      </button>
      <span className="text-xs text-ink/45">
        {going} of {capacity} seats taken
        {wait > 0 && ` · ${wait} on the waitlist`}
      </span>
      {hint && <span className="text-xs text-ink/40">· {hint}</span>}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}

