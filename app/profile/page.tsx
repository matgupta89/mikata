import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Content = { id: number; title: string; tier: string; format: string };
type Inv = { id: number; title: string; type: string };
type Fund = { id: number; name: string; status: string };
type Q = { id: number; round_id: number; outcome: string | null };
type Sub = {
  member_id: number;
  round_id: number;
  picks: Record<string, string> | null;
  score: number | null;
};

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl ring-1 ring-ink/10 p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-xl">{title}</h2>
        {count != null && (
          <span className="text-xs text-ink/40">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-ink/40">{text}</p>;
}

export default async function Profile() {
  const me = await getCurrentMember();

  if (!me) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-ink/10 p-8 max-w-xl">
        <h1 className="font-display text-2xl mb-3">Your Mikata</h1>
        <p className="text-ink/55">
          Sign in as a member using the switcher, top right, to see your saves,
          ratings, RSVPs and Yomi record.
        </p>
      </div>
    );
  }

  const sb = getSupabase();

  // Saves + ratings (both reference content_items).
  const { data: saveRows } = await sb
    .from("saves")
    .select("content_id")
    .eq("member_id", me.id);
  const saveIds = (saveRows ?? []).map((r) => r.content_id as number);

  const { data: ratingRows } = await sb
    .from("ratings")
    .select("content_id,utility,enjoyment")
    .eq("member_id", me.id);
  const ratings =
    (ratingRows as { content_id: number; utility: number | null; enjoyment: number | null }[]) ??
    [];

  const contentIds = Array.from(
    new Set([...saveIds, ...ratings.map((r) => r.content_id)])
  );
  const contentMap = new Map<number, Content>();
  if (contentIds.length) {
    const { data } = await sb
      .from("content_items")
      .select("id,title,tier,format")
      .in("id", contentIds);
    (data as Content[] | null)?.forEach((c) => contentMap.set(c.id, c));
  }

  // RSVPs.
  const { data: rsvpRows } = await sb
    .from("rsvps")
    .select("invitation_id,status")
    .eq("member_id", me.id);
  const rsvps =
    (rsvpRows as { invitation_id: number; status: string }[]) ?? [];
  const invMap = new Map<number, Inv>();
  if (rsvps.length) {
    const { data } = await sb
      .from("invitations")
      .select("id,title,type")
      .in("id", rsvps.map((r) => r.invitation_id));
    (data as Inv[] | null)?.forEach((i) => invMap.set(i.id, i));
  }

  // Fund interest.
  const { data: interestRows } = await sb
    .from("interest_registrations")
    .select("opportunity_id,ir_status,created_at")
    .eq("member_id", me.id);
  const interests =
    (interestRows as {
      opportunity_id: number;
      ir_status: string;
      created_at: string | null;
    }[]) ?? [];
  const fundMap = new Map<number, Fund>();
  if (interests.length) {
    const { data } = await sb
      .from("fund_opportunities")
      .select("id,name,status")
      .in("id", interests.map((r) => r.opportunity_id));
    (data as Fund[] | null)?.forEach((f) => fundMap.set(f.id, f));
  }

  // Gift links created.
  const { data: linkRows } = await sb
    .from("share_links")
    .select("view_count")
    .eq("created_by", me.id);
  const giftCount = (linkRows ?? []).length;
  const giftViews = (linkRows ?? []).reduce(
    (a, r) => a + ((r.view_count as number) || 0),
    0
  );

  // Yomi record.
  const { data: mySubRows } = await sb
    .from("yomi_submissions")
    .select("member_id,round_id,picks,score")
    .eq("member_id", me.id);
  const mySubs = (mySubRows as Sub[]) ?? [];
  const myRounds = Array.from(new Set(mySubs.map((s) => s.round_id)));

  let questions: Q[] = [];
  let allSubs: Sub[] = [];
  if (myRounds.length) {
    const { data: qRows } = await sb
      .from("yomi_questions")
      .select("id,round_id,outcome")
      .in("round_id", myRounds);
    questions = (qRows as Q[]) ?? [];
    const { data: aRows } = await sb
      .from("yomi_submissions")
      .select("member_id,round_id,picks,score")
      .in("round_id", myRounds);
    allSubs = (aRows as Sub[]) ?? [];
  }

  const resolvedQs = questions.filter((q) => q.outcome != null);
  let answered = 0;
  let correct = 0;
  let contrarianRight = 0;
  for (const q of resolvedQs) {
    const mine = mySubs.find((s) => s.round_id === q.round_id);
    const myPick = mine?.picks?.[String(q.id)];
    if (myPick == null) continue;
    answered++;
    if (myPick === q.outcome) {
      correct++;
      const peers = allSubs.filter(
        (s) => s.round_id === q.round_id && s.picks?.[String(q.id)] != null
      );
      const pickedOutcome = peers.filter(
        (s) => s.picks?.[String(q.id)] === q.outcome
      ).length;
      if (peers.length > 0 && pickedOutcome / peers.length < 0.5)
        contrarianRight++;
    }
  }
  const totalPoints = mySubs.reduce((a, s) => a + (s.score || 0), 0);
  const hitRate = answered ? Math.round((correct / answered) * 100) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40 mb-2">
          Your Mikata
        </p>
        <h1 className="font-display text-4xl">{me.display_name}</h1>
        <p className="text-ink/55 mt-2">
          {me.yomi_handle && (
            <>
              Yomi handle{" "}
              <span className="text-cobalt font-medium">{me.yomi_handle}</span>{" "}
              ·{" "}
            </>
          )}
          <span className="capitalize">{me.role}</span> · {me.status}
        </p>
      </div>

      {/* Yomi record band */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { k: "Rounds played", v: myRounds.length },
          { k: "Points", v: Math.round(totalPoints) },
          { k: "Hit rate", v: hitRate == null ? "—" : `${hitRate}%` },
          { k: "Contrarian & right", v: contrarianRight },
        ].map((s) => (
          <div
            key={s.k}
            className="bg-white rounded-2xl ring-1 ring-ink/10 px-4 py-5 text-center"
          >
            <div className="font-display text-2xl text-cobalt">{s.v}</div>
            <div className="text-[11px] uppercase tracking-[0.15em] text-ink/40 mt-1">
              {s.k}
            </div>
          </div>
        ))}
      </div>

      {/* Saves */}
      <Section title="Saved" count={saveIds.length}>
        {saveIds.length === 0 ? (
          <Empty text="Nothing saved yet. Tap Save on any piece in the Library." />
        ) : (
          <ul className="divide-y divide-ink/8">
            {saveIds.map((id) => {
              const c = contentMap.get(id);
              if (!c) return null;
              return (
                <li key={id} className="py-3">
                  <Link
                    href={`/library/${id}`}
                    className="hover:text-cobalt transition"
                  >
                    <span className="text-[11px] uppercase tracking-[0.15em] text-ink/40 mr-2">
                      {c.tier}
                    </span>
                    {c.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Ratings */}
      <Section title="Rated" count={ratings.length}>
        {ratings.length === 0 ? (
          <Empty text="You haven't rated anything yet." />
        ) : (
          <ul className="divide-y divide-ink/8">
            {ratings.map((r) => {
              const c = contentMap.get(r.content_id);
              if (!c) return null;
              return (
                <li
                  key={r.content_id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <Link
                    href={`/library/${r.content_id}`}
                    className="hover:text-cobalt transition truncate"
                  >
                    {c.title}
                  </Link>
                  <span className="text-xs text-ink/45 shrink-0">
                    Useful {r.utility ?? "–"} · Enjoyable {r.enjoyment ?? "–"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* RSVPs */}
      <Section title="Invitations" count={rsvps.length}>
        {rsvps.length === 0 ? (
          <Empty text="No RSVPs yet. See what's on under Invitations." />
        ) : (
          <ul className="divide-y divide-ink/8">
            {rsvps.map((r) => {
              const inv = invMap.get(r.invitation_id);
              if (!inv) return null;
              return (
                <li
                  key={r.invitation_id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <span className="truncate">
                    <span className="text-[11px] uppercase tracking-[0.15em] text-ink/40 mr-2">
                      {inv.type}
                    </span>
                    {inv.title}
                  </span>
                  <span
                    className={`text-xs shrink-0 capitalize ${
                      r.status === "waitlist" ? "text-ink/45" : "text-cobalt"
                    }`}
                  >
                    {r.status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Fund interest */}
      <Section title="Fund interest" count={interests.length}>
        {interests.length === 0 ? (
          <Empty text="You haven't registered interest in any opportunity." />
        ) : (
          <ul className="divide-y divide-ink/8">
            {interests.map((r) => {
              const f = fundMap.get(r.opportunity_id);
              if (!f) return null;
              return (
                <li
                  key={r.opportunity_id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <span className="truncate">{f.name}</span>
                  <span className="text-xs text-ink/45 shrink-0 capitalize">
                    IR: {r.ir_status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Gift links */}
      <Section title="Gift links">
        {giftCount === 0 ? (
          <Empty text="You haven't gifted any pieces yet." />
        ) : (
          <p className="text-sm text-ink/60">
            You&apos;ve created{" "}
            <span className="text-ink font-medium">{giftCount}</span> gift{" "}
            {giftCount === 1 ? "link" : "links"}, viewed{" "}
            <span className="text-ink font-medium">{giftViews}</span>{" "}
            {giftViews === 1 ? "time" : "times"} in total.
          </p>
        )}
      </Section>
    </div>
  );
}

