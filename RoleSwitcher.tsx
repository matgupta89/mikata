import { getCurrentMember } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

// Render on every request so it always reflects who you're signed in as.
export const dynamic = "force-dynamic";

type Content = {
  id: number;
  format: string;
  tier: string;
  title: string;
  body: string | null;
};

const PILLARS: [string, string, string][] = [
  [
    "The Library",
    "Curated writing in recurring formats, browsed by format — not a feed.",
    "Session 2",
  ],
  [
    "The Yomi",
    "A quarterly forecasting game. Allocate conviction, lock, see the room.",
    "Session 4",
  ],
  [
    "Invitations",
    "Events, calls, and fund opportunities, surfaced to the right members.",
    "Session 6",
  ],
];

export default async function Home() {
  const me = await getCurrentMember();

  const sb = getSupabase();
  const { data } = await sb
    .from("content_items")
    .select("*")
    .eq("is_canon", true)
    .order("published_at", { ascending: false });
  const canon = (data as Content[]) ?? [];

  return (
    <>
      {!me ? (
        // Signed-out invitation
        <div className="text-center py-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-cobalt mb-5">
            By invitation
          </p>
          <h1 className="font-display text-4xl sm:text-5xl leading-tight mb-5">
            A closed room for a
            <br />
            small, considered membership.
          </h1>
          <p className="text-ink/55 max-w-xl mx-auto mb-8">
            Curated writing, a quarterly forecasting game, and invitations — for
            Vitruvian Partners&apos; members. Use the switcher, top right, to step
            in as any role and see the experience change.
          </p>
        </div>
      ) : (
        // Signed-in hero
        <div className="mb-12">
          <p className="text-[11px] uppercase tracking-[0.3em] text-cobalt mb-3">
            Welcome back
          </p>
          <h1 className="font-display text-4xl sm:text-5xl leading-tight">
            {me.display_name.split(" ")[0]}.
          </h1>
          <p className="text-ink/55 mt-3 max-w-xl">
            You&apos;re viewing Mikata as a{" "}
            <span className="text-ink/80 font-medium">{me.role}</span>. What you
            can see and do changes with your role.
          </p>
        </div>
      )}

      {/* Start here canon — visible to everyone, including prospects */}
      {canon.length > 0 && (
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-display text-xl">Start here</h2>
            <span className="h-px flex-1 bg-ink/10" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {canon.map((item) => (
              <article
                key={item.id}
                className="bg-white rounded-2xl ring-1 ring-ink/10 p-6 hover:ring-cobalt/40 transition"
              >
                <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40 mb-2">
                  {item.tier} · {item.format}
                </p>
                <h3 className="font-display text-lg leading-snug mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-ink/55 leading-relaxed">
                  {(item.body ?? "").slice(0, 140)}…
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* The three pillars from the Scope of Works */}
      <section className="mb-6">
        <div className="flex items-center gap-3 mb-5">
          <h2 className="font-display text-xl">What Mikata does</h2>
          <span className="h-px flex-1 bg-ink/10" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {PILLARS.map(([name, desc, when]) => (
            <div
              key={name}
              className="rounded-2xl ring-1 ring-ink/10 p-6 bg-paper"
            >
              <h3 className="font-display text-lg mb-2">{name}</h3>
              <p className="text-sm text-ink/55 leading-relaxed mb-4">{desc}</p>
              <span className="text-[11px] uppercase tracking-[0.18em] text-cobalt/70">
                Arrives in {when}
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-[12px] text-ink/35 mt-12">
        Session 1 of 10 · Foundation &amp; shell is live.
      </p>
    </>
  );
}
