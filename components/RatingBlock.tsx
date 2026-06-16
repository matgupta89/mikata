"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

function StarRow({
  label,
  value,
  average,
  disabled,
  onSet,
}: {
  label: string;
  value: number;
  average: number | null;
  disabled: boolean;
  onSet: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-sm text-ink/60">{label}</span>
      <div className="flex" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            disabled={disabled}
            onMouseEnter={() => !disabled && setHover(n)}
            onClick={() => !disabled && onSet(n)}
            aria-label={`${label} ${n} of 5`}
            className={`text-xl leading-none px-0.5 ${
              disabled ? "cursor-default" : "cursor-pointer"
            } ${n <= shown ? "text-cobalt" : "text-ink/20"}`}
          >
            ★
          </button>
        ))}
      </div>
      {average != null && (
        <span className="text-xs text-ink/45 ml-1">
          Room {average.toFixed(1)}
        </span>
      )}
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
  const disabled = memberId === null;

  // One row per member per article (upsert on the unique pair). Runs in the
  // background — no page reload, so the stars feel instant.
  async function save(u: number, e: number) {
    if (memberId === null) return;
    const sb = getSupabase();
    await sb.from("ratings").upsert(
      {
        content_id: contentId,
        member_id: memberId,
        utility: u || null,
        enjoyment: e || null,
      },
      { onConflict: "content_id,member_id" }
    );
  }

  function setU(n: number) {
    setUtility(n);
    save(n, enjoyment);
  }
  function setE(n: number) {
    setEnjoyment(n);
    save(utility, n);
  }

  return (
    <div className="rounded-2xl ring-1 ring-ink/10 p-5 bg-white mt-6">
      <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40 mb-4">
        How the room rates this
        {count > 0 && ` · ${count} ${count === 1 ? "rating" : "ratings"}`}
      </p>
      <div className="space-y-3">
        <StarRow
          label="Useful"
          value={utility}
          average={avgUtility}
          disabled={disabled}
          onSet={setU}
        />
        <StarRow
          label="Enjoyable"
          value={enjoyment}
          average={avgEnjoyment}
          disabled={disabled}
          onSet={setE}
        />
      </div>
      <p className="text-xs text-ink/40 mt-4">
        {disabled
          ? "Sign in as a member to add your rating."
          : "Your rating is highlighted in blue. Tap a star to change it."}
      </p>
    </div>
  );
}

