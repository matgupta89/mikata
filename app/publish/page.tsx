import { getCurrentMember } from "@/lib/auth";
import PublishForm from "@/components/PublishForm";

export const dynamic = "force-dynamic";

export default async function Publish() {
  const me = await getCurrentMember();
  const isEditor = me && (me.role === "editor" || me.role === "admin");

  if (!isEditor) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-ink/10 p-8 max-w-xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-cobalt mb-3">
          Editors only
        </p>
        <h1 className="font-display text-2xl mb-3">Publishing is for the desk</h1>
        <p className="text-ink/55">
          You&apos;re viewing as a{" "}
          <span className="text-ink/80 font-medium">{me?.role ?? "guest"}</span>.
          Switch to <span className="text-ink/80 font-medium">IR Desk</span>{" "}
          (editor) using the control top right to publish a piece.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.3em] text-cobalt mb-3">
          The desk
        </p>
        <h1 className="font-display text-4xl leading-tight mb-3">
          Publish a piece.
        </h1>
        <p className="text-ink/55 max-w-xl">
          Write it, choose who sees it, and publish — it appears in the Library
          straight away. No code, no developer.
        </p>
      </div>
      <PublishForm authorId={me.id} />
    </>
  );
}

