import Link from "next/link";
import CommentComposer from "./CommentComposer";
import HideButton from "./HideButton";

export type Comment = {
  id: number;
  content_id: number | null;
  parent_id: number | null;
  member_id: number;
  body: string;
  hidden: boolean;
  created_at: string;
};

function when(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function Row({
  c,
  handle,
  isEditor,
}: {
  c: Comment;
  handle: string;
  isEditor: boolean;
}) {
  return (
    <div className={c.hidden ? "opacity-50" : ""}>
      <div className="flex items-center gap-2 text-xs text-ink/45 mb-1">
        <span className="text-cobalt font-medium">{handle}</span>
        <span>·</span>
        <span>{when(c.created_at)}</span>
        {c.hidden && (
          <span className="ml-1 rounded-full bg-ink/10 px-2 py-0.5 text-ink/50">
            hidden
          </span>
        )}
        {isEditor && (
          <span className="ml-auto">
            <HideButton id={c.id} hidden={c.hidden} />
          </span>
        )}
      </div>
      <p className="text-[15px] leading-relaxed text-ink/80 whitespace-pre-line">
        {c.body}
      </p>
    </div>
  );
}

export default function Thread({
  post,
  replies,
  handles,
  viewerId,
  canPost,
  isEditor,
  pieceTitle,
}: {
  post: Comment;
  replies: Comment[];
  handles: Record<number, string>;
  viewerId: number | null;
  canPost: boolean;
  isEditor: boolean;
  pieceTitle?: string | null;
}) {
  const h = (id: number) => handles[id] ?? "Member";

  return (
    <div className="bg-white rounded-2xl ring-1 ring-ink/10 p-5">
      {pieceTitle && post.content_id != null && (
        <Link
          href={`/library/${post.content_id}`}
          className="inline-block mb-3 text-[11px] uppercase tracking-[0.15em] text-cobalt/80 hover:text-cobalt"
        >
          Re: {pieceTitle}
        </Link>
      )}

      <Row c={post} handle={h(post.member_id)} isEditor={isEditor} />

      {replies.length > 0 && (
        <div className="mt-4 pl-4 border-l-2 border-ink/10 space-y-4">
          {replies.map((r) => (
            <Row key={r.id} c={r} handle={h(r.member_id)} isEditor={isEditor} />
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-ink/8">
        <CommentComposer
          memberId={viewerId}
          parentId={post.id}
          contentId={post.content_id}
          canPost={canPost}
          placeholder="Reply to the room…"
          cta="Reply"
          compact
        />
      </div>
    </div>
  );
}

