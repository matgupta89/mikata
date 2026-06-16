"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function CommentComposer({
  memberId,
  parentId = null,
  contentId = null,
  canPost,
  placeholder = "Add to the discussion…",
  cta = "Post to the room",
  compact = false,
}: {
  memberId: number | null;
  parentId?: number | null;
  contentId?: number | null;
  canPost: boolean;
  placeholder?: string;
  cta?: string;
  compact?: boolean;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  if (!canPost) {
    return (
      <p className="text-sm text-ink/40">
        Sign in as a member to join the discussion.
      </p>
    );
  }

  async function post() {
    if (!body.trim() || memberId == null) return;
    setBusy(true);
    setErr(null);
    try {
      const sb = getSupabase();
      const { error } = await sb.from("comments").insert({
        member_id: memberId,
        parent_id: parentId,
        content_id: contentId,
        body: body.trim(),
      });
      if (error) throw new Error(error.message);
      setBody("");
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "" : "bg-white rounded-2xl ring-1 ring-ink/10 p-4"}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        className="w-full resize-none rounded-xl border border-ink/15 bg-paper/40 px-3.5 py-2.5 text-sm focus:outline-none focus:border-cobalt"
      />
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={post}
          disabled={busy || !body.trim()}
          className={`rounded-full text-sm px-4 py-1.5 bg-cobalt text-white hover:bg-cobalt/90 transition ${
            busy || !body.trim() ? "opacity-50" : ""
          }`}
        >
          {busy ? "Posting…" : cta}
        </button>
        <span className="text-xs text-ink/35">
          Posted under your Yomi handle.
        </span>
      </div>
      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
    </div>
  );
}

