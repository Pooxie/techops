import { createServerSupabaseClient } from "@/lib/supabase-server";

const HOTEL_ID = "00000000-0000-0000-0000-000000000587";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("dt_memories")
    .select("id, contenu, tags, created_at")
    .eq("hotel_id", HOTEL_ID)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ memories: data ?? [] });
}

export async function POST(request: Request) {
  const { contenu, tags } = (await request.json()) as {
    contenu: string;
    tags?: string[];
  };

  if (!contenu?.trim()) {
    return Response.json({ error: "Contenu requis" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("dt_memories")
    .insert({ hotel_id: HOTEL_ID, contenu: contenu.trim(), tags: tags ?? [] })
    .select("id, contenu, tags, created_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ memory: data });
}

export async function DELETE(request: Request) {
  const { id } = (await request.json()) as { id: string };
  if (!id) return Response.json({ error: "ID requis" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("dt_memories")
    .delete()
    .eq("id", id)
    .eq("hotel_id", HOTEL_ID);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
