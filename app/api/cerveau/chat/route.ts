import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const HOTEL_ID = "00000000-0000-0000-0000-000000000587";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

type Message = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_api_key_here") {
    return Response.json({ error: "ANTHROPIC_API_KEY manquante dans .env.local" }, { status: 500 });
  }

  const { message, history } = (await request.json()) as {
    message: string;
    history: Message[];
  };

  if (!message?.trim()) {
    return Response.json({ error: "Message vide" }, { status: 400 });
  }

  const supabase = adminSupabase();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const since7Days = new Date(today.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
  const thisYear = today.getFullYear().toString();
  const monthStart = todayStr.slice(0, 7) + "-01";

  // Fetch all context data in parallel — on envoie tout pour que Claude puisse répondre à n'importe quelle question
  const [
    setRes,
    ncRes,
    interventionsRes,
    rondesRes,
    depensesRes,
    prestatairesRes,
    memoriesRes,
    fuelRes,
  ] = await Promise.all([
    supabase
      .from("set_controles")
      .select("nom, prestataire, statut, date_derniere_visite, date_prochaine, periodicite_mois, non_conformites_restantes, notes, categorie:set_categories(nom)")
      .order("nom"),
    supabase
      .from("non_conformites")
      .select("description, gravite, statut, date_cible, created_at, controle:set_controles(nom)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("interventions")
      .select("titre, description, zone, equipement, priorite, statut, created_at, cloturee_le, numero_chambre")
      .eq("hotel_id", HOTEL_ID)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("rondes")
      .select("type, validee, date_heure, hors_norme, donnees")
      .eq("hotel_id", HOTEL_ID)
      .gte("date_heure", since7Days + "T00:00:00")
      .order("date_heure", { ascending: false }),
    supabase
      .from("depenses")
      .select("date, type, fournisseur, montant, description")
      .eq("hotel_id", HOTEL_ID)
      .gte("date", monthStart)
      .order("date", { ascending: false }),
    supabase
      .from("prestataires")
      .select("nom, contact_nom, contact_tel, contact_email, domaines, notes")
      .eq("hotel_id", HOTEL_ID)
      .eq("actif", true)
      .order("nom"),
    supabase
      .from("dt_memories")
      .select("contenu, tags, created_at")
      .eq("hotel_id", HOTEL_ID)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("rondes")
      .select("donnees, date_heure")
      .eq("hotel_id", HOTEL_ID)
      .eq("validee", true)
      .not("donnees->niveau_fuel", "is", null)
      .order("date_heure", { ascending: false })
      .limit(3),
  ]);

  // Rondes du jour (pour l'état des piscines)
  const rondesAujourdhui = (rondesRes.data ?? []).filter(
    (r) => r.date_heure?.slice(0, 10) === todayStr,
  );

  // Dernier relevé fuel
  const fuelData = (fuelRes.data ?? []);
  let dernierFuel = "Non disponible";
  if (fuelData.length > 0) {
    const d = fuelData[0].donnees as Record<string, unknown> | null;
    const niv = (d?.niveau_fuel as { niveau_fuel?: number } | undefined)?.niveau_fuel ?? null;
    if (niv !== null) {
      dernierFuel = `${niv.toLocaleString("fr-FR")} L (${Math.round((niv / 30_000) * 100)}%) au ${fuelData[0].date_heure?.slice(0, 10) ?? "?"}`;
    }
  }

  // Piscine — dernier relevé
  const dernierRondeAvecPiscine = (rondesRes.data ?? []).find((r) => {
    const d = r.donnees as Record<string, unknown> | null;
    return d?.piscine_hotel || d?.piscine_institut;
  });

  const context = `=== DONNÉES TECHOPS — ${today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} ===

--- CONTRÔLES SET (${(setRes.data ?? []).length} au total) ---
${(setRes.data ?? []).map((c) => {
  const cat = (c.categorie as unknown as { nom: string } | null)?.nom ?? "?";
  return `• [${c.statut?.toUpperCase()}] ${c.nom} — Catégorie: ${cat} — Prestataire: ${c.prestataire || "interne"} — Dernière visite: ${c.date_derniere_visite || "jamais"} — Prochaine: ${c.date_prochaine || "?"} — NC restantes: ${c.non_conformites_restantes ?? 0}`;
}).join("\n")}

--- NON-CONFORMITÉS (${(ncRes.data ?? []).filter(n => n.statut === "ouverte").length} ouvertes) ---
${(ncRes.data ?? []).map((nc) => {
  const ctrl = (nc.controle as unknown as { nom: string } | null)?.nom ?? "?";
  return `• [${nc.statut}][${nc.gravite}] ${nc.description} — Contrôle: ${ctrl} — Cible: ${nc.date_cible || "?"} — Créé le: ${nc.created_at?.slice(0, 10) || "?"}`;
}).join("\n")}

--- INTERVENTIONS (30 derniers jours) ---
${(interventionsRes.data ?? []).map((i) => {
  return `• [${i.statut}][${i.priorite}] ${i.titre}${i.zone ? ` — Zone: ${i.zone}` : ""}${i.equipement ? ` — Équip: ${i.equipement}` : ""}${i.numero_chambre ? ` — Chambre: ${i.numero_chambre}` : ""} — Créé: ${i.created_at?.slice(0, 10)} ${i.cloturee_le ? `— Clôturé: ${i.cloturee_le.slice(0, 10)}` : ""}`;
}).join("\n")}

--- RONDES (7 derniers jours) ---
${(rondesRes.data ?? []).map((r) => {
  return `• ${r.date_heure?.slice(0, 10)} ${r.type} — Validée: ${r.validee ? "oui" : "non"}${r.hors_norme ? " — ⚠️ HORS NORME" : ""}`;
}).join("\n")}

--- DERNIER NIVEAU FUEL ---
${dernierFuel}

--- DÉPENSES DU MOIS EN COURS ---
Total : ${(depensesRes.data ?? []).reduce((s, d) => s + (Number(d.montant) || 0), 0).toFixed(0)} €
${(depensesRes.data ?? []).map((d) => `• ${d.date} | ${d.fournisseur} | ${d.type} | ${Number(d.montant).toFixed(0)} € ${d.description ? `| ${d.description}` : ""}`).join("\n")}

--- PRESTATAIRES ACTIFS ---
${(prestatairesRes.data ?? []).map((p) => {
  const doms = Array.isArray(p.domaines) ? p.domaines.join(", ") : "";
  return `• ${p.nom}${p.contact_nom ? ` — Contact: ${p.contact_nom}` : ""}${p.contact_tel ? ` — Tél: ${p.contact_tel}` : ""}${doms ? ` — Domaines: ${doms}` : ""}`;
}).join("\n")}

--- MÉMOIRE DT ---
${(memoriesRes.data ?? []).length > 0
  ? (memoriesRes.data ?? []).map((m) => `• ${m.contenu}${Array.isArray(m.tags) && m.tags.length > 0 ? ` [${m.tags.join(", ")}]` : ""}`).join("\n")
  : "Aucune note mémorisée."}`;

  const systemPrompt = `Tu es TechOps, l'assistant IA du Sofitel Golfe d'Ajaccio (hotel_id: ${HOTEL_ID}).
Tu connais parfaitement cet hôtel :
- 98 chambres réparties en 3 ailes
- Piscine hôtel + Piscine Institut/Spa + Pataugeoire
- Thalasso Sea & Spa
- Cuve fuel 30 000 L
- Chaufferie, GEG, Dry Cooling × 4
- Zone technique, local Nord, local Sud
Tu réponds en français, de façon concise et précise.
Tu bases TOUTES tes réponses sur les vraies données fournies dans le contexte.
Si tu n'as pas la donnée, tu le dis clairement et tu suggères où la trouver.
Tu tutois Cyrille.
Pour les dates, calcule les écarts par rapport à aujourd'hui (${todayStr}).
Quand tu cites des montants, utilise le format "X €".
Sois direct et opérationnel — Cyrille n'a pas de temps à perdre.`;

  const messages: Anthropic.Messages.MessageParam[] = [
    // Historique de la conversation
    ...(history ?? []).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    // Question actuelle avec contexte
    {
      role: "user" as const,
      content: `Voici les données actuelles de l'hôtel :\n\n${context}\n\n---\n\nMa question : ${message}`,
    },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: systemPrompt,
    messages,
  });

  const reply = response.content[0].type === "text" ? response.content[0].text : "";

  return Response.json({ response: reply });
}
