import { getCurrentMember } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import YomiPlay from "@/components/YomiPlay";

export const dynamic = "force-dynamic";

type Round = {
  id: number;
  season: string;
  number: number;
  status: string;
};
type Question = { id: number; prompt: string; options: string[] };
type Submission = {
  member_id: number;
  picks: Record<string, string> | null;
  stakes: Record<string, number> | null;
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

  const header = round ? (
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
  ) : null;

  if (!round) {
    return <p className="text-ink/55">No Yomi round is open right now.</p>;
  }

  // Members only.
  const isMember = me && me.role !== "prospect";
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
    .select("member_id,picks,stakes")
    .eq("round_id", round.id);
  const subs = (sData as Submission[]) ?? [];
  const mySub = subs.find((s) => s.member_id === me!.id);

  // Not locked yet → play.
  if (!mySub) {
    return (
      <>
        {header}
        <YomiPlay roundId={round.id} questions={questions} memberId={me!.id} />
      </>
    );
  }

  // Locked → blind reveal: your call vs the room, per question.
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
        {subs.length === 1 ? "member has" : "members have"} locked. Scoring and
        the leaderboard arrive in Session 5, once the outcomes are set.
      </p>
    </>
  );
}

