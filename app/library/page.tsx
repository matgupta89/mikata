import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { visibleVisibilities } from "@/lib/visibility";

export const dynamic = "force-dynamic";

type Item = {
  id: number;
  format: string;
  tier: string;
  title: string;
  body: string | null;
  visibility: string;
};

const TIERS = ["Signal", "Belonging", "Reference"] as const;
const TIER_BLURB: Record<string, string> = {
  Signal: "Sharp, current reads.",
  Belonging: "Essays and conversations from the room.",
  Reference: "The things worth keeping.",
};

export default async function Library() {
  const me = await getCurrentMember();
  const allowed = visibleVisibilities(me?.role ?? null);

  const sb = getSupabase();
  const { data } = await sb
    .from("content_items")
    .select("*")
    .in("visibility", allowed)
    .order("published_at", { ascending: false });
  const items = (data as Item[]) ?? [];

  // How many pieces are hidden from this viewer, to hint at what membership unlocks.
  const { count: totalCount } = await sb
    .from("content_items")
    .select("*", { count: "exact", head: true });
  const hidden = (totalCount ?? items.length) - items.length;

  return (
    <>
      <div className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.3em] text-cobalt mb-3">
          The Library
        </p>
        <h1 className="font-display text-4xl leading-tight mb-3">
          Browse by format.
        </h1>
        <p className="text-ink/55 max-w-xl">
          Not a feed — a shelf. Pieces are grouped by the tier they belong to.
          {hidden > 0 && (
            <>
              {" "}
              <span className="text-ink/70">
                {hidden} more {hidden === 1 ? "piece is" : "pieces are"} reserved
                for members
              </span>{" "}
              — switch roles, top right, to see the difference.
            </>
          )}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-ink/50">
          Nothing here for your role yet. Sign in as a member to see more.
        </p>
      ) : (
        TIERS.map((tier) => {
          const inTier = items.filter((i) => i.tier === tier);
          if (inTier.length === 0) return null;
          return (
            <section key={tier} className="mb-12">
              <div className="flex items-baseline gap-3 mb-5">
                <h2 className="font-display text-xl">{tier}</h2>
                <span className="text-sm text-ink/40">{TIER_BLURB[tier]}</span>
                <span className="h-px flex-1 bg-ink/10" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {inTier.map((item) => (
                  <Link
                    key={item.id}
                    href={`/library/${item.id}`}
                    className="block bg-white rounded-2xl ring-1 ring-ink/10 p-6 hover:ring-cobalt/40 transition"
                  >
                    <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40 mb-2">
                      {item.format}
                    </p>
                    <h3 className="font-display text-lg leading-snug mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-ink/55 leading-relaxed">
                      {(item.body ?? "").slice(0, 130)}…
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}

