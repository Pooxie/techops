import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const HOTEL_ID = "00000000-0000-0000-0000-000000000587";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SOURCES = [
  {
    url: "https://www.legifrance.gouv.fr/search/jorf?tab_selection=jorf&searchField=ALL&query=hotel+ERP&page=1&pageSize=10",
    nom: "Légifrance — Journal Officiel",
  },
  {
    url: "https://www.journal-officiel.gouv.fr",
    nom: "Journal Officiel de la République Française",
  },
  {
    url: "https://www.securite-incendie-erp.com/actualites/",
    nom: "Sécurité Incendie ERP",
  },
];

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);
}

async function fetchSource(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TechOps/1.0; regulatory-monitoring)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return "";
    const html = await response.text();
    return extractTextFromHtml(html);
  } catch {
    return "";
  }
}

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
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_api_key_here") {
    return Response.json({ error: "ANTHROPIC_API_KEY manquante dans .env.local" }, { status: 500 });
  }

  // Récupération des sources en parallèle
  const contents = await Promise.all(
    SOURCES.map(async (source) => {
      const text = await fetchSource(source.url);
      return text
        ? `--- SOURCE : ${source.nom} (${source.url}) ---\n${text}`
        : null;
    })
  );

  const scrapedContent = contents.filter(Boolean).join("\n\n");

  if (!scrapedContent.trim()) {
    return Response.json({ message: "Aucune source disponible", inserted: 0 });
  }

  // System prompt stable → prompt caching
  const systemPrompt = `Tu es un expert juridique spécialisé en réglementation hôtelière française et Établissements Recevant du Public (ERP).
Tu analyses des textes officiels et tu identifies les nouvelles obligations qui concernent les hôtels.
Tu réponds UNIQUEMENT en JSON valide.`;

  const userPrompt = `Voici le contenu récupéré depuis des sources réglementaires officielles :

${scrapedContent}

Identifie uniquement les éléments NOUVEAUX et PERTINENTS pour un hôtel 4-5 étoiles avec spa et piscines.

Pour chaque élément pertinent, retourne :
{
  "resultats": [
    {
      "titre": "titre court et clair",
      "resume": "explication en langage simple — ce qui change concrètement pour l'hôtel",
      "source_url": "url source",
      "source_nom": "nom de la source",
      "date_publication": "YYYY-MM-DD ou null",
      "date_entree_vigueur": "YYYY-MM-DD ou null",
      "domaine": "Sécurité|Environnement|Technique|Général",
      "impact": "Fort|Moyen|Faible"
    }
  ]
}

Si aucun élément pertinent → retourner { "resultats": [] }`;

  const aiResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawText =
    aiResponse.content[0].type === "text" ? aiResponse.content[0].text : "";

  let resultats: VeilleResult[] = [];
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      resultats = Array.isArray(parsed.resultats) ? parsed.resultats : [];
    }
  } catch {
    return Response.json(
      { error: "Impossible de parser la réponse Claude", raw: rawText },
      { status: 500 }
    );
  }

  if (resultats.length === 0) {
    return Response.json({
      message: "Aucune réglementation pertinente détectée",
      inserted: 0,
    });
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
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ message: "Scraping terminé", inserted: rows.length });
}
