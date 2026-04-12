import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const HOTEL_ID = "00000000-0000-0000-0000-000000000587";
const CUVE_CAPACITY = 30_000; // litres

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_api_key_here") {
    return Response.json({ error: "ANTHROPIC_API_KEY manquante dans .env.local" }, { status: 500 });
  }

  const supabase = adminSupabase();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const monthStart = todayStr.slice(0, 7) + "-01";
  const todayStart = todayStr + "T00:00:00.000Z";
  const in14Days = new Date(today);
  in14Days.setDate(today.getDate() + 14);
  const in14DaysStr = in14Days.toISOString().slice(0, 10);

  const [
    setRetardsRes,
    setAlertesRes,
    ncRes,
    interventionsRes,
    rondesRes,
    depensesRes,
    prestatairesRes,
    fuelRes,
  ] = await Promise.all([
    supabase
      .from("set_controles")
      .select("nom, prestataire, date_prochaine, date_derniere_visite")
      .eq("statut", "retard")
      .order("date_prochaine", { ascending: true })
      .limit(8),
    supabase
      .from("set_controles")
      .select("nom, prestataire, date_prochaine")
      .eq("statut", "alerte")
      .order("date_prochaine", { ascending: true })
      .limit(5),
    supabase
      .from("non_conformites")
      .select("description, gravite, date_cible")
      .eq("statut", "ouverte")
      .order("gravite", { ascending: false })
      .limit(6),
    supabase
      .from("interventions")
      .select("titre, priorite, statut, created_at, zone")
      .eq("hotel_id", HOTEL_ID)
      .in("statut", ["a_traiter", "en_cours"])
      .eq("priorite", "urgente")
      .limit(5),
    supabase
      .from("rondes")
      .select("type, validee, date_heure, donnees")
      .eq("hotel_id", HOTEL_ID)
      .gte("date_heure", todayStart)
      .order("date_heure", { ascending: false }),
    supabase
      .from("depenses")
      .select("montant, type, fournisseur")
      .eq("hotel_id", HOTEL_ID)
      .gte("date", monthStart),
    supabase
      .from("prestataires")
      .select("nom, contact_tel, contact_nom")
      .eq("hotel_id", HOTEL_ID)
      .eq("actif", true),
    // Dernière ronde validée avec fuel
    supabase
      .from("rondes")
      .select("donnees, date_heure")
      .eq("hotel_id", HOTEL_ID)
      .eq("validee", true)
      .not("donnees->niveau_fuel", "is", null)
      .order("date_heure", { ascending: false })
      .limit(1),
  ]);

  const setRetards = setRetardsRes.data ?? [];
  const setAlertes = setAlertesRes.data ?? [];
  const ncs = ncRes.data ?? [];
  const interventions = interventionsRes.data ?? [];
  const rondes = rondesRes.data ?? [];
  const depenses = depensesRes.data ?? [];
  const fuel = fuelRes.data ?? [];

  // Fuel level
  let fuelNiveau: number | null = null;
  let fuelPct: number | null = null;
  if (fuel.length > 0) {
    const d = fuel[0].donnees as Record<string, unknown> | null;
    const niv = (d?.niveau_fuel as { niveau_fuel?: number } | undefined)?.niveau_fuel ?? null;
    if (niv !== null) {
      fuelNiveau = niv;
      fuelPct = Math.round((niv / CUVE_CAPACITY) * 100);
    }
  }

  // Rondes du jour
  const rondeOuv = rondes.find((r) => r.type === "ouverture" && r.validee);
  const rondeFerm = rondes.find((r) => r.type === "fermeture" && r.validee);
  const heure = today.getHours();

  // Dépenses mois
  const totalDepenses = depenses.reduce((s, d) => s + (Number(d.montant) || 0), 0);

  // Météo
  let meteo = "Non disponible";
  const owKey = process.env.OPENWEATHER_API_KEY;
  if (owKey) {
    try {
      const r = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=Ajaccio,FR&appid=${owKey}&units=metric&lang=fr`,
        { next: { revalidate: 0 } },
      );
      if (r.ok) {
        const w = await r.json() as { main: { temp: number }; weather: { description: string }[] };
        meteo = `${Math.round(w.main.temp)}°C, ${w.weather[0]?.description ?? ""}`;
      }
    } catch { /* silencieux */ }
  }

  const dateLocale = today.toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // SET en retard avec calcul jours de retard
  const retardDetails = setRetards.map((c) => {
    const jourRetard = c.date_prochaine
      ? Math.floor((today.getTime() - new Date(c.date_prochaine).getTime()) / 86_400_000)
      : null;
    return `- ${c.nom} (prestataire : ${c.prestataire || "?"})${jourRetard !== null ? `, en retard de ${jourRetard} jour${jourRetard > 1 ? "s" : ""}` : ""}`;
  }).join("\n");

  // Prestataires avec RDV dans les 7 prochains jours
  const rdvSemaine = (setAlertesRes.data ?? []).filter((c) => {
    if (!c.date_prochaine) return false;
    return c.date_prochaine >= todayStr && c.date_prochaine <= in14DaysStr;
  });

  const context = `Date : ${dateLocale}
Météo Ajaccio : ${meteo}

CONTRÔLES SET EN RETARD (${setRetards.length}) :
${retardDetails || "Aucun retard"}

CONTRÔLES SET EN ALERTE (à venir < 30 jours, ${setAlertes.length}) :
${setAlertes.map((c) => `- ${c.nom} prévu le ${c.date_prochaine}`).join("\n") || "Aucun"}

RDV PRESTATAIRES DANS LES 14 PROCHAINS JOURS :
${rdvSemaine.map((c) => `- ${c.nom} avec ${c.prestataire}, le ${c.date_prochaine}`).join("\n") || "Aucun"}

NON-CONFORMITÉS OUVERTES (${ncs.length}) :
${ncs.map((n) => `- [${n.gravite}] ${n.description}${n.date_cible ? ` (cible : ${n.date_cible})` : ""}`).join("\n") || "Aucune"}

INTERVENTIONS URGENTES EN COURS (${interventions.length}) :
${interventions.map((i) => `- ${i.titre}${i.zone ? ` (${i.zone})` : ""}, statut : ${i.statut}`).join("\n") || "Aucune"}

RONDES DU JOUR :
- Ouverture : ${rondeOuv ? `✅ effectuée à ${new Date(rondeOuv.date_heure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : `❌ non effectuée (${heure >= 10 ? "retard !" : "en attente"})`}
- Fermeture : ${rondeFerm ? `✅ effectuée` : "non effectuée (normal si avant 17h)"}

NIVEAU FUEL :
${fuelNiveau !== null ? `${fuelNiveau.toLocaleString("fr-FR")} L soit ${fuelPct}% de la cuve (30 000 L)${fuelPct !== null && fuelPct < 30 ? " → COMMANDER du fuel !" : ""}` : "Donnée non disponible"}

DÉPENSES DU MOIS :
Total : ${totalDepenses.toFixed(0)} €`;

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 450,
    system: `Tu es l'assistant personnel de Cyrille Buresi, Directeur Technique du Sofitel Golfe d'Ajaccio.
Tu connais parfaitement l'hôtel, ses équipements, ses prestataires et ses contraintes.
Tu parles à Cyrille directement, en français, de façon concise et humaine — comme un collègue de confiance qui a tout analysé avant lui.
Génère un briefing du matin en 5-8 lignes maximum.
Commence par le plus urgent. Termine par une note positive si possible.
Utilise des emojis pour la lisibilité.
Ne répète jamais deux fois le même briefing.`,
    messages: [{
      role: "user",
      content: `Voici les données de l'hôtel ce matin :\n\n${context}\n\nGénère le briefing du matin.`,
    }],
  });

  const briefing = msg.content[0].type === "text" ? msg.content[0].text : "";
  const now = new Date();
  const timestamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return Response.json({ briefing, timestamp, date: dateLocale });
}
