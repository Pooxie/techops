import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Admin client — uses service role key (server-side only)
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Vérifier que le caller est DT
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Vérifier le rôle du caller
    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !caller) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const { data: callerProfile } = await admin
      .from("users")
      .select("role, hotel_id")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== "dt") {
      return NextResponse.json({ error: "Accès réservé au Directeur Technique" }, { status: 403 });
    }

    const { prenom, nom, email, role, password } = await req.json();

    if (!prenom || !nom || !email || !role) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    // Créer le compte Auth
    const { data: authData, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: password || "TechOps2026!",
      email_confirm: true,
    });

    if (createErr || !authData.user) {
      return NextResponse.json({ error: createErr?.message ?? "Erreur création Auth" }, { status: 400 });
    }

    // Insérer dans la table users
    const { error: dbErr } = await admin.from("users").insert({
      id: authData.user.id,
      hotel_id: callerProfile.hotel_id,
      prenom,
      nom,
      email,
      role,
      actif: true,
    });

    if (dbErr) {
      // Rollback : supprimer le compte Auth
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: authData.user.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
