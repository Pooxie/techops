import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const maxDuration = 60;

const HOTEL_ID = "00000000-0000-0000-0000-000000000587";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 0, // Fail fast — pas de retry silencieux qui fait hang la requête
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

const SYSTEM_PROMPT = `Tu es un expert juridique spécialisé en réglementation hôtelière française et Établissements Recevant du Public (ERP).
Tu utilises la recherche web pour trouver les nouvelles réglementations françaises récentes concernant les hôtels et ERP.
Tu te concentres sur un hôtel 4-5 étoiles avec spa, piscines et thalasso.
À la fin de tes recherches, tu réponds UNIQUEMENT avec un JSON valide, sans aucun texte autour.`;

const USER_MESSAGE = `Recherche les nouvelles réglementations françaises (6 derniers mois) pour les hôtels ERP 4-5 étoiles avec spa et piscine. Fais 2-3 recherches : "réglementation hôtel ERP 2025 2026", "normes sécurité incendie hôtel France", "obligations hôtel piscine spa réglementation".

Retourne UNIQUEMENT ce JSON :
{"resultats":[{"titre":"...","resume":"ce qui change pour l'hôtel","source_url":"...","source_nom":"...","date_publication":"YYYY-MM-DD ou null","date_entree_vigueur":"YYYY-MM-DD ou null","domaine":"Sécurité|Environnement|Technique|Général","impact":"Fort|Moyen|Faible"}]}

Si rien → {"resultats":[]}`;

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

  // Boucle agentique — Claude fait ses recherches web (server-side) puis retourne le JSON
  let messages: Anthropic.MessageParam[] = [
    { role: "user", content: USER_MESSAGE },
  ];

  let rawText = "";
  const MAX_ITERATIONS = 10;

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        tools: [
          { type: "web_search_20260209", name: "web_search" } as unknown as Anthropic.Tool,
        ],
        messages,
      });

      if (response.stop_reason === "end_turn") {
        const textBlock = response.content.find((b) => b.type === "text");
        rawText = textBlock?.type === "text" ? textBlock.text : "";
        break;
      }

      if (response.stop_reason === "tool_use") {
        // Construire les tool_results pour chaque outil utilisé
        const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
        const toolResults: Anthropic.MessageParam = {
          role: "user",
          content: toolUseBlocks.map((b) => {
            if (b.type !== "tool_use") return null;
            return {
              type: "tool_result" as const,
              tool_use_id: b.id,
              content: "",
            };
          }).filter(Boolean) as Anthropic.ToolResultBlockParam[],
        };
        messages.push({ role: "assistant", content: response.content });
        messages.push(toolResults);
        continue;
      }

      if (response.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: response.content });
        messages.push({ role: "user", content: "Continue." });
        continue;
      }

      // max_tokens ou autre — on tente de récupérer ce qu'on a
      const textBlock = response.content.find((b) => b.type === "text");
      if (textBlock?.type === "text") rawText = textBlock.text;
      break;
    }
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
    console.error("[veille/scrape] JSON parse error, raw:", rawText.slice(0, 500));
    return Response.json(
      { error: "Impossible de parser la réponse Claude", raw: rawText.slice(0, 500) },
      { status: 500 }
    );
  }

  if (resultats.length === 0) {
    return Response.json({ message: "Aucune réglementation pertinente détectée", inserted: 0 });
  }

  const supabase = await createServerSupabaseClient();

  const rows = resultats.map((r) => ({
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

  const { error } = await supabase.from("veille_reglementaire").insert(rows);

  if (error) {
    console.error("[veille/scrape] Supabase insert error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ message: "Recherche terminée", inserted: rows.length });
}
