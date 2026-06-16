import { getCurrentMember } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import CommentComposer from "@/components/CommentComposer";
import Thread, { type Comment } from "@/components/Thread";

export const dynamic = "force-dynamic";

export default async function Room() {
  const me = await getCurrentMember();
  const canPost = !!me && me.role !== "prospect";
  const isEditor = !!me && (me.role === "editor" || me.role === "admin");

  if (!me || me.role === "prospect") {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-ink/10 p-8 max-w-xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-cobalt mb-3">
          Members only
        </p>
        <h1 className="font-display text-2xl mb-3">Ask the Room</h1>
        <p className="text-ink/55">
          The Room is where members think out loud together — pseudonymously,
          under their Yomi handles. Switch to a member, top right, to read and
          post.
        </p>
      </div>
    );
  }

  const sb = getSupabase();

  const { data: cData } = await sb
    .from("comments")
    .select("*")
    .order("created_at", { ascending: true });
  let comments = (cData as Comment[]) ?? [];
  if (!isEditor) comments = comments.filter((c) => !c.hidden);

  // Handles (pseudonymous).
  const memberIds = Array.from(new Set(comments.map((c) => c.member_id)));
  const handles: Record<number, string> = {};
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

  // Titles for piece-tagged threads.
  const pieceIds = Array.from(
    new Set(comments.filter((c) => c.content_id != null).map((c) => c.content_id as number))
  );
  const titles: Record<number, string> = {};
  if (pieceIds.length) {
    const { data: tData } = await sb
      .from("content_items")
      .select("id,title")
      .in("id", pieceIds);
    (tData as { id: number; title: string }[] | null)?.forEach((t) => {
      titles[t.id] = t.title;
    });
  }

  const tops = comments
    .filter((c) => c.parent_id == null)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const repliesOf = (id: number) =>
    comments
      .filter((c) => c.parent_id === id)
      .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40 mb-2">
          Ask the Room
        </p>
        <h1 className="font-display text-4xl">The Room</h1>
        <p className="text-ink/55 mt-2">
          Think out loud with the membership. Everyone posts under their Yomi
          handle — candour without exposure.
        </p>
      </div>

      <CommentComposer
        memberId={me.id}
        canPost={canPost}
        placeholder="Start a thread — a question, a read, a provocation…"
        cta="Post to the room"
      />

      <div className="space-y-5">
        {tops.length === 0 ? (
          <p className="text-sm text-ink/40">
            No threads yet. Be the first to open one.
          </p>
        ) : (
          tops.map((post) => (
            <Thread
              key={post.id}
              post={post}
              replies={repliesOf(post.id)}
              handles={handles}
              viewerId={me.id}
              canPost={canPost}
              isEditor={isEditor}
              pieceTitle={
                post.content_id != null ? titles[post.content_id] ?? null : null
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

