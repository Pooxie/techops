import { createClient } from "@supabase/supabase-js";

const HOTEL_ID = "00000000-0000-0000-0000-000000000587";
const CUVE_CAPACITY = 30_000;

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export type Alerte = {
  id: string;
  type: "ronde" | "set" | "fuel" | "piscine" | "intervention";
  message: string;
  severity: "critical" | "warning" | "info";
  lien?: string;
};

export async function GET() {
  const supabase = adminSupabase();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayStart = todayStr + "T00:00:00.000Z";
  const heure = today.getHours();
  const since24h = new Date(today.getTime() - 86_400_000).toISOString();
  const since2Rondes = new Date(today.getTime() - 2 * 86_400_000).toISOString();

  const [rondesRes, fuelRes, setRetardsRes, interventionsRes, piscineProbRes] =
    await Promise.all([
      supabase
        .from("rondes")
        .select("type, validee, date_heure")
        .eq("hotel_id", HOTEL_ID)
        .gte("date_heure", todayStart)
        .order("date_heure", { ascending: false }),
      supabase
        .from("rondes")
        .select("donnees, date_heure")
        .eq("hotel_id", HOTEL_ID)
        .eq("validee", true)
        .not("donnees->niveau_fuel", "is", null)
        .order("date_heure", { ascending: false })
        .limit(1),
      supabase
        .from("set_controles")
        .select("nom, prestataire, date_prochaine")
        .eq("statut", "retard")
        .order("date_prochaine", { ascending: true })
        .limit(5),
      supabase
        .from("interventions")
        .select("titre, priorite")
        .eq("hotel_id", HOTEL_ID)
        .eq("priorite", "urgente")
        .in("statut", ["a_traiter", "en_cours"])
        .lte("created_at", since24h),
      // Rondes hors norme sur 2 dernières rondes
      supabase
        .from("rondes")
        .select("hors_norme, date_heure, type")
        .eq("hotel_id", HOTEL_ID)
        .eq("validee", true)
        .gte("date_heure", since2Rondes)
        .order("date_heure", { ascending: false })
        .limit(4),
    ]);

  const alertes: Alerte[] = [];
  let idx = 0;

  const rondes = rondesRes.data ?? [];
  const rondeOuv = rondes.find((r) => r.type === "ouverture" && r.validee);
  const rondeFerm = rondes.find((r) => r.type === "fermeture" && r.validee);

  // Ronde ouverture non faite après 10h
  if (!rondeOuv && heure >= 10) {
    alertes.push({
      id: `alerte-ronde-ouv-${idx++}`,
      type: "ronde",
      message: `⏰ Ronde ouverture non effectuée — il est ${heure}h`,
      severity: "critical",
      lien: "/rondes",
    });
  }

  // Ronde fermeture non faite après 17h
  if (!rondeFerm && heure >= 17) {
    alertes.push({
      id: `alerte-ronde-ferm-${idx++}`,
      type: "ronde",
      message: "🌙 Ronde fermeture non effectuée ce soir",
      severity: "warning",
      lien: "/rondes",
    });
  }

  // Fuel < 25%
  const fuelData = fuelRes.data ?? [];
  if (fuelData.length > 0) {
    const d = fuelData[0].donnees as Record<string, unknown> | null;
    const niv = (d?.niveau_fuel as { niveau_fuel?: number } | undefined)?.niveau_fuel ?? null;
    if (niv !== null) {
      const pct = Math.round((niv / CUVE_CAPACITY) * 100);
      if (pct < 25) {
        alertes.push({
          id: `alerte-fuel-${idx++}`,
          type: "fuel",
          message: `⛽ Niveau fuel critique — ${pct}% (${niv.toLocaleString("fr-FR")} L)`,
          severity: pct < 15 ? "critical" : "warning",
          lien: "/fuel",
        });
      }
    }
  }

  // SET en retard
  const setRetards = setRetardsRes.data ?? [];
  for (const ctrl of setRetards.slice(0, 3)) {
    const jourRetard = ctrl.date_prochaine
      ? Math.floor((today.getTime() - new Date(ctrl.date_prochaine).getTime()) / 86_400_000)
      : 0;
    alertes.push({
      id: `alerte-set-${idx++}`,
      type: "set",
      message: `📋 [${ctrl.nom}] vient de passer en retard${jourRetard > 0 ? ` (${jourRetard}j)` : ""}`,
      severity: jourRetard > 30 ? "critical" : "warning",
      lien: "/set",
    });
  }

  // Interventions urgentes > 24h
  const interventions = interventionsRes.data ?? [];
  for (const inv of interventions) {
    alertes.push({
      id: `alerte-inv-${idx++}`,
      type: "intervention",
      message: `🔧 ${inv.titre} — urgente sans réponse depuis 24h+`,
      severity: "critical",
      lien: "/interventions",
    });
  }

  // Piscine hors seuil sur > 2 rondes
  const dernierRondes = piscineProbRes.data ?? [];
  const horsNormeCount = dernierRondes.filter((r) => r.hors_norme).length;
  if (horsNormeCount >= 2) {
    alertes.push({
      id: `alerte-piscine-${idx++}`,
      type: "piscine",
      message: `🏊 Piscine hors seuil depuis ${horsNormeCount} relevés consécutifs`,
      severity: "critical",
      lien: "/piscine",
    });
  }

  return Response.json({ alertes, count: alertes.length });
}
