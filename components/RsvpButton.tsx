"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function RsvpButton({
  invitationId,
  memberId,
  capacity,
  goingCount,
  myStatus,
}: {
  invitationId: number;
  memberId: number | null;
  capacity: number;
  goingCount: number;
  myStatus: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (memberId === null) {
    return <span className="text-sm text-ink/40">Sign in to RSVP</span>;
  }

  const full = goingCount >= capacity;

  async function toggle() {
    setBusy(true);
    setErr(null);
    try {
      const sb = getSupabase();
      if (myStatus) {
        const { error } = await sb
          .from("rsvps")
          .delete()
          .eq("invitation_id", invitationId)
          .eq("member_id", memberId);
        if (error) throw new Error(error.message);
      } else {
        const status = full ? "waitlist" : "going";
        const { error } = await sb
          .from("rsvps")
          .insert({ invitation_id: invitationId, member_id: memberId, status });
        if (error) throw new Error(error.message);
      }
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  let label: string;
  if (myStatus === "going") label = "You're going · cancel";
  else if (myStatus === "waitlist") label = "On the waitlist · leave";
  else if (full) label = "Join the waitlist";
  else label = "RSVP";

  const filled = !myStatus && !full;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={busy}
        className={`text-sm rounded-full px-5 py-2 border transition ${
          myStatus
            ? "border-cobalt text-cobalt bg-cobalt/5"
            : filled
            ? "bg-cobalt text-white border-cobalt hover:bg-cobalt/90"
            : "border-ink/15 hover:border-cobalt hover:text-cobalt"
        } ${busy ? "opacity-50" : ""}`}
      >
        {busy ? "…" : label}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}

