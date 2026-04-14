import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const maxDuration = 60;

const HOTEL_ID = "00000000-0000-0000-0000-000000000587";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 0,
});

type VeilleResult = {
  titre: string;
  resume: string;
  source_url: string | null;
  source_nom: string | null;
  date_publication: string | null;
  date_entree_vigueur: string | null;
  domaine: string;
  impact: string;
};

export async function GET() {
  try {
    return await handleScrape();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[veille/scrape] Erreur non capturée :", err);
    return Response.json({ error: `Erreur inattendue : ${message}` }, { status: 500 });
  }
}

async function handleScrape() {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_api_key_here") {
    return Response.json({ error: "ANTHROPIC_API_KEY manquante dans .env.local" }, { status: 500 });
  }

  // Appel unique — web_search est server-side, Anthropic gère tout en un seul tour
  let rawText = "";
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: "Tu es un expert juridique hôtelier. Utilise la recherche web pour trouver des réglementations françaises récentes pour les hôtels ERP. Réponds UNIQUEMENT avec du JSON valide.",
      tools: [
        { type: "web_search_20260209", name: "web_search", allowed_callers: ["direct"] } as unknown as Anthropic.Tool,
      ],
      messages: [
        {
          role: "user",
          content: `Nous sommes le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}. Fais 2 recherches web pour trouver des réglementations françaises publiées dans les 3 derniers mois :
1. "réglementation hôtel ERP France ${new Date().getFullYear()}"
2. "normes sécurité incendie piscine hôtel France ${new Date().getFullYear()}"

Ne retiens QUE les textes publiés après le ${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR")}. Ignore les anciens résultats.

Retourne UNIQUEMENT ce JSON (max 5 résultats) :
{"resultats":[{"titre":"...","resume":"ce qui change pour l'hôtel (2 phrases max)","source_url":"...","source_nom":"...","date_publication":"YYYY-MM-DD ou null","date_entree_vigueur":"YYYY-MM-DD ou null","domaine":"Sécurité|Environnement|Technique|Général","impact":"Fort|Moyen|Faible"}]}

Si rien de récent : {"resultats":[]}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    rawText = textBlock?.type === "text" ? textBlock.text : "";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[veille/scrape] Anthropic API error:", message);
    return Response.json({ error: `Erreur API Anthropic : ${message}` }, { status: 500 });
  }

  if (!rawText.trim()) {
    return Response.json({ message: "Aucune réponse de Claude", inserted: 0 });
  }

  // Parse le JSON retourné par Claude
  let resultats: VeilleResult[] = [];
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      resultats = Array.isArray(parsed.resultats) ? parsed.resultats : [];
    }
  } catch {
    console.error("[veille/scrape] JSON parse error, raw:", rawText.slice(0, 300));
    return Response.json(
      { error: "Impossible de parser la réponse Claude", raw: rawText.slice(0, 300) },
      { status: 500 }
    );
  }

  if (resultats.length === 0) {
    return Response.json({ message: "Aucune réglementation pertinente détectée", inserted: 0 });
  }

  const supabase = await createServerSupabaseClient();

  // Déduplication : récupérer les titres déjà en base
  const { data: existing } = await supabase
    .from("veille_reglementaire")
    .select("titre")
    .eq("hotel_id", HOTEL_ID);

  const existingTitres = new Set((existing ?? []).map((r: { titre: string }) => r.titre.toLowerCase().trim()));

  const rows = resultats
    .filter((r) => !existingTitres.has(r.titre.toLowerCase().trim()))
    .map((r) => ({
      hotel_id: HOTEL_ID,
      titre: r.titre,
      resume: r.resume,
      source_url: r.source_url || null,
      source_nom: r.source_nom || null,
      date_publication: r.date_publication || null,
      date_entree_vigueur: r.date_entree_vigueur || null,
      domaine: r.domaine || "Général",
      impact: r.impact || "Faible",
      lu: false,
    }));

  if (rows.length === 0) {
    return Response.json({ message: "Aucun nouvel article (déjà en base)", inserted: 0 });
  }

  const { error } = await supabase.from("veille_reglementaire").insert(rows);

  if (error) {
    console.error("[veille/scrape] Supabase insert error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ message: "Recherche terminée", inserted: rows.length });
}
