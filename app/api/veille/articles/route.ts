import { createServerSupabaseClient } from "@/lib/supabase-server";

const HOTEL_ID = "00000000-0000-0000-0000-000000000587";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domaine = searchParams.get("domaine");
  const impact = searchParams.get("impact");
  const nonLusSeulement = searchParams.get("non_lus") === "true";

  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("veille_reglementaire")
    .select("*")
    .eq("hotel_id", HOTEL_ID)
    .order("created_at", { ascending: false });

  if (domaine) query = query.eq("domaine", domaine);
  if (impact) query = query.eq("impact", impact);
  if (nonLusSeulement) query = query.eq("lu", false);

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ articles: data ?? [] });
}
