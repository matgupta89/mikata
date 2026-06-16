"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function HideButton({
  id,
  hidden,
}: {
  id: number;
  hidden: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function toggle() {
    setBusy(true);
    try {
      const sb = getSupabase();
      await sb.from("comments").update({ hidden: !hidden }).eq("id", id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="text-xs text-ink/40 hover:text-red-600 transition disabled:opacity-50"
    >
      {hidden ? "Unhide" : "Hide"}
    </button>
  );
}

