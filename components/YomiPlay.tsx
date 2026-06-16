"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type Question = { id: number; prompt: string; options: string[] };

export default function YomiPlay({
  roundId,
  questions,
  memberId,
}: {
  roundId: number;
  questions: Question[];
  memberId: number;
}) {
  const router = useRouter();
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [stakes, setStakes] = useState<Record<string, number>>(() =>
    Object.fromEntries(questions.map((q) => [String(q.id), 0]))
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const used = Object.values(stakes).reduce((a, b) => a + (b || 0), 0);
  const remaining = 100 - used;
  const allPicked = questions.every((q) => picks[String(q.id)]);
  const canLock = remaining === 0 && allPicked && !busy;

  function choose(qid: string, opt: string) {
    setPicks((p) => ({ ...p, [qid]: opt }));
  }

  function bump(qid: string, delta: number) {
    setStakes((s) => {
      const cur = s[qid] ?? 0;
      const others = used - cur;
      let next = cur + delta;
      if (next < 0) next = 0;
      if (others + next > 100) next = 100 - others;
      return { ...s, [qid]: next };
    });
  }

  async function lock() {
    if (!canLock) return;
    setBusy(true);
    setErr(null);
    try {
      const sb = getSupabase();
      const { error } = await sb.from("yomi_submissions").insert({
        round_id: roundId,
        member_id: memberId,
        picks,
        stakes,
        locked_at: new Date().toISOString(),
      });
      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Conviction budget tracker */}
      <div className="sticky top-[64px] z-10 bg-paper/95 backdrop-blur rounded-xl ring-1 ring-ink/10 px-5 py-3 mb-6 flex items-center justify-between">
        <div>
          <span className="text-sm text-ink/60">Conviction budget</span>
          <span className="ml-3 font-display text-lg">{used}</span>
          <span className="text-ink/40"> / 100</span>
        </div>
        <span className={`text-sm ${remaining === 0 ? "text-cobalt" : "text-ink/50"}`}>
          {remaining} left
        </span>
      </div>

      <div className="space-y-5">
        {questions.map((q) => {
          const qid = String(q.id);
          return (
            <div key={q.id} className="bg-white rounded-2xl ring-1 ring-ink/10 p-6">
              <p className="font-display text-lg mb-4">{q.prompt}</p>

              <div className="flex flex-wrap gap-2 mb-5">
                {q.options.map((opt) => {
                  const sel = picks[qid] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => choose(qid, opt)}
                      className={`text-sm rounded-full px-4 py-2 border transition ${
                        sel
                          ? "border-cobalt bg-cobalt/5 text-cobalt"
                          : "border-ink/15 hover:border-cobalt/50"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-ink/55 w-20">Conviction</span>
                <button
                  onClick={() => bump(qid, -10)}
                  className="w-8 h-8 rounded-full border border-ink/15 hover:border-cobalt text-ink/60"
                  aria-label="less conviction"
                >
                  −
                </button>
                <span className="font-display text-lg w-10 text-center">
                  {stakes[qid] ?? 0}
                </span>
                <button
                  onClick={() => bump(qid, 10)}
                  className="w-8 h-8 rounded-full border border-ink/15 hover:border-cobalt text-ink/60"
                  aria-label="more conviction"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {err && <p className="text-sm text-red-600 mt-4">Couldn&apos;t lock: {err}</p>}

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={lock}
          disabled={!canLock}
          className={`rounded-full text-sm px-6 py-2.5 transition ${
            canLock
              ? "bg-cobalt text-white hover:bg-cobalt/90"
              : "bg-ink/10 text-ink/40 cursor-not-allowed"
          }`}
        >
          {busy ? "Locking…" : "Lock my read"}
        </button>
        {!canLock && !busy && (
          <span className="text-sm text-ink/45">
            {!allPicked
              ? "Pick an option for each question"
              : remaining > 0
              ? `Allocate ${remaining} more point${remaining === 1 ? "" : "s"}`
              : ""}
          </span>
        )}
      </div>

      <p className="text-xs text-ink/40 mt-6">
        Once you lock, you can&apos;t change your read — and only then do you see
        where the room landed.
      </p>
    </div>
  );
}

