import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const HOTEL_ID = "00000000-0000-0000-0000-000000000587";
const CUVE_CAPACITY = 30_000;

function anthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  try {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_api_key_here") {
      return Response.json({ error: "ANTHROPIC_API_KEY manquante" }, { status: 500 });
    }

    const supabase = adminSupabase();
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const monthStart = todayStr.slice(0, 7) + "-01";
    const todayStart = todayStr + "T00:00:00.000Z";
    const in14Days = new Date(today);
    in14Days.setDate(today.getDate() + 14);
    const in14DaysStr = in14Days.toISOString().slice(0, 10);

    // Requêtes Supabase — chacune gère son erreur indépendamment
    const [setRetardsRes, setAlertesRes, ncRes, interventionsRes, rondesRes, depensesRes, fuelRes] =
      await Promise.all([
        supabase.from("set_controles").select("nom, prestataire, date_prochaine").eq("statut", "retard").order("date_prochaine", { ascending: true }).limit(8),
        supabase.from("set_controles").select("nom, prestataire, date_prochaine").eq("statut", "alerte").order("date_prochaine", { ascending: true }).limit(5),
        supabase.from("non_conformites").select("description, gravite, date_cible").eq("statut", "ouverte").limit(6),
        supabase.from("interventions").select("titre, priorite, statut, zone").eq("hotel_id", HOTEL_ID).in("statut", ["a_traiter", "en_cours"]).eq("priorite", "urgente").limit(5),
        supabase.from("rondes").select("type, validee, date_heure").eq("hotel_id", HOTEL_ID).gte("date_heure", todayStart).order("date_heure", { ascending: false }),
        supabase.from("depenses").select("montant").eq("hotel_id", HOTEL_ID).gte("date", monthStart),
        supabase.from("rondes").select("donnees, date_heure").eq("hotel_id", HOTEL_ID).eq("validee", true).order("date_heure", { ascending: false }).limit(10),
      ]);

    // Log des erreurs Supabase sans planter
    if (setRetardsRes.error) console.error("[briefing] set_controles retard:", setRetardsRes.error.message);
    if (setAlertesRes.error) console.error("[briefing] set_controles alerte:", setAlertesRes.error.message);
    if (ncRes.error) console.error("[briefing] non_conformites:", ncRes.error.message);
    if (interventionsRes.error) console.error("[briefing] interventions:", interventionsRes.error.message);
    if (rondesRes.error) console.error("[briefing] rondes:", rondesRes.error.message);
    if (depensesRes.error) console.error("[briefing] depenses:", depensesRes.error.message);
    if (fuelRes.error) console.error("[briefing] fuel:", fuelRes.error.message);

    const setRetards = setRetardsRes.data ?? [];
    const setAlertes = setAlertesRes.data ?? [];
    const ncs = ncRes.data ?? [];
    const interventions = interventionsRes.data ?? [];
    const rondes = rondesRes.data ?? [];
    const depenses = depensesRes.data ?? [];
    const fuelRondes = fuelRes.data ?? [];

    // Fuel — chercher le dernier niveau dans les rondes récentes
    let fuelNiveau: number | null = null;
    for (const r of fuelRondes) {
      const d = r.donnees as Record<string, unknown> | null;
      const niv = (d?.niveau_fuel as { niveau_fuel?: number } | undefined)?.niveau_fuel ?? null;
      if (niv !== null) { fuelNiveau = niv; break; }
    }
    const fuelPct = fuelNiveau !== null ? Math.round((fuelNiveau / CUVE_CAPACITY) * 100) : null;

    const rondeOuv = rondes.find((r) => r.type === "ouverture" && r.validee);
    const rondeFerm = rondes.find((r) => r.type === "fermeture" && r.validee);
    const heure = today.getHours();
    const totalDepenses = depenses.reduce((s, d) => s + (Number(d.montant) || 0), 0);

    // Météo OpenWeatherMap
    let meteo = "Non disponible";
    const owKey = process.env.OPENWEATHER_API_KEY;
    if (owKey && owKey !== "your_openweather_api_key_here") {
      try {
        const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Ajaccio,FR&appid=${owKey}&units=metric&lang=fr`, { cache: "no-store" });
        if (r.ok) {
          const w = await r.json() as { main: { temp: number }; weather: { description: string }[] };
          meteo = `${Math.round(w.main.temp)}°C, ${w.weather[0]?.description ?? ""}`;
        }
      } catch { /* silencieux */ }
    }

    const dateLocale = today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const rdvSemaine = setAlertes.filter((c) =>
      c.date_prochaine && c.date_prochaine >= todayStr && c.date_prochaine <= in14DaysStr
    );

    const context = `Date : ${dateLocale}
Météo Ajaccio : ${meteo}

SET EN RETARD (${setRetards.length}) :
${setRetards.map((c) => {
  const j = c.date_prochaine ? Math.floor((today.getTime() - new Date(c.date_prochaine).getTime()) / 86_400_000) : 0;
  return `- ${c.nom} (${c.prestataire || "interne"}), retard ${j}j`;
}).join("\n") || "Aucun"}

SET EN ALERTE (${setAlertes.length}) :
${setAlertes.map((c) => `- ${c.nom} prévu le ${c.date_prochaine}`).join("\n") || "Aucun"}

RDV PROCHAINS 14 JOURS :
${rdvSemaine.map((c) => `- ${c.nom} avec ${c.prestataire}, le ${c.date_prochaine}`).join("\n") || "Aucun"}

NC OUVERTES (${ncs.length}) :
${ncs.map((n) => `- [${n.gravite}] ${n.description}${n.date_cible ? ` (cible : ${n.date_cible})` : ""}`).join("\n") || "Aucune"}

INTERVENTIONS URGENTES (${interventions.length}) :
${interventions.map((i) => `- ${i.titre}${i.zone ? ` (${i.zone})` : ""}`).join("\n") || "Aucune"}

RONDES DU JOUR :
- Ouverture : ${rondeOuv ? `✅ faite` : `❌ non faite${heure >= 10 ? " — RETARD !" : ""}`}
- Fermeture : ${rondeFerm ? `✅ faite` : "non faite"}

FUEL : ${fuelNiveau !== null ? `${fuelNiveau.toLocaleString("fr-FR")} L (${fuelPct}%)${fuelPct !== null && fuelPct < 30 ? " → COMMANDER !" : ""}` : "Non disponible"}
DÉPENSES DU MOIS : ${totalDepenses.toFixed(0)} €`;

    const anthropic = anthropicClient();
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 450,
      system: `Tu es l'assistant personnel de Cyrille Buresi, Directeur Technique du Sofitel Golfe d'Ajaccio. Tu connais parfaitement l'hôtel, ses équipements, ses prestataires et ses contraintes. Tu parles à Cyrille directement, en français, de façon concise et humaine — comme un collègue de confiance qui a tout analysé avant lui. Génère un briefing du matin en 5-8 lignes maximum. Commence par le plus urgent. Termine par une note positive si possible. Utilise des emojis pour la lisibilité. Ne répète jamais deux fois le même briefing.`,
      messages: [{ role: "user", content: `Données de l'hôtel ce matin :\n\n${context}\n\nGénère le briefing.` }],
    });

    const briefing = msg.content[0].type === "text" ? msg.content[0].text : "";
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    return Response.json({ briefing, timestamp, date: dateLocale });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[briefing] ERREUR FATALE:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
