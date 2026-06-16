import { cookies } from "next/headers";
import { getSupabase } from "./supabase";

export type Member = {
  id: number;
  display_name: string;
  yomi_handle: string | null;
  role: string;
  status: string;
};

export async function getCurrentMember(): Promise<Member | null> {
  const store = await cookies();
  const id = store.get("mikata_member")?.value;
  if (!id) return null;

  const sb = getSupabase();
  const { data } = await sb
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  return (data as Member) ?? null;
}

export async function getAllMembers(): Promise<Member[]> {
  const sb = getSupabase();
  const { data } = await sb.from("profiles").select("*");

  const rank: Record<string, number> = {
    prospect: 1,
    member: 2,
    contributor: 3,
    editor: 4,
    admin: 5,
  };

  return ((data as Member[]) ?? []).sort(
    (a, b) =>
      (rank[a.role] ?? 9) - (rank[b.role] ?? 9) ||
      a.display_name.localeCompare(b.display_name)
  );
}
