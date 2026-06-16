import { getCurrentMember } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import YomiPlay from "@/components/YomiPlay";
import ResolvePanel from "@/components/ResolvePanel";

export const dynamic = "force-dynamic";

type Round = { id: number; season: string; number: number; status: string };
type Question = {
  id: number;
  prompt: string;
  options: string[];
  outcome: string | null;
};
type Submission = {
  member_id: number;
  picks: Record<string, string> | null;
  stakes: Record<string, number> | null;
  score: number | null;
};

export default async function Yomi() {
  const me = await getCurrentMember();
  const sb = getSupabase();

  const { data: roundData } = await sb
    .from("yomi_rounds")
    .select("*")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  const round = roundData as Round | null;

  if (!round) {
    return <p className="text-ink/55">No Yomi round is open right now.</p>;
  }

  const header = (
    <div className="mb-8">
      <p className="text-[11px] uppercase tracking-[0.3em] text-cobalt mb-3">
        The Yomi · Season {round.season}, Round {round.number}
      </p>
      <h1 className="font-display text-4xl leading-tight mb-3">Read the room.</h1>
      <p className="text-ink/55 max-w-xl">
        Spread 100 points of conviction across the questions, lock your call,
        and only then see where you stand against everyone else.
      </p>
    </div>
  );

  const isMember = me && me.role !== "prospect";
  const isEditor = me && (me.role === "editor" || me.role === "admin");

  if (!isMember) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-ink/10 p-8 max-w-xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-cobalt mb-3">
          Members only
        </p>
        <h1 className="font-display text-2xl mb-3">The Yomi is for members</h1>
        <p className="text-ink/55">
          You&apos;re viewing as a{" "}
          <span className="text-ink/80 font-medium">{me?.role ?? "guest"}</span>.
          Switch to a member (e.g. Eleanor) using the control top right to play.
        </p>
      </div>
    );
  }

  const { data: qData } = await sb
    .from("yomi_questions")
    .select("*")
    .eq("round_id", round.id)
    .order("id");
  const questions = (qData as Question[]) ?? [];

  const { data: sData } = await sb
    .from("yomi_submissions")
    .select("member_id,picks,stakes,score")
    .eq("round_id", round.id);
  const subs = (sData as Submission[]) ?? [];
  const mySub = subs.find((s) => s.member_id === me!.id);

  function distribution(qid: number) {
    const counts: Record<string, number> = {};
    let total = 0;
    for (const s of subs) {
      const pick = s.picks?.[String(qid)];
      if (pick) {
        counts[pick] = (counts[pick] || 0) + 1;
        total += 1;
      }
    }
    const top =
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { counts, total, top };
  }

  // ============================================================
  //  RESOLVED — results, track record, leaderboard
  // ============================================================
  if (round.status === "resolved") {
    // Cumulative leaderboard across all scored rounds.
    const { data: scored } = await sb
      .from("yomi_submissions")
      .select("member_id,score")
      .not("score", "is", null);
    const { data: profs } = await sb
      .from("profiles")
      .select("id,yomi_handle");
    const handles = new Map(
      (profs ?? []).map((p: { id: number; yomi_handle: string | null }) => [
        p.id,
        p.yomi_handle,
      ])
    );
    const totals = new Map<number, number>();
    for (const s of scored ?? []) {
      totals.set(
        s.member_id,
        (totals.get(s.member_id) ?? 0) + (s.score ?? 0)
      );
    }
    const board = [...totals.entries()]
      .map(([member_id, total]) => ({
        member_id,
        handle: handles.get(member_id) ?? "—",
        total,
      }))
      .sort((a, b) => b.total - a.total);
    const myRank = board.findIndex((b) => b.member_id === me!.id) + 1;

    // Personal track record for this round.
    let correct = 0,
      answered = 0,
      contrarianRight = 0;
    if (mySub) {
      for (const q of questions) {
        const pick = mySub.picks?.[String(q.id)];
        if (pick == null) continue;
        answered += 1;
        const isCorrect = pick === q.outcome;
        if (isCorrect) correct += 1;
        const { top } = distribution(q.id);
        if (pick !== top && isCorrect) contrarianRight += 1;
      }
    }
    const hitRate = answered ? Math.round((correct / answered) * 100) : 0;
    const myTotal = totals.get(me!.id) ?? 0;

    return (
      <>
        {header}
        <div className="mb-6 inline-flex items-center gap-2 text-sm text-cobalt bg-cobalt/5 rounded-full px-4 py-1.5">
          Round resolved · the results are in
        </div>

        {/* Outcomes */}
        <div className="space-y-3 max-w-2xl mb-10">
          {questions.map((q) => {
            const myPick = mySub?.picks?.[String(q.id)];
            const right = myPick != null && myPick === q.outcome;
            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl ring-1 ring-ink/10 p-5"
              >
                <p className="font-display text-base mb-1">{q.prompt}</p>
                <p className="text-sm text-ink/55">
                  Outcome:{" "}
                  <span className="text-ink/80 font-medium">{q.outcome}</span>
                  {myPick != null && (
                    <span
                      className={`ml-2 text-[11px] uppercase tracking-wider rounded px-2 py-0.5 ${
                        right
                          ? "text-cobalt bg-cobalt/5"
                          : "text-amber-700 bg-amber-50"
                      }`}
                    >
                      you said {myPick} · {right ? "right" : "wrong"}
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>

        {/* Track record */}
        {mySub && (
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-xl mb-4">Your track record</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl ring-1 ring-ink/10 p-5">
                <p className="font-display text-3xl">
                  {myTotal > 0 ? "+" : ""}
                  {myTotal}
                </p>
                <p className="text-xs text-ink/50 mt-1">Yomi rating</p>
              </div>
              <div className="bg-white rounded-2xl ring-1 ring-ink/10 p-5">
                <p className="font-display text-3xl">{hitRate}%</p>
                <p className="text-xs text-ink/50 mt-1">Hit rate</p>
              </div>
              <div className="bg-white rounded-2xl ring-1 ring-ink/10 p-5">
                <p className="font-display text-3xl">{contrarianRight}</p>
                <p className="text-xs text-ink/50 mt-1">Contrarian &amp; right</p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="max-w-2xl">
          <h2 className="font-display text-xl mb-1">The leaderboard</h2>
          <p className="text-sm text-ink/45 mb-4">
            By handle only — identities are revealed at the annual dinner.
            {myRank > 0 && (
              <>
                {" "}
                You&apos;re <span className="text-cobalt">#{myRank}</span>.
              </>
            )}
          </p>
          <div className="bg-white rounded-2xl ring-1 ring-ink/10 overflow-hidden">
            {board.map((row, i) => {
              const mine = row.member_id === me!.id;
              return (
                <div
                  key={row.member_id}
                  className={`flex items-center justify-between px-5 py-3 text-sm ${
                    i > 0 ? "border-t border-ink/10" : ""
                  } ${mine ? "bg-cobalt/5" : ""}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-5 text-ink/40">{i + 1}</span>
                    <span
                      className={mine ? "text-cobalt font-medium" : "text-ink/75"}
                    >
                      {row.handle}
                      {mine && " (you)"}
                    </span>
                  </span>
                  <span className="font-display">
                    {row.total > 0 ? "+" : ""}
                    {row.total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  // ============================================================
  //  NOT RESOLVED
  // ============================================================
  // Editors resolve; they don't play.
  if (isEditor) {
    return (
      <>
        {header}
        <ResolvePanel
          roundId={round.id}
          questions={questions}
          submissionCount={subs.length}
        />
      </>
    );
  }

  // Member hasn't locked → play.
  if (!mySub) {
    return (
      <>
        {header}
        <YomiPlay roundId={round.id} questions={questions} memberId={me!.id} />
      </>
    );
  }

  // Member locked → blind reveal.
  return (
    <>
      {header}
      <div className="mb-6 inline-flex items-center gap-2 text-sm text-cobalt bg-cobalt/5 rounded-full px-4 py-1.5">
        Locked · here&apos;s how you read the room
      </div>
      <div className="space-y-6 max-w-2xl">
        {questions.map((q) => {
          const myPick = mySub!.picks?.[String(q.id)];
          const myStake = mySub!.stakes?.[String(q.id)];
          const { counts, total, top } = distribution(q.id);
          const contrarian = myPick != null && myPick !== top;
          return (
            <div key={q.id} className="bg-white rounded-2xl ring-1 ring-ink/10 p-6">
              <p className="font-display text-lg mb-2">{q.prompt}</p>
              <p className="text-sm text-ink/55 mb-4">
                Your call:{" "}
                <span className="text-ink/80 font-medium">{myPick}</span> ·{" "}
                {myStake} pts
                {contrarian ? (
                  <span className="ml-2 text-[11px] uppercase tracking-wider text-amber-700 bg-amber-50 rounded px-2 py-0.5">
                    Contrarian
                  </span>
                ) : (
                  <span className="ml-2 text-[11px] uppercase tracking-wider text-ink/45 bg-ink/5 rounded px-2 py-0.5">
                    With the room
                  </span>
                )}
              </p>
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const c = counts[opt] || 0;
                  const pct = total ? Math.round((c / total) * 100) : 0;
                  const mine = opt === myPick;
                  return (
                    <div key={opt}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={mine ? "text-cobalt font-medium" : "text-ink/60"}>
                          {opt}
                          {mine && " ← you"}
                        </span>
                        <span className="text-ink/45">{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-ink/10 overflow-hidden">
                        <div
                          className={`h-full ${mine ? "bg-cobalt" : "bg-ink/25"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-ink/40 mt-6">
        The room: {subs.length}{" "}
        {subs.length === 1 ? "member has" : "members have"} locked. An editor sets
        the outcomes to score the round and reveal the leaderboard.
      </p>
    </>
  );
}

