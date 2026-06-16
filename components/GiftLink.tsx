"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Link = {
  token: string;
  view_count: number;
  max_views: number | null;
  expires_at: string | null;
};

export default function GiftLink({
  contentId,
  memberId,
  isEditor,
  remaining,
  existing,
}: {
  contentId: number;
  memberId: number | null;
  isEditor: boolean;
  remaining: number;
  existing: Link[];
}) {
  const [links, setLinks] = useState<Link[]>(existing);
  const [createdCount, setCreatedCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  if (memberId === null) return null;

  const left = isEditor ? Infinity : Math.max(0, remaining - createdCount);
  const canCreate = isEditor || left > 0;

  async function create() {
    setBusy(true);
    setErr(null);
    try {
      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      const expires = new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000
      ).toISOString();
      const sb = getSupabase();
      const { error } = await sb.from("share_links").insert({
        token,
        content_id: contentId,
        created_by: memberId,
        expires_at: expires,
        max_views: 10,
        view_count: 0,
      });
      if (error) throw new Error(error.message);
      setLinks((l) => [
        ...l,
        { token, view_count: 0, max_views: 10, expires_at: expires },
      ]);
      setCreatedCount((c) => c + 1);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // Open the native share sheet where available; fall back to copying.
  async function share(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "A piece from Mikata",
          text: "Shared with you via Mikata",
          url,
        });
        return;
      } catch {
        return; // user dismissed the share sheet
      }
    }
    navigator.clipboard?.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 1500);
  }

  function fmt(iso: string | null) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  }

  return (
    <div className="rounded-2xl ring-1 ring-ink/10 p-5 bg-white mt-6">
      <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40 mb-2">
        Gift this piece
      </p>
      <p className="text-sm text-ink/55 mb-4">
        Share a private link to this one piece. It opens past the wall — for this
        piece only — expires in 14 days, and is capped at 10 views.
      </p>

      {links.length > 0 && (
        <div className="space-y-2 mb-4">
          {links.map((l) => (
            <div
              key={l.token}
              className="flex items-center justify-between gap-3 text-sm border border-ink/10 rounded-xl px-4 py-2.5"
            >
              <span className="text-ink/50 truncate">/share/{l.token}</span>
              <span className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-ink/40">
                  {l.view_count}/{l.max_views} views · exp {fmt(l.expires_at)}
                </span>
                <button
                  onClick={() => share(l.token)}
                  className="text-xs rounded-full border border-ink/15 px-3 py-1 hover:border-cobalt hover:text-cobalt transition"
                >
                  {copied === l.token ? "Copied ✓" : "Share"}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {canCreate ? (
        <div className="flex items-center gap-3">
          <button
            onClick={create}
            disabled={busy}
            className={`rounded-full text-sm px-5 py-2 bg-cobalt text-white hover:bg-cobalt/90 transition ${
              busy ? "opacity-60" : ""
            }`}
          >
            {busy ? "Creating…" : "Create gift link"}
          </button>
          {!isEditor && (
            <span className="text-xs text-ink/40">
              {left} of your monthly allowance left
            </span>
          )}
          {isEditor && (
            <span className="text-xs text-ink/40">Unlimited (editor)</span>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink/45">
          You&apos;ve used your gift-link allowance for now.
        </p>
      )}

      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
    </div>
  );
}

