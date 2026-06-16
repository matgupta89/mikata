"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type Question = {
  id: number;
  prompt: string;
  options: string[];
  outcome: string | null;
};

export default function ResolvePanel({
  roundId,
  questions,
  submissionCount,
}: {
  roundId: number;
  questions: Question[];
  submissionCount: number;
}) {
  const router = useRouter();
  const [outcomes, setOutcomes] = useState<Record<number, string>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, q.outcome ?? ""]))
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const allSet = questions.every((q) => outcomes[q.id]);

  async function resolve() {
    if (!allSet) return;
    setBusy(true);
    setErr(null);
    try {
      const sb = getSupabase();

      // 1. Record each question's outcome.
      for (const q of questions) {
        const { error } = await sb
          .from("yomi_questions")
          .update({ outcome: outcomes[q.id] })
          .eq("id", q.id);
        if (error) throw new Error(error.message);
      }

      // 2. Score every locked read: you win your conviction on calls you got
      //    right and lose it on calls you got wrong.
      const { data: subs, error: e2 } = await sb
        .from("yomi_submissions")
        .select("id,picks,stakes")
        .eq("round_id", roundId);
      if (e2) throw new Error(e2.message);

      for (const s of subs ?? []) {
        const picks = (s.picks as Record<string, string> | null) ?? {};
        const stakes = (s.stakes as Record<string, number> | null) ?? {};
        let score = 0;
        for (const q of questions) {
          const pick = picks[String(q.id)];
          const stake = stakes[String(q.id)] ?? 0;
          if (pick != null) score += pick === outcomes[q.id] ? stake : -stake;
        }
        const { error } = await sb
          .from("yomi_submissions")
          .update({ score })
          .eq("id", s.id);
        if (error) throw new Error(error.message);
      }

      // 3. Close the round.
      const { error: e3 } = await sb
        .from("yomi_rounds")
        .update({ status: "resolved" })
        .eq("id", roundId);
      if (e3) throw new Error(e3.message);

      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 inline-flex items-center gap-2 text-sm text-cobalt bg-cobalt/5 rounded-full px-4 py-1.5">
        Editor · resolve this round
      </div>

      <p className="text-ink/55 mb-6">
        Set the real outcome for each question, then score the round.{" "}
        {submissionCount} {submissionCount === 1 ? "member has" : "members have"}{" "}
        locked a read.
      </p>

      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="bg-white rounded-2xl ring-1 ring-ink/10 p-6">
            <p className="font-display text-lg mb-3">{q.prompt}</p>
            <select
              value={outcomes[q.id] ?? ""}
              onChange={(e) =>
                setOutcomes((o) => ({ ...o, [q.id]: e.target.value }))
              }
              className="w-full rounded-xl border border-ink/15 px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-cobalt focus:ring-1 focus:ring-cobalt"
            >
              <option value="">— what actually happened? —</option>
              {q.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {err && <p className="text-sm text-red-600 mt-4">Couldn&apos;t resolve: {err}</p>}

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={resolve}
          disabled={!allSet || busy}
          className={`rounded-full text-sm px-6 py-2.5 transition ${
            allSet && !busy
              ? "bg-cobalt text-white hover:bg-cobalt/90"
              : "bg-ink/10 text-ink/40 cursor-not-allowed"
          }`}
        >
          {busy ? "Scoring…" : "Resolve & score the round"}
        </button>
        {!allSet && (
          <span className="text-sm text-ink/45">Set every outcome first</span>
        )}
      </div>

      <p className="text-xs text-ink/40 mt-6">
        This scores everyone and reshuffles the leaderboard. It can&apos;t be
        undone from here (re-run the seed to reset for testing).
      </p>
    </div>
  );
}

