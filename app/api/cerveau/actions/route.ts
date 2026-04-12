import { createServerSupabaseClient } from "@/lib/supabase-server";

const HOTEL_ID = "00000000-0000-0000-0000-000000000587";
const CUVE_CAPACITY = 30_000;

export type ActionPriorite = "urgent" | "important" | "surveiller" | "ok";

export type ActionJour = {
  id: string;
  priorite: ActionPriorite;
  emoji: string;
  titre: string;
  description: string;
  contact?: { nom: string; tel: string };
  duree_estimee?: string;
  source: "set" | "nc" | "ronde" | "fuel" | "intervention";
  lien?: string;
};

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayStart = todayStr + "T00:00:00.000Z";
  const heure = today.getHours();
  const since24h = new Date(today.getTime() - 86_400_000).toISOString();

  const [
    setRetardsRes,
    setAlertesRes,
    ncMajeuresRes,
    interventionsUrgentesRes,
    rondesAujourdhuiRes,
    fuelRes,
    prestatairesRes,
  ] = await Promise.all([
    supabase
      .from("set_controles")
      .select("id, nom, prestataire, date_prochaine")
      .eq("statut", "retard")
      .order("date_prochaine", { ascending: true }),
    supabase
      .from("set_controles")
      .select("id, nom, prestataire, date_prochaine")
      .eq("statut", "alerte")
      .order("date_prochaine", { ascending: true }),
    supabase
      .from("non_conformites")
      .select("id, description, gravite, date_cible")
      .eq("statut", "ouverte")
      .eq("gravite", "majeure"),
    supabase
      .from("interventions")
      .select("id, titre, priorite, statut, created_at, zone, equipement")
      .eq("hotel_id", HOTEL_ID)
      .eq("priorite", "urgente")
      .in("statut", ["a_traiter", "en_cours"])
      .lte("created_at", since24h),
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
      .from("prestataires")
      .select("id, nom, contact_tel, contact_nom")
      .eq("hotel_id", HOTEL_ID)
      .eq("actif", true),
  ]);

  const setRetards = setRetardsRes.data ?? [];
  const setAlertes = setAlertesRes.data ?? [];
  const ncMajeures = ncMajeuresRes.data ?? [];
  const interventionsUrgentes = interventionsUrgentesRes.data ?? [];
  const rondesAujd = rondesAujourdhuiRes.data ?? [];
  const prestataires = prestatairesRes.data ?? [];

  // Map prestataire nom → contact
  const prestMap = new Map<string, { nom: string; tel: string }>();
  for (const p of prestataires) {
    if (p.nom) prestMap.set(p.nom.toLowerCase(), { nom: p.nom, tel: p.contact_tel ?? "" });
  }

  function findContact(prestataireNom: string | null): { nom: string; tel: string } | undefined {
    if (!prestataireNom) return undefined;
    return prestMap.get(prestataireNom.toLowerCase());
  }

  // Fuel
  let fuelPct: number | null = null;
  if ((fuelRes.data ?? []).length > 0) {
    const d = fuelRes.data![0].donnees as Record<string, unknown> | null;
    const niv = (d?.niveau_fuel as { niveau_fuel?: number } | undefined)?.niveau_fuel ?? null;
    if (niv !== null) fuelPct = Math.round((niv / CUVE_CAPACITY) * 100);
  }

  // Rondes du jour
  const rondeOuv = rondesAujd.find((r) => r.type === "ouverture" && r.validee);
  const rondeFerm = rondesAujd.find((r) => r.type === "fermeture" && r.validee);

  const actions: ActionJour[] = [];
  let idx = 0;

  // ── Interventions urgentes sans traitement > 24h ─────────────────────────
  for (const inv of interventionsUrgentes) {
    const heuresRetard = Math.floor((today.getTime() - new Date(inv.created_at).getTime()) / 3_600_000);
    actions.push({
      id: `inv-${idx++}`,
      priorite: "urgent",
      emoji: "🔧",
      titre: `Intervention urgente sans réponse — ${inv.titre}`,
      description: `${inv.zone ? `Zone : ${inv.zone}. ` : ""}En attente depuis ${heuresRetard}h.`,
      duree_estimee: "15 min",
      source: "intervention",
      lien: "/interventions",
    });
  }

  // ── SET en retard → appeler prestataire ─────────────────────────────────
  for (const ctrl of setRetards) {
    const jourRetard = ctrl.date_prochaine
      ? Math.floor((today.getTime() - new Date(ctrl.date_prochaine).getTime()) / 86_400_000)
      : 0;
    const contact = findContact(ctrl.prestataire);
    actions.push({
      id: `set-retard-${idx++}`,
      priorite: "urgent",
      emoji: "📋",
      titre: `Appeler ${ctrl.prestataire || "le prestataire"} — ${ctrl.nom}`,
      description: `Contrôle en retard de ${jourRetard} jour${jourRetard > 1 ? "s" : ""}. Prévu le ${ctrl.date_prochaine ? new Date(ctrl.date_prochaine).toLocaleDateString("fr-FR") : "?"}.`,
      contact,
      duree_estimee: "5 min",
      source: "set",
      lien: "/set",
    });
  }

  // ── NC majeures ouvertes ─────────────────────────────────────────────────
  for (const nc of ncMajeures) {
    const depuisJours = nc.date_cible
      ? Math.floor((new Date(nc.date_cible).getTime() - today.getTime()) / 86_400_000)
      : null;
    actions.push({
      id: `nc-${idx++}`,
      priorite: "urgent",
      emoji: "⚠️",
      titre: `NC Majeure ouverte — ${nc.description.slice(0, 60)}${nc.description.length > 60 ? "…" : ""}`,
      description: depuisJours !== null
        ? (depuisJours < 0 ? `Cible dépassée de ${Math.abs(depuisJours)} jour(s).` : `Cible dans ${depuisJours} jour(s).`)
        : "Aucune date cible définie.",
      duree_estimee: "Variable",
      source: "nc",
      lien: "/non-conformites",
    });
  }

  // ── Ronde ouverture non faite après 10h ──────────────────────────────────
  if (!rondeOuv && heure >= 10) {
    actions.push({
      id: `ronde-ouv-${idx++}`,
      priorite: "urgent",
      emoji: "🌅",
      titre: "Ronde ouverture non effectuée",
      description: `La ronde d'ouverture n'a pas été enregistrée. Il est ${heure}h.`,
      duree_estimee: "30 min",
      source: "ronde",
      lien: "/rondes",
    });
  }

  // ── Fuel < 30% ────────────────────────────────────────────────────────────
  if (fuelPct !== null && fuelPct < 30) {
    actions.push({
      id: `fuel-${idx++}`,
      priorite: fuelPct < 20 ? "urgent" : "important",
      emoji: "⛽",
      titre: `Niveau fuel critique — ${fuelPct}%`,
      description: `La cuve est à ${fuelPct}% (${Math.round((fuelPct / 100) * CUVE_CAPACITY).toLocaleString("fr-FR")} L sur 30 000 L). Commander une livraison.`,
      duree_estimee: "10 min",
      source: "fuel",
      lien: "/fuel",
    });
  }

  // ── SET en alerte → planifier ─────────────────────────────────────────────
  for (const ctrl of setAlertes.slice(0, 5)) {
    const joursRestants = ctrl.date_prochaine
      ? Math.floor((new Date(ctrl.date_prochaine).getTime() - today.getTime()) / 86_400_000)
      : null;
    const contact = findContact(ctrl.prestataire);
    actions.push({
      id: `set-alerte-${idx++}`,
      priorite: "important",
      emoji: "📅",
      titre: `Planifier — ${ctrl.nom}`,
      description: `Contrôle prévu le ${ctrl.date_prochaine ? new Date(ctrl.date_prochaine).toLocaleDateString("fr-FR") : "?"}${joursRestants !== null ? ` (dans ${joursRestants} jour${joursRestants > 1 ? "s" : ""})` : ""}${ctrl.prestataire ? `. Prestataire : ${ctrl.prestataire}` : ""}.`,
      contact,
      duree_estimee: "5 min",
      source: "set",
      lien: "/set",
    });
  }

  // ── Ronde ouverture non faite avant 10h ──────────────────────────────────
  if (!rondeOuv && heure < 10) {
    actions.push({
      id: `ronde-ouv-att-${idx++}`,
      priorite: "surveiller",
      emoji: "🌅",
      titre: "Ronde ouverture à effectuer",
      description: "La ronde d'ouverture n'a pas encore été enregistrée.",
      duree_estimee: "30 min",
      source: "ronde",
      lien: "/rondes",
    });
  }

  // ── Ronde fermeture ───────────────────────────────────────────────────────
  if (!rondeFerm && heure >= 17) {
    actions.push({
      id: `ronde-ferm-${idx++}`,
      priorite: "important",
      emoji: "🌙",
      titre: "Ronde fermeture à effectuer",
      description: "La ronde de fermeture du soir n'a pas encore été enregistrée.",
      duree_estimee: "30 min",
      source: "ronde",
      lien: "/rondes",
    });
  }

  // Si tout va bien
  if (actions.filter((a) => a.priorite === "urgent").length === 0 &&
    actions.filter((a) => a.priorite === "important").length === 0) {
    actions.push({
      id: "ok-all",
      priorite: "ok",
      emoji: "✅",
      titre: "Tout est sous contrôle",
      description: "Aucune action urgente ni importante pour aujourd'hui. Bonne journée !",
      source: "set",
    });
  }

  const urgentCount = actions.filter((a) => a.priorite === "urgent").length;

  return Response.json({ actions, urgentCount });
}
