import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { visibleVisibilities } from "@/lib/visibility";
import SaveButton from "@/components/SaveButton";
import RatingBlock from "@/components/RatingBlock";
import GiftLink from "@/components/GiftLink";
import CommentComposer from "@/components/CommentComposer";
import Thread, { type Comment } from "@/components/Thread";

export const dynamic = "force-dynamic";

type Item = {
  id: number;
  format: string;
  tier: string;
  title: string;
  body: string | null;
  visibility: string;
  shareable: boolean;
  author_id: number | null;
};

type Rating = {
  utility: number | null;
  enjoyment: number | null;
  member_id: number;
};

type ShareRow = {
  token: string;
  view_count: number;
  max_views: number | null;
  expires_at: string | null;
  content_id: number;
};

function average(vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v != null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

const GIFT_ALLOWANCE = 3;

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

  // Saved?
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

  // Ratings.
  const { data: rData } = await sb
    .from("ratings")
    .select("utility,enjoyment,member_id")
    .eq("content_id", item.id);
  const ratings = (rData as Rating[]) ?? [];
  const avgUtility = average(ratings.map((r) => r.utility));
  const avgEnjoyment = average(ratings.map((r) => r.enjoyment));
  const mine = me ? ratings.find((r) => r.member_id === me.id) : undefined;

  // Gift links — only for shareable pieces, only for members/editors.
  const canGift = !!me && me.role !== "prospect" && item.shareable;
  let giftRemaining = 0;
  let giftExisting: ShareRow[] = [];
  const isEditor = !!me && (me.role === "editor" || me.role === "admin");
  if (canGift) {
    const { data: myLinks } = await sb
      .from("share_links")
      .select("token,view_count,max_views,expires_at,content_id")
      .eq("created_by", me!.id);
    const all = (myLinks as ShareRow[]) ?? [];
    giftRemaining = isEditor ? Infinity : Math.max(0, GIFT_ALLOWANCE - all.length);
    giftExisting = all.filter((l) => l.content_id === item.id);
  }

  // Discussion ("Ask the Room", scoped to this piece).
  const canPost = !!me && me.role !== "prospect";
  const { data: cData } = await sb
    .from("comments")
    .select("*")
    .eq("content_id", item.id)
    .order("created_at", { ascending: true });
  let comments = (cData as Comment[]) ?? [];
  if (!isEditor) comments = comments.filter((c) => !c.hidden);

  const handles: Record<number, string> = {};
  const memberIds = Array.from(new Set(comments.map((c) => c.member_id)));
  if (memberIds.length) {
    const { data: pData } = await sb
      .from("profiles")
      .select("id,yomi_handle,display_name")
      .in("id", memberIds);
    (pData as { id: number; yomi_handle: string | null; display_name: string }[] | null)?.forEach(
      (p) => {
        handles[p.id] = p.yomi_handle ?? p.display_name;
      }
    );
  }
  const tops = comments.filter((c) => c.parent_id == null);
  const repliesOf = (cid: number) =>
    comments.filter((c) => c.parent_id === cid);

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

        {canGift && (
          <GiftLink
            contentId={item.id}
            memberId={me!.id}
            isEditor={isEditor}
            remaining={giftRemaining}
            existing={giftExisting}
          />
        )}

        {/* Discuss */}
        <section className="mt-10">
          <h2 className="font-display text-xl mb-4">Discuss in the Room</h2>
          <div className="mb-5">
            <CommentComposer
              memberId={me ? me.id : null}
              contentId={item.id}
              canPost={canPost}
              placeholder="Pass comment on this piece…"
              cta="Post to the room"
            />
          </div>
          {tops.length === 0 ? (
            <p className="text-sm text-ink/40">
              No comments yet on this piece.
            </p>
          ) : (
            <div className="space-y-5">
              {tops.map((post) => (
                <Thread
                  key={post.id}
                  post={post}
                  replies={repliesOf(post.id)}
                  handles={handles}
                  viewerId={me ? me.id : null}
                  canPost={canPost}
                  isEditor={isEditor}
                />
              ))}
            </div>
          )}
        </section>
      </article>
    </>
  );
}

