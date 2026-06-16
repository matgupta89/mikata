"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

const ROLES = ["prospect", "member", "contributor", "editor", "admin"];

export default function RoleEditor({
  memberId,
  current,
}: {
  memberId: number;
  current: string;
}) {
  const [role, setRole] = useState(current);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function change(next: string) {
    setBusy(true);
    setErr(null);
    const prev = role;
    setRole(next);
    try {
      const sb = getSupabase();
      const { error } = await sb
        .from("profiles")
        .update({ role: next })
        .eq("id", memberId);
      if (error) throw new Error(error.message);
      router.refresh();
    } catch (e: unknown) {
      setRole(prev);
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <select
        value={role}
        disabled={busy}
        onChange={(e) => change(e.target.value)}
        className="text-sm rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 focus:outline-none focus:border-cobalt disabled:opacity-60"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </span>
  );
}

