import { getCurrentMember, getAllMembers } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import RoleEditor from "@/components/RoleEditor";

export const dynamic = "force-dynamic";

type ShareRow = {
  id: number;
  token: string;
  content_id: number;
  created_by: number;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
};

function linkStatus(l: ShareRow): { label: string; tone: string } {
  if (l.expires_at && new Date(l.expires_at) < new Date())
    return { label: "expired", tone: "text-ink/40" };
  if (l.max_views != null && l.view_count >= l.max_views)
    return { label: "maxed", tone: "text-amber-700" };
  return { label: "active", tone: "text-cobalt" };
}

export default async function Admin() {
  const me = await getCurrentMember();

  if (!me || me.role !== "admin") {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-ink/10 p-8 max-w-xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-cobalt mb-3">
          Admins only
        </p>
        <h1 className="font-display text-2xl mb-3">Admin console</h1>
        <p className="text-ink/55">
          This area is for platform administrators. Switch to{" "}
          <span className="font-medium">Platform Admin</span> using the switcher,
          top right.
        </p>
      </div>
    );
  }

  const members = await getAllMembers();
  const sb = getSupabase();

  const { data: linkData } = await sb.from("share_links").select("*");
  const links = (linkData as ShareRow[]) ?? [];

  const contentMap = new Map<number, string>();
  const ids = Array.from(new Set(links.map((l) => l.content_id)));
  if (ids.length) {
    const { data } = await sb
      .from("content_items")
      .select("id,title")
      .in("id", ids);
    (data as { id: number; title: string }[] | null)?.forEach((c) =>
      contentMap.set(c.id, c.title)
    );
  }
  const memberMap = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40 mb-2">
          Admin console
        </p>
        <h1 className="font-display text-4xl">Platform administration</h1>
        <p className="text-ink/55 mt-2">
          Manage who can see and do what, and audit every gift link in
          circulation.
        </p>
      </div>

      {/* Roles */}
      <section className="bg-white rounded-2xl ring-1 ring-ink/10 p-6">
        <h2 className="font-display text-xl mb-4">Members &amp; roles</h2>
        <div className="divide-y divide-ink/8">
          {members.map((m) => (
            <div
              key={m.id}
              className="py-3 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="truncate">{m.display_name}</div>
                <div className="text-xs text-ink/40">
                  {m.yomi_handle ?? "—"} · {m.status}
                </div>
              </div>
              <RoleEditor memberId={m.id} current={m.role} />
            </div>
          ))}
        </div>
        <p className="text-xs text-ink/40 mt-4">
          Changing a role takes effect immediately — it&apos;s the same role the
          switcher and every gate read from.
        </p>
      </section>

      {/* Share-link audit */}
      <section className="bg-white rounded-2xl ring-1 ring-ink/10 p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-xl">Gift-link audit</h2>
          <span className="text-xs text-ink/40">{links.length} total</span>
        </div>
        {links.length === 0 ? (
          <p className="text-sm text-ink/40">
            No gift links have been created yet.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.15em] text-ink/40 border-b border-ink/10">
                  <th className="py-2 px-2 font-medium">Piece</th>
                  <th className="py-2 px-2 font-medium">Shared by</th>
                  <th className="py-2 px-2 font-medium">Views</th>
                  <th className="py-2 px-2 font-medium">Expires</th>
                  <th className="py-2 px-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/8">
                {links.map((l) => {
                  const s = linkStatus(l);
                  const who = memberMap.get(l.created_by);
                  return (
                    <tr key={l.id}>
                      <td className="py-2.5 px-2">
                        {contentMap.get(l.content_id) ?? `#${l.content_id}`}
                      </td>
                      <td className="py-2.5 px-2 text-ink/60">
                        {who?.display_name ?? `#${l.created_by}`}
                      </td>
                      <td className="py-2.5 px-2 text-ink/60">
                        {l.view_count}
                        {l.max_views != null ? ` / ${l.max_views}` : ""}
                      </td>
                      <td className="py-2.5 px-2 text-ink/60">
                        {l.expires_at
                          ? new Date(l.expires_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })
                          : "—"}
                      </td>
                      <td className={`py-2.5 px-2 capitalize ${s.tone}`}>
                        {s.label}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

