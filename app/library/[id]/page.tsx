import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { visibleVisibilities } from "@/lib/visibility";
import SaveButton from "@/components/SaveButton";
import RatingBlock from "@/components/RatingBlock";

export const dynamic = "force-dynamic";

type Item = {
  id: number;
  format: string;
  tier: string;
  title: string;
  body: string | null;
  visibility: string;
  author_id: number | null;
};

type Rating = {
  utility: number | null;
  enjoyment: number | null;
  member_id: number;
};

function average(vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v != null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

export default async function ContentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getCurrentMember();
  const sb = getSupabase();

  const { data } = await sb
    .from("content_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const item = data as Item | null;

  const back = (
    <Link
      href="/library"
      className="text-sm text-cobalt hover:underline inline-block mb-8"
    >
      ← Back to the Library
    </Link>
  );

  if (!item) {
    return (
      <>
        {back}
        <p className="text-ink/55">That piece doesn&apos;t exist.</p>
      </>
    );
  }

  // Gate: can this viewer see this piece?
  const allowed = visibleVisibilities(me?.role ?? null);
  if (!allowed.includes(item.visibility)) {
    return (
      <>
        {back}
        <div className="bg-white rounded-2xl ring-1 ring-ink/10 p-8 max-w-xl">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cobalt mb-3">
            Members only
          </p>
          <h1 className="font-display text-2xl mb-3">{item.title}</h1>
          <p className="text-ink/55">
            This piece is reserved for members. You&apos;re viewing as a{" "}
            <span className="text-ink/80 font-medium">
              {me?.role ?? "guest"}
            </span>
            . Use the switcher, top right, to sign in as a member.
          </p>
        </div>
      </>
    );
  }

  // Is it already saved by the current member?
  let saved = false;
  if (me) {
    const { data: s } = await sb
      .from("saves")
      .select("id")
      .eq("member_id", me.id)
      .eq("content_id", item.id)
      .maybeSingle();
    saved = !!s;
  }

  // Ratings: the room's averages, plus this member's own.
  const { data: rData } = await sb
    .from("ratings")
    .select("utility,enjoyment,member_id")
    .eq("content_id", item.id);
  const ratings = (rData as Rating[]) ?? [];
  const avgUtility = average(ratings.map((r) => r.utility));
  const avgEnjoyment = average(ratings.map((r) => r.enjoyment));
  const mine = me ? ratings.find((r) => r.member_id === me.id) : undefined;

  return (
    <>
      {back}
      <article className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40 mb-3">
          {item.tier} · {item.format}
        </p>
        <h1 className="font-display text-4xl leading-tight mb-6">
          {item.title}
        </h1>

        <div className="text-[17px] leading-relaxed text-ink/80 whitespace-pre-line mb-8">
          {item.body}
        </div>

        <div className="flex items-center gap-4 border-t border-ink/10 pt-5">
          <SaveButton
            contentId={item.id}
            memberId={me ? me.id : null}
            initialSaved={saved}
          />
          <span className="text-sm text-ink/40">Published by the IR desk</span>
        </div>

        <RatingBlock
          contentId={item.id}
          memberId={me ? me.id : null}
          initialUtility={mine?.utility ?? 0}
          initialEnjoyment={mine?.enjoyment ?? 0}
          avgUtility={avgUtility}
          avgEnjoyment={avgEnjoyment}
          count={ratings.length}
        />
      </article>
    </>
  );
}

