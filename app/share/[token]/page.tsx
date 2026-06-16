import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type ShareLink = {
  id: number;
  content_id: number;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
};
type Item = {
  id: number;
  format: string;
  tier: string;
  title: string;
  body: string | null;
};

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-xl mx-auto text-center py-16">
      <p className="text-[11px] uppercase tracking-[0.3em] text-ink/40 mb-4">
        Mikata gift link
      </p>
      <p className="text-ink/55">{children}</p>
    </div>
  );
}

export default async function Share({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sb = getSupabase();

  const { data: linkData } = await sb
    .from("share_links")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  const link = linkData as ShareLink | null;

  if (!link) {
    return <Notice>This link isn&apos;t valid.</Notice>;
  }

  const expired = link.expires_at != null && new Date(link.expires_at) < new Date();
  const overCap =
    link.max_views != null && link.view_count >= link.max_views;
  if (expired || overCap) {
    return (
      <Notice>
        This gift link has {expired ? "expired" : "reached its view limit"}. Ask
        the member who shared it for a fresh one.
      </Notice>
    );
  }

  const { data: itemData } = await sb
    .from("content_items")
    .select("*")
    .eq("id", link.content_id)
    .maybeSingle();
  const item = itemData as Item | null;

  if (!item) {
    return <Notice>The shared piece could not be found.</Notice>;
  }

  // Count this view.
  await sb
    .from("share_links")
    .update({ view_count: link.view_count + 1 })
    .eq("id", link.id);

  return (
    <article className="max-w-2xl mx-auto">
      {/* Watermark / context banner */}
      <div className="rounded-2xl bg-cobalt/5 ring-1 ring-cobalt/15 px-5 py-3 mb-8 text-sm text-cobalt/90">
        Shared with you via <span className="font-medium">Mikata</span>, a private
        members&apos; platform. This is a single gifted piece — confidential,
        please don&apos;t forward.
      </div>

      <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40 mb-3">
        {item.tier} · {item.format}
      </p>
      <h1 className="font-display text-4xl leading-tight mb-6">{item.title}</h1>
      <div className="text-[17px] leading-relaxed text-ink/80 whitespace-pre-line">
        {item.body}
      </div>

      <p className="text-xs text-ink/35 mt-10 border-t border-ink/10 pt-5">
        View {link.view_count + 1} of {link.max_views}. This link expires and is
        tracked. Mikata is operated by Vitruvian Partners Investor Relations.
      </p>
    </article>
  );
}

