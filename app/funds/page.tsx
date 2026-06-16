import { getCurrentMember } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { visibleVisibilities } from "@/lib/visibility";
import RegisterInterest from "@/components/RegisterInterest";

export const dynamic = "force-dynamic";

type Fund = {
  id: number;
  name: string;
  kind: string | null;
  minimum: string | null;
  status: string;
  body: string | null;
  visibility: string;
};
type Reg = {
  opportunity_id: number;
  member_id: number;
  created_at: string | null;
  ir_status: string;
};

const STATUS_STYLE: Record<string, string> = {
  open: "text-cobalt bg-cobalt/5",
  "closing soon": "text-amber-700 bg-amber-50",
  closed: "text-ink/45 bg-ink/5",
};

export default async function Funds() {
  const me = await getCurrentMember();
  const sb = getSupabase();
  const isMember = me && me.role !== "prospect";
  const isEditor = me && (me.role === "editor" || me.role === "admin");

  if (!isMember) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-ink/10 p-8 max-w-xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-cobalt mb-3">
          Members only
        </p>
        <h1 className="font-display text-2xl mb-3">
          Fund opportunities are for members
        </h1>
        <p className="text-ink/55">
          Fund content is restricted to eligible investors. Switch to a member
          (e.g. Eleanor) using the control top right.
        </p>
      </div>
    );
  }

  const allowed = visibleVisibilities(me!.role);
  const { data: fData } = await sb
    .from("fund_opportunities")
    .select("*")
    .in("visibility", allowed)
    .order("id");
  const funds = (fData as Fund[]) ?? [];

  const { data: myRegData } = await sb
    .from("interest_registrations")
    .select("opportunity_id")
    .eq("member_id", me!.id);
  const myRegs = new Set(
    (myRegData ?? []).map((r: { opportunity_id: number }) => r.opportunity_id)
  );

  // Editor IR inbox.
  let inbox: { name: string; member: string; when: string; status: string }[] =
    [];
  if (isEditor) {
    const { data: regData } = await sb
      .from("interest_registrations")
      .select("opportunity_id,member_id,created_at,ir_status")
      .order("created_at", { ascending: false });
    const regs = (regData as Reg[]) ?? [];
    const { data: profs } = await sb.from("profiles").select("id,display_name");
    const names = new Map(
      (profs ?? []).map((p: { id: number; display_name: string }) => [
        p.id,
        p.display_name,
      ])
    );
    const fundNames = new Map(funds.map((f) => [f.id, f.name]));
    inbox = regs.map((r) => ({
      name: fundNames.get(r.opportunity_id) ?? `Opportunity #${r.opportunity_id}`,
      member: names.get(r.member_id) ?? "—",
      when: r.created_at
        ? new Date(r.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })
        : "",
      status: r.ir_status,
    }));
  }

  return (
    <>
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.3em] text-cobalt mb-3">
          Fund opportunities
        </p>
        <h1 className="font-display text-4xl leading-tight mb-3">
          Where the room can lean in.
        </h1>
        <p className="text-ink/55 max-w-xl">
          Open vehicles and co-investments. Registering interest flags you to
          IR — nothing more.
        </p>
      </div>

      {/* Compliance framing — the part that matters most here. */}
      <div className="rounded-2xl bg-amber-50/60 ring-1 ring-amber-200 p-5 mb-8 max-w-2xl">
        <p className="text-sm text-amber-900/80 leading-relaxed">
          Restricted to eligible investors. Everything here is information only.
          Registering interest is an <span className="font-medium">expression
          of interest</span> — not an offer, application, or transaction — and is
          routed to IR for follow-up. No subscriptions or payments happen in the
          app.
        </p>
      </div>

      <div className="space-y-4 max-w-2xl">
        {funds.map((f) => (
          <div key={f.id} className="bg-white rounded-2xl ring-1 ring-ink/10 p-6">
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="font-display text-lg">{f.name}</p>
              <span
                className={`text-[11px] uppercase tracking-wider rounded px-2 py-0.5 shrink-0 ${
                  STATUS_STYLE[f.status] ?? "text-ink/45 bg-ink/5"
                }`}
              >
                {f.status}
              </span>
            </div>
            <p className="text-sm text-ink/45 mb-3">
              {f.kind}
              {f.minimum && ` · minimum ${f.minimum}`}
            </p>
            <p className="text-sm text-ink/60 mb-5">{f.body}</p>

            {!isEditor &&
              (f.status === "closed" ? (
                <p className="text-sm text-ink/40">This opportunity is closed.</p>
              ) : myRegs.has(f.id) ? (
                <p className="text-sm text-cobalt">
                  Interest registered ✓ — IR will be in touch.
                </p>
              ) : (
                <RegisterInterest opportunityId={f.id} memberId={me!.id} />
              ))}
          </div>
        ))}
      </div>

      {isEditor && (
        <section className="mt-12 max-w-2xl">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="font-display text-xl">IR inbox</h2>
            <span className="h-px flex-1 bg-ink/10" />
          </div>
          <p className="text-sm text-ink/45 mb-5">
            Expressions of interest routed to the desk.
          </p>
          {inbox.length === 0 ? (
            <p className="text-sm text-ink/50">No expressions of interest yet.</p>
          ) : (
            <div className="bg-white rounded-2xl ring-1 ring-ink/10 overflow-hidden">
              {inbox.map((row, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-5 py-3 text-sm ${
                    i > 0 ? "border-t border-ink/10" : ""
                  }`}
                >
                  <span>
                    <span className="text-ink/80">{row.member}</span>
                    <span className="text-ink/45"> · {row.name}</span>
                  </span>
                  <span className="flex items-center gap-3 text-ink/45">
                    <span>{row.when}</span>
                    <span className="text-[11px] uppercase tracking-wider text-cobalt bg-cobalt/5 rounded px-2 py-0.5">
                      {row.status}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}

