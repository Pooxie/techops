import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("hotels")
    .select("id, nom, etoiles")
    .limit(5);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, hint: error.hint ?? null },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, hotels: data });
}
