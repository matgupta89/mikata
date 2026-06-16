"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function SaveButton({
  contentId,
  memberId,
  initialSaved,
}: {
  contentId: number;
  memberId: number | null;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  // Not signed in: nothing to save against.
  if (memberId === null) {
    return (
      <span className="text-sm text-ink/40">Sign in to save this</span>
    );
  }

  async function toggle() {
    setBusy(true);
    const sb = getSupabase();
    if (saved) {
      await sb
        .from("saves")
        .delete()
        .eq("member_id", memberId)
        .eq("content_id", contentId);
      setSaved(false);
    } else {
      await sb.from("saves").insert({
        member_id: memberId,
        content_id: contentId,
      });
      setSaved(true);
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`text-sm rounded-full px-4 py-1.5 border transition ${
        saved
          ? "border-cobalt text-cobalt bg-cobalt/5"
          : "border-ink/15 hover:border-cobalt hover:text-cobalt"
      } ${busy ? "opacity-50" : ""}`}
    >
      {saved ? "Saved ✓" : "Save"}
    </button>
  );
}

