import { getCurrentMember } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { visibleVisibilities } from "@/lib/visibility";
import RsvpButton from "@/components/RsvpButton";
import AddToCalendar from "@/components/AddToCalendar";

export const dynamic = "force-dynamic";

type Invitation = {
  id: number;
  type: string;
  title: string;
  starts_at: string | null;
  capacity: number | null;
  body: string | null;
  visibility: string;
};
type Rsvp = { invitation_id: number; member_id: number; status: string };

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

export default async function Invitations() {
  const me = await getCurrentMember();
  const sb = getSupabase();
  const allowed = visibleVisibilities(me?.role ?? null);

  const { data } = await sb
    .from("invitations")
    .select("*")
    .in("visibility", allowed)
    .order("starts_at");
  const items = (data as Invitation[]) ?? [];
  const events = items.filter((i) => i.type === "event");
  const calls = items.filter((i) => i.type === "call");

  const ids = items.map((i) => i.id);
  let rsvps: Rsvp[] = [];
  if (ids.length) {
    const { data: rData } = await sb
      .from("rsvps")
      .select("invitation_id,member_id,status")
      .in("invitation_id", ids);
    rsvps = (rData as Rsvp[]) ?? [];
  }

  const goingCount = (id: number) =>
    rsvps.filter((r) => r.invitation_id === id && r.status === "going").length;
  const waitCount = (id: number) =>
    rsvps.filter((r) => r.invitation_id === id && r.status === "waitlist").length;
  const myStatus = (id: number) =>
    me
      ? rsvps.find((r) => r.invitation_id === id && r.member_id === me.id)
          ?.status ?? null
      : null;

  return (
    <>
      <div className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.3em] text-cobalt mb-3">
          Invitations
        </p>
        <h1 className="font-display text-4xl leading-tight mb-3">What&apos;s on.</h1>
        <p className="text-ink/55 max-w-xl">
          Events to RSVP to, calls to put in your diary. Fund opportunities
          arrive next.
        </p>
      </div>

      {items.length === 0 && (
        <p className="text-ink/55">
          Nothing on the calendar for your role yet. Invitations are for members
          — switch to Eleanor to see them.
        </p>
      )}

      {events.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-display text-xl">Events</h2>
            <span className="h-px flex-1 bg-ink/10" />
          </div>
          <div className="space-y-4 max-w-2xl">
            {events.map((ev) => {
              const cap = ev.capacity ?? 0;
              const going = goingCount(ev.id);
              const wait = waitCount(ev.id);
              const mine = myStatus(ev.id);
              return (
                <div key={ev.id} className="bg-white rounded-2xl ring-1 ring-ink/10 p-6">
                  <p className="font-display text-lg">{ev.title}</p>
                  <p className="text-sm text-ink/45 mt-1 mb-3">
                    {fmtDate(ev.starts_at)}
                    <span className="mx-2 text-ink/25">·</span>
                    {going} of {cap} seats taken
                    {wait > 0 && ` · ${wait} on the waitlist`}
                  </p>
                  <p className="text-sm text-ink/60 mb-5">{ev.body}</p>
                  <RsvpButton
                    invitationId={ev.id}
                    memberId={me ? me.id : null}
                    capacity={cap}
                    goingCount={going}
                    myStatus={mine}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {calls.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-display text-xl">Calls &amp; firesides</h2>
            <span className="h-px flex-1 bg-ink/10" />
          </div>
          <div className="space-y-4 max-w-2xl">
            {calls.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl ring-1 ring-ink/10 p-6">
                <p className="font-display text-lg">{c.title}</p>
                <p className="text-sm text-ink/45 mt-1 mb-3">{fmtDate(c.starts_at)}</p>
                <p className="text-sm text-ink/60 mb-5">{c.body}</p>
                <AddToCalendar
                  title={c.title}
                  startsAt={c.starts_at ?? new Date().toISOString()}
                  body={c.body}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

