import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return Response.json({ error: "ID manquant" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("veille_reglementaire")
    .update({ lu: true })
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
