import Link from "next/link";
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

const PILLARS: { name: string; desc: string; href: string }[] = [
  {
    name: "The Library",
    desc: "Curated writing in recurring formats — read by format, never a feed.",
    href: "/library",
  },
  {
    name: "The Yomi",
    desc: "A quarterly forecasting game. Allocate conviction, lock your view, then see how the room called it.",
    href: "/yomi",
  },
  {
    name: "Ask the Room",
    desc: "Pseudonymous discussion. Think out loud with the membership, under your handle — candour without exposure.",
    href: "/room",
  },
  {
    name: "Invitations & Funds",
    desc: "Dinners, fireside calls and fund opportunities, surfaced to the members they're meant for.",
    href: "/invitations",
  },
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
        <section className="text-center py-16 sm:py-20">
          <p className="text-[11px] uppercase tracking-[0.3em] text-cobalt mb-6">
            By invitation
          </p>
          <h1 className="font-display text-4xl sm:text-5xl leading-[1.1] mb-6 max-w-2xl mx-auto">
            A closed room for a small, considered membership.
          </h1>
          <p className="text-ink/55 max-w-xl mx-auto mb-9 text-[17px] leading-relaxed">
            Curated writing, a quarterly forecasting game, and invitations — a
            private platform from Vitruvian Partners&apos; Investor Relations.
          </p>
          <p className="text-xs text-ink/35">
            Use the switcher, top right, to enter as any role and watch the
            experience change.
          </p>
        </section>
      ) : (
        // Signed-in hero
        <section className="mb-14 pt-4">
          <p className="text-[11px] uppercase tracking-[0.3em] text-cobalt mb-3">
            Welcome back
          </p>
          <h1 className="font-display text-4xl sm:text-5xl leading-tight">
            {me.display_name.split(" ")[0]}.
          </h1>
          <p className="text-ink/55 mt-3 max-w-xl text-[17px] leading-relaxed">
            You&apos;re in as a{" "}
            <span className="text-ink/80 font-medium">{me.role}</span>. What you
            can see and do shifts with your role.
          </p>
        </section>
      )}

      {/* Start here canon — visible to everyone, including prospects */}
      {canon.length > 0 && (
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-display text-xl">Start here</h2>
            <span className="h-px flex-1 bg-ink/10" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {canon.map((item) => (
              <Link
                key={item.id}
                href={`/library/${item.id}`}
                className="group bg-white rounded-2xl ring-1 ring-ink/10 p-6 hover:ring-cobalt/40 transition"
              >
                <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40 mb-2">
                  {item.tier} · {item.format}
                </p>
                <h3 className="font-display text-lg leading-snug mb-2 group-hover:text-cobalt transition">
                  {item.title}
                </h3>
                <p className="text-sm text-ink/55 leading-relaxed">
                  {(item.body ?? "").slice(0, 140)}…
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* The pillars — the real, built experience */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="font-display text-xl">Inside Mikata</h2>
          <span className="h-px flex-1 bg-ink/10" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {PILLARS.map((p) => (
            <div
              key={p.name}
              className="rounded-2xl ring-1 ring-ink/10 p-6 bg-paper"
            >
              <h3 className="font-display text-lg mb-2">{p.name}</h3>
              <p className="text-sm text-ink/55 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-center font-display text-ink/30 italic mt-16">
        Mikata — for the few who are already in the room.
      </p>
    </>
  );
}

