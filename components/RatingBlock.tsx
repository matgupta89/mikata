"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

function StarRow({
  label,
  tag,
  tagClass,
  value,
  clickable,
  meta,
  onSet,
}: {
  label: string;
  tag: string;
  tagClass: string;
  value: number;
  clickable: boolean;
  meta: string | null;
  onSet: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const shown = clickable ? hover || value : value;

  return (
    <div className="flex items-center gap-2.5">
      <span className="w-20 text-sm text-ink/60">{label}</span>
      <span className={`text-[10px] uppercase tracking-wider w-9 ${tagClass}`}>
        {tag}
      </span>
      <div className="flex" onMouseLeave={() => clickable && setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            disabled={!clickable}
            onMouseEnter={() => clickable && setHover(n)}
            onClick={() => clickable && onSet(n)}
            aria-label={`${label} ${n} of 5`}
            className={`text-xl leading-none px-0.5 ${
              clickable ? "cursor-pointer" : "cursor-default"
            } ${n <= shown ? "text-cobalt" : "text-ink/20"}`}
          >
            ★
          </button>
        ))}
      </div>
      {meta && <span className="text-xs text-ink/45 ml-1">{meta}</span>}
    </div>
  );
}

export default function RatingBlock({
  contentId,
  memberId,
  initialUtility,
  initialEnjoyment,
  avgUtility,
  avgEnjoyment,
  count,
}: {
  contentId: number;
  memberId: number | null;
  initialUtility: number;
  initialEnjoyment: number;
  avgUtility: number | null;
  avgEnjoyment: number | null;
  count: number;
}) {
  const [utility, setUtility] = useState(initialUtility);
  const [enjoyment, setEnjoyment] = useState(initialEnjoyment);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [errMsg, setErrMsg] = useState("");
  const isMember = memberId !== null;

  async function save(u: number, e: number) {
    if (memberId === null) return;
    setStatus("saving");
    setErrMsg("");
    try {
      const sb = getSupabase();
      const { error } = await sb.from("ratings").upsert(
        {
          content_id: contentId,
          member_id: memberId,
          utility: u || null,
          enjoyment: e || null,
        },
        { onConflict: "content_id,member_id" }
      );
      if (error) {
        setStatus("error");
        setErrMsg(error.message);
      } else {
        setStatus("saved");
      }
    } catch (e2: unknown) {
      setStatus("error");
      setErrMsg(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  function setU(n: number) {
    setUtility(n);
    save(n, enjoyment);
  }
  function setE(n: number) {
    setEnjoyment(n);
    save(utility, n);
  }

  const roundedU = avgUtility != null ? Math.round(avgUtility) : 0;
  const roundedE = avgEnjoyment != null ? Math.round(avgEnjoyment) : 0;

  return (
    <div className="rounded-2xl ring-1 ring-ink/10 p-5 bg-white mt-6">
      <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40 mb-4">
        How the room rates this
        {count > 0 && ` · ${count} ${count === 1 ? "rating" : "ratings"}`}
      </p>

      <div className="space-y-3">
        {isMember ? (
          <>
            <StarRow
              label="Useful"
              tag="You"
              tagClass="text-cobalt/70"
              value={utility}
              clickable
              meta={avgUtility != null ? `Room ${avgUtility.toFixed(1)}` : null}
              onSet={setU}
            />
            <StarRow
              label="Enjoyable"
              tag="You"
              tagClass="text-cobalt/70"
              value={enjoyment}
              clickable
              meta={
                avgEnjoyment != null ? `Room ${avgEnjoyment.toFixed(1)}` : null
              }
              onSet={setE}
            />
          </>
        ) : (
          <>
            <StarRow
              label="Useful"
              tag="Room"
              tagClass="text-ink/40"
              value={roundedU}
              clickable={false}
              meta={avgUtility != null ? avgUtility.toFixed(1) : "no ratings yet"}
              onSet={() => {}}
            />
            <StarRow
              label="Enjoyable"
              tag="Room"
              tagClass="text-ink/40"
              value={roundedE}
              clickable={false}
              meta={
                avgEnjoyment != null ? avgEnjoyment.toFixed(1) : "no ratings yet"
              }
              onSet={() => {}}
            />
          </>
        )}
      </div>

      <div className="mt-4 text-xs">
        {!isMember && (
          <span className="text-ink/40">Sign in as a member to add your rating.</span>
        )}
        {isMember && status === "idle" && (
          <span className="text-ink/40">
            Blue stars are your rating. Tap to change.
          </span>
        )}
        {status === "saving" && <span className="text-ink/40">Saving…</span>}
        {status === "saved" && (
          <span className="text-cobalt">Saved ✓ — your rating is recorded.</span>
        )}
        {status === "error" && (
          <span className="text-red-600">Couldn&apos;t save: {errMsg}</span>
        )}
      </div>
    </div>
  );
}

