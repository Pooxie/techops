import { createBrowserClient } from "@supabase/ssr";
import {
  normalizeDonneesRonde,
  type DonneesRonde,
} from "@/lib/rondes";

export { DONNEES_DEFAULT, detectHorsNorme } from "@/lib/rondes";
export type { DonneesRonde, OkNok } from "@/lib/rondes";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side : à utiliser dans les Client Components ("use client")
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export type DashboardKPIs = {
  scoreConformite: number;
  totalControles: number;
  controlesOk: number;
  controlesAlerte: number;
  equipementsCritiques: number;
  ncOuvertes: number;
  ncMineuresOuvertes: number;
  nonConformitesMajeures: number;
  ncLevees: number;
  prestatairesCetteSemaine: number;
};

export type NCParControleItem = { nom: string; count: number; majeures: number };

export async function fetchTopNCParControle(): Promise<NCParControleItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("non_conformites")
    .select("gravite, statut, controle:set_controles(nom)")
    .eq("statut", "ouverte");

  if (!data) return [];

  const map = new Map<string, { count: number; majeures: number }>();
  for (const row of data) {
    const nom = (row.controle as unknown as { nom: string } | null)?.nom ?? "Sans contrôle";
    const entry = map.get(nom) ?? { count: 0, majeures: 0 };
    entry.count++;
    if (row.gravite === "majeure") entry.majeures++;
    map.set(nom, entry);
  }

  return Array.from(map.entries())
    .map(([nom, d]) => ({ nom, ...d }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export type AlertePrioritaire = {
  id: string;
  nom: string;
  categorie: string;
  date_prochaine: string;
  statut: "retard" | "alerte";
};

export type AvancementCategorie = {
  categorie: string;
  total: number;
  ok: number;
  pct: number;
};

export async function fetchAlertesPrioritaires(): Promise<AlertePrioritaire[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from("set_controles")
    .select("id, nom, date_prochaine, statut, set_categories(nom)")
    .in("statut", ["retard", "alerte"])
    .order("date_prochaine", { ascending: true })
    .limit(5);

  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    nom: row.nom,
    categorie: (row.set_categories as unknown as { nom: string } | null)?.nom ?? "",
    date_prochaine: row.date_prochaine,
    statut: row.statut as "retard" | "alerte",
  }));
}

export async function fetchAvancementMensuel(): Promise<AvancementCategorie[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from("set_controles")
    .select("statut, set_categories(nom)")
    .limit(1000);

  if (!data || data.length === 0) return [];

  const map = new Map<string, { total: number; ok: number }>();

  for (const row of data) {
    const cat = (row.set_categories as unknown as { nom: string } | null)?.nom ?? "Sans catégorie";
    const entry = map.get(cat) ?? { total: 0, ok: 0 };
    entry.total += 1;
    if (row.statut === "ok") entry.ok += 1;
    map.set(cat, entry);
  }

  return Array.from(map.entries())
    .map(([categorie, { total, ok }]) => ({
      categorie,
      total,
      ok,
      pct: total > 0 ? Math.round((ok / total) * 100) : 0,
    }))
    .sort((a, b) => a.pct - b.pct) // les moins avancées en premier
    .slice(0, 5);
}

// ─── SET ──────────────────────────────────────────────────────────────────────

export type SetControle = {
  id: string;
  nom: string;
  categorie_id: string;
  categorie_nom: string;
  type_intervenant: string;
  periodicite_mois: number;
  prestataire: string;
  date_derniere_visite: string | null;
  date_prochaine: string | null;
  statut: "ok" | "alerte" | "retard";
  non_conformites: number;
  non_conformites_restantes: number;
  notes: string | null;
};

export type SetCategorie = {
  id: string;
  nom: string;
  ordre: number;
  controles: SetControle[];
};

function computeStatut(date_prochaine: string | null): "ok" | "alerte" | "retard" {
  if (!date_prochaine) return "ok";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30 = new Date(today);
  in30.setDate(today.getDate() + 30);
  const d = new Date(date_prochaine);
  if (d < today) return "retard";
  if (d < in30) return "alerte";
  return "ok";
}

export async function fetchSetCategories(): Promise<SetCategorie[]> {
  const supabase = createClient();

  const [{ data: cats }, { data: controles }] = await Promise.all([
    supabase
      .from("set_categories")
      .select("id, nom, ordre")
      .order("ordre", { ascending: true }),
    supabase
      .from("set_controles")
      .select("id, nom, categorie_id, type_intervenant, periodicite_mois, prestataire, date_derniere_visite, date_prochaine, non_conformites, non_conformites_restantes, notes")
      .order("nom", { ascending: true }),
  ]);

  if (!cats) return [];

  const controlesMap = new Map<string, SetControle[]>();
  for (const c of controles ?? []) {
    const list = controlesMap.get(c.categorie_id) ?? [];
    list.push({
      id: c.id,
      nom: c.nom,
      categorie_id: c.categorie_id,
      categorie_nom: "",
      type_intervenant: c.type_intervenant ?? "",
      periodicite_mois: c.periodicite_mois ?? 0,
      prestataire: c.prestataire ?? "",
      date_derniere_visite: c.date_derniere_visite,
      date_prochaine: c.date_prochaine,
      statut: computeStatut(c.date_prochaine),
      non_conformites: c.non_conformites ?? 0,
      non_conformites_restantes: c.non_conformites_restantes ?? 0,
      notes: c.notes,
    });
    controlesMap.set(c.categorie_id, list);
  }

  return cats.map((cat) => ({
    id: cat.id,
    nom: cat.nom,
    ordre: cat.ordre,
    controles: (controlesMap.get(cat.id) ?? []).map((c) => ({
      ...c,
      categorie_nom: cat.nom,
    })),
  }));
}

// ─── Prestataires ─────────────────────────────────────────────────────────────

export type PrestataireRecord = {
  prestataire: string;
  nb_controles: number;
  prochaine_visite: string | null;
  domaines: string[];
  nb_retards: number;
  nb_alertes: number;
  nb_nc_ouvertes: number;
  controles: SetControle[];
};

export async function fetchPrestataires(): Promise<PrestataireRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("set_controles")
    .select("id, nom, categorie_id, type_intervenant, periodicite_mois, prestataire, date_derniere_visite, date_prochaine, non_conformites, non_conformites_restantes, notes, categorie:set_categories(nom)")
    .not("prestataire", "is", null)
    .neq("prestataire", "")
    .order("nom", { ascending: true });

  if (error) console.error("fetchPrestataires error:", error.message, error.code);
  if (!data) return [];

  const map = new Map<string, PrestataireRecord>();

  for (const row of data) {
    const prest = row.prestataire as string;
    const categNom = (row.categorie as unknown as { nom: string } | null)?.nom ?? "Autre";
    const statut = computeStatut(row.date_prochaine);

    const controle: SetControle = {
      id: row.id,
      nom: row.nom,
      categorie_id: row.categorie_id,
      categorie_nom: categNom,
      type_intervenant: row.type_intervenant ?? "",
      periodicite_mois: row.periodicite_mois ?? 0,
      prestataire: prest,
      date_derniere_visite: row.date_derniere_visite,
      date_prochaine: row.date_prochaine,
      statut,
      non_conformites: row.non_conformites ?? 0,
      non_conformites_restantes: row.non_conformites_restantes ?? 0,
      notes: row.notes,
    };

    const existing = map.get(prest);
    if (existing) {
      existing.nb_controles += 1;
      existing.controles.push(controle);
      if (!existing.domaines.includes(categNom)) existing.domaines.push(categNom);
      if (statut === "retard") existing.nb_retards += 1;
      if (statut === "alerte") existing.nb_alertes += 1;
      existing.nb_nc_ouvertes += row.non_conformites_restantes ?? 0;
      if (row.date_prochaine) {
        if (!existing.prochaine_visite || row.date_prochaine < existing.prochaine_visite) {
          existing.prochaine_visite = row.date_prochaine;
        }
      }
    } else {
      map.set(prest, {
        prestataire: prest,
        nb_controles: 1,
        prochaine_visite: row.date_prochaine ?? null,
        domaines: [categNom],
        nb_retards: statut === "retard" ? 1 : 0,
        nb_alertes: statut === "alerte" ? 1 : 0,
        nb_nc_ouvertes: row.non_conformites_restantes ?? 0,
        controles: [controle],
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.prestataire.localeCompare(b.prestataire, "fr")
  );
}

export type UpdateSetControlePayload = {
  id: string;
  date_derniere_visite: string;
  non_conformites: number;
  non_conformites_restantes: number;
  notes: string;
  periodicite_mois: number;
};

export async function createSetControle(payload: {
  nom: string;
  categorie_id: string;
  type_intervenant?: string;
  periodicite_mois: number;
  notes?: string | null;
}): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: userData } = await supabase
    .from("users").select("hotel_id").eq("id", user.id).single();

  const d = new Date();
  d.setMonth(d.getMonth() + payload.periodicite_mois);
  const date_prochaine = d.toISOString().split("T")[0];
  const statut = computeStatut(date_prochaine);

  const insertPayload: Record<string, unknown> = {
    nom: payload.nom,
    categorie_id: payload.categorie_id,
    type_intervenant: payload.type_intervenant || null,
    periodicite_mois: payload.periodicite_mois,
    date_prochaine,
    statut,
    non_conformites: 0,
    non_conformites_restantes: 0,
    notes: payload.notes || null,
  };
  if (userData?.hotel_id) insertPayload.hotel_id = userData.hotel_id;

  const { error } = await supabase.from("set_controles").insert(insertPayload);
  if (error) throw new Error(error.message);
}

export async function updateSetControle(payload: UpdateSetControlePayload): Promise<void> {
  const supabase = createClient();

  const date_prochaine = (() => {
    const d = new Date(payload.date_derniere_visite);
    d.setMonth(d.getMonth() + payload.periodicite_mois);
    return d.toISOString().split("T")[0];
  })();

  const statut = computeStatut(date_prochaine);

  const { error } = await supabase
    .from("set_controles")
    .update({
      date_derniere_visite: payload.date_derniere_visite,
      date_prochaine,
      statut,
      non_conformites: payload.non_conformites,
      non_conformites_restantes: payload.non_conformites_restantes,
      notes: payload.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.id);

  if (error) throw error;
}

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

export async function fetchDashboardKPIs(): Promise<DashboardKPIs> {
  const supabase = createClient();

  const today = new Date();
  const in7days = new Date(today);
  in7days.setDate(today.getDate() + 7);
  const todayStr = today.toISOString().split("T")[0];
  const in7daysStr = in7days.toISOString().split("T")[0];

  const [
    { count: totalControles },
    { count: controlesOk },
    { count: controlesAlerte },
    { count: controlesRetard },
    { count: ncOuvertes },
    { count: ncMajeures },
    { count: ncMineures },
    { count: ncLevees },
    { count: prestatairesSemaine },
  ] = await Promise.all([
    supabase.from("set_controles").select("*", { count: "exact", head: true }),
    supabase.from("set_controles").select("*", { count: "exact", head: true }).eq("statut", "ok"),
    supabase.from("set_controles").select("*", { count: "exact", head: true }).eq("statut", "alerte"),
    supabase.from("set_controles").select("*", { count: "exact", head: true }).eq("statut", "retard"),
    supabase.from("non_conformites").select("*", { count: "exact", head: true }).eq("statut", "ouverte"),
    supabase.from("non_conformites").select("*", { count: "exact", head: true }).eq("gravite", "majeure").eq("statut", "ouverte"),
    supabase.from("non_conformites").select("*", { count: "exact", head: true }).eq("gravite", "mineure").eq("statut", "ouverte"),
    supabase.from("non_conformites").select("*", { count: "exact", head: true }).eq("statut", "levee"),
    supabase.from("set_controles").select("*", { count: "exact", head: true }).gte("date_prochaine", todayStr).lte("date_prochaine", in7daysStr),
  ]);

  const total = totalControles ?? 0;
  const ok = controlesOk ?? 0;
  const scoreConformite = total > 0 ? Math.round((ok / total) * 100) : 0;

  return {
    scoreConformite,
    totalControles: total,
    controlesOk: ok,
    controlesAlerte: controlesAlerte ?? 0,
    equipementsCritiques: controlesRetard ?? 0,
    ncOuvertes: ncOuvertes ?? 0,
    ncMineuresOuvertes: ncMineures ?? 0,
    nonConformitesMajeures: ncMajeures ?? 0,
    ncLevees: ncLevees ?? 0,
    prestatairesCetteSemaine: prestatairesSemaine ?? 0,
  };
}

// ─── RONDES ──────────────────────────────────────────────────────────────────

export type RondeRecord = {
  id: string;
  technicien_prenom: string;
  type: "ouverture" | "fermeture";
  date_heure: string;
  hors_norme: boolean;
  validee: boolean;
};

export async function fetchRondesToday(): Promise<{ ouverture: RondeRecord | null; fermeture: RondeRecord | null }> {
  const supabase = createClient();
  const today = new Date();
  const start = new Date(today); start.setHours(0, 0, 0, 0);
  const end = new Date(today); end.setHours(23, 59, 59, 999);

  const { data } = await supabase
    .from("rondes")
    .select("id, type, date_heure, hors_norme, validee, users(prenom)")
    .gte("date_heure", start.toISOString())
    .lte("date_heure", end.toISOString())
    .eq("validee", true)
    .order("date_heure", { ascending: true });

  const result: { ouverture: RondeRecord | null; fermeture: RondeRecord | null } = { ouverture: null, fermeture: null };
  if (!data) return result;

  for (const row of data) {
    const record: RondeRecord = {
      id: row.id,
      technicien_prenom: (row.users as unknown as { prenom: string } | null)?.prenom ?? "Technicien",
      type: row.type as "ouverture" | "fermeture",
      date_heure: row.date_heure,
      hors_norme: row.hors_norme,
      validee: row.validee,
    };
    if (row.type === "ouverture" && !result.ouverture) result.ouverture = record;
    if (row.type === "fermeture" && !result.fermeture) result.fermeture = record;
  }
  return result;
}

export async function fetchRondesHistorique(days = 7): Promise<RondeRecord[]> {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from("rondes")
    .select("id, type, date_heure, hors_norme, validee, users(prenom)")
    .gte("date_heure", since.toISOString())
    .eq("validee", true)
    .order("date_heure", { ascending: false });

  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    technicien_prenom: (row.users as unknown as { prenom: string } | null)?.prenom ?? "Technicien",
    type: row.type as "ouverture" | "fermeture",
    date_heure: row.date_heure,
    hors_norme: row.hors_norme,
    validee: row.validee,
  }));
}

export type RondeWithDonnees = RondeRecord & {
  donnees: DonneesRonde;
  observations: string | null;
  signature: string | null;
};

export type RondesKPI = {
  rondesMois: number;
  anomaliesMois: number;
  derniereAnomalie: string | null;
};

export async function fetchRondesTodayWithDonnees(): Promise<{ ouverture: RondeWithDonnees | null; fermeture: RondeWithDonnees | null }> {
  const supabase = createClient();
  const today = new Date();
  const start = new Date(today); start.setHours(0, 0, 0, 0);
  const end = new Date(today); end.setHours(23, 59, 59, 999);

  const { data } = await supabase
    .from("rondes")
    .select("id, type, date_heure, hors_norme, validee, donnees, observations, signature, users(prenom)")
    .gte("date_heure", start.toISOString())
    .lte("date_heure", end.toISOString())
    .eq("validee", true)
    .order("date_heure", { ascending: true });

  const result: { ouverture: RondeWithDonnees | null; fermeture: RondeWithDonnees | null } = { ouverture: null, fermeture: null };
  if (!data) return result;

  for (const row of data) {
    const record: RondeWithDonnees = {
      id: row.id,
      technicien_prenom: (row.users as unknown as { prenom: string } | null)?.prenom ?? "Technicien",
      type: row.type as "ouverture" | "fermeture",
      date_heure: row.date_heure,
      hors_norme: row.hors_norme,
      validee: row.validee,
      donnees: normalizeDonneesRonde(row.donnees),
      observations: row.observations ?? null,
      signature: row.signature ?? null,
    };
    if (row.type === "ouverture" && !result.ouverture) result.ouverture = record;
    if (row.type === "fermeture" && !result.fermeture) result.fermeture = record;
  }
  return result;
}

export async function fetchRondesHistoriqueWithDonnees(days = 7): Promise<RondeWithDonnees[]> {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("rondes")
    .select("id, type, date_heure, hors_norme, validee, donnees, observations, signature, users(prenom)")
    .gte("date_heure", since.toISOString())
    .eq("validee", true)
    .order("date_heure", { ascending: false });

  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    technicien_prenom: (row.users as unknown as { prenom: string } | null)?.prenom ?? "Technicien",
    type: row.type as "ouverture" | "fermeture",
    date_heure: row.date_heure,
    hors_norme: row.hors_norme,
    validee: row.validee,
    donnees: normalizeDonneesRonde(row.donnees),
    observations: row.observations ?? null,
    signature: row.signature ?? null,
  }));
}

export async function fetchRondeById(id: string): Promise<RondeWithDonnees | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("rondes")
    .select("id, type, date_heure, hors_norme, validee, donnees, observations, signature, users(prenom)")
    .eq("id", id)
    .single();

  if (!data) return null;
  return {
    id: data.id,
    technicien_prenom: (data.users as unknown as { prenom: string } | null)?.prenom ?? "Technicien",
    type: data.type as "ouverture" | "fermeture",
    date_heure: data.date_heure,
    hors_norme: data.hors_norme,
    validee: data.validee,
    donnees: normalizeDonneesRonde(data.donnees),
    observations: data.observations ?? null,
    signature: data.signature ?? null,
  };
}

export async function fetchRondesKPI(): Promise<RondesKPI> {
  const supabase = createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data } = await supabase
    .from("rondes")
    .select("id, hors_norme, date_heure")
    .gte("date_heure", startOfMonth)
    .eq("validee", true)
    .order("date_heure", { ascending: false });

  if (!data) return { rondesMois: 0, anomaliesMois: 0, derniereAnomalie: null };

  const rondesMois = data.length;
  const anomalies = data.filter((r) => r.hors_norme);
  const anomaliesMois = anomalies.length;
  const derniereAnomalie = anomalies[0]?.date_heure ?? null;

  return { rondesMois, anomaliesMois, derniereAnomalie };
}

// ─── INTERVENTIONS ───────────────────────────────────────────────────────────

export type InterventionRecord = {
  id: string;
  titre: string;
  description: string | null;
  zone: string | null;
  equipement: string | null;
  priorite: "normale" | "urgente";
  statut: "a_traiter" | "en_cours" | "cloturee";
  origine: string | null;
  assigne_id: string | null;
  assigne_prenom: string | null;
  createur_prenom: string | null;
  description_cloture: string | null;
  cloturee_le: string | null;
  created_at: string;
  numero_chambre: string | null;
};

export type UserRecord = {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  role: "technicien" | "dt";
  actif: boolean;
};

export type CurrentUserSummary = {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  role: "technicien" | "dt";
};

export type TechKPIs = {
  actifs: number;
  interventionsMois: number;
  rondesMois: number;
};

export async function getCurrentUserProfile(): Promise<{ id: string; hotel_id: string; role: "technicien" | "dt" } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, hotel_id, role")
    .eq("id", user.id)
    .single();

  if (!data) return null;
  return { id: data.id, hotel_id: data.hotel_id, role: data.role as "technicien" | "dt" };
}

export async function fetchCurrentUserSummary(): Promise<CurrentUserSummary | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, prenom, nom, email, role")
    .eq("id", user.id)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    prenom: data.prenom ?? "",
    nom: data.nom ?? "",
    email: data.email ?? user.email ?? null,
    role: data.role as "technicien" | "dt",
  };
}

export async function signOutCurrentUser(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function fetchTechniciens(): Promise<UserRecord[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("users")
    .select("id, prenom, nom, email, role, actif")
    .order("prenom", { ascending: true });

  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    prenom: row.prenom,
    nom: row.nom,
    email: row.email ?? null,
    role: row.role as "technicien" | "dt",
    actif: row.actif ?? true,
  }));
}

export async function toggleTechnicienActif(id: string, actif: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("users")
    .update({ actif })
    .eq("id", id);
  if (error) throw error;
}

export async function fetchTechKPIs(): Promise<TechKPIs> {
  const supabase = createClient();
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [
    { count: actifs },
    { count: interventionsMois },
    { count: rondesMois },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }).eq("actif", true),
    supabase.from("interventions").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
    supabase.from("rondes").select("*", { count: "exact", head: true }).eq("validee", true).gte("date_heure", startOfMonth),
  ]);

  return {
    actifs: actifs ?? 0,
    interventionsMois: interventionsMois ?? 0,
    rondesMois: rondesMois ?? 0,
  };
}

export async function fetchInterventions(): Promise<InterventionRecord[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("interventions")
    .select(`
      id, titre, description, zone, equipement, priorite, statut, origine,
      assigne_id, description_cloture, cloturee_le, created_at, numero_chambre,
      assigne:users!assigne_id(prenom),
      createur:users!createur_id(prenom)
    `)
    .order("created_at", { ascending: false });

  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    titre: row.titre,
    description: row.description,
    zone: row.zone,
    equipement: row.equipement,
    priorite: row.priorite as "normale" | "urgente",
    statut: row.statut as "a_traiter" | "en_cours" | "cloturee",
    origine: row.origine,
    assigne_id: row.assigne_id,
    assigne_prenom: (row.assigne as unknown as { prenom: string } | null)?.prenom ?? null,
    createur_prenom: (row.createur as unknown as { prenom: string } | null)?.prenom ?? null,
    description_cloture: row.description_cloture,
    cloturee_le: row.cloturee_le,
    created_at: row.created_at,
    numero_chambre: row.numero_chambre ?? null,
  }));
}

export async function fetchInterventionsByChambre(numero: string): Promise<InterventionRecord[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: userData } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .single();
  if (!userData) return [];

  const { data } = await supabase
    .from("interventions")
    .select(`
      id, titre, description, zone, equipement, priorite, statut, origine,
      assigne_id, description_cloture, cloturee_le, created_at, numero_chambre,
      assigne:users!assigne_id(prenom),
      createur:users!createur_id(prenom)
    `)
    .eq("hotel_id", userData.hotel_id)
    .eq("numero_chambre", numero)
    .order("created_at", { ascending: false });

  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    titre: row.titre,
    description: row.description,
    zone: row.zone,
    equipement: row.equipement,
    priorite: row.priorite as "normale" | "urgente",
    statut: row.statut as "a_traiter" | "en_cours" | "cloturee",
    origine: row.origine,
    assigne_id: row.assigne_id,
    assigne_prenom: (row.assigne as unknown as { prenom: string } | null)?.prenom ?? null,
    createur_prenom: (row.createur as unknown as { prenom: string } | null)?.prenom ?? null,
    description_cloture: row.description_cloture,
    cloturee_le: row.cloturee_le,
    created_at: row.created_at,
    numero_chambre: row.numero_chambre ?? null,
  }));
}

export type ChambreStats = {
  total: number;
  thisMon: number;
};

export async function fetchAllChambreStats(): Promise<Record<string, ChambreStats>> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data: userData } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .single();
  if (!userData) return {};

  const { data } = await supabase
    .from("interventions")
    .select("numero_chambre, created_at")
    .eq("hotel_id", userData.hotel_id)
    .not("numero_chambre", "is", null);

  if (!data) return {};

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const stats: Record<string, ChambreStats> = {};

  for (const row of data) {
    const num = row.numero_chambre as string;
    if (!stats[num]) stats[num] = { total: 0, thisMon: 0 };
    stats[num].total++;
    if (row.created_at >= startOfMonth) stats[num].thisMon++;
  }

  return stats;
}

export async function fetchUsers(): Promise<UserRecord[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("users")
    .select("id, prenom, nom, email, role, actif")
    .eq("actif", true)
    .order("prenom", { ascending: true });

  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    prenom: row.prenom,
    nom: row.nom,
    email: row.email ?? null,
    role: row.role as "technicien" | "dt",
    actif: row.actif ?? true,
  }));
}

export async function createIntervention(payload: {
  titre: string;
  description: string;
  zone: string;
  equipement: string;
  priorite: "normale" | "urgente";
  origine: "terrain" | "reception" | "preventif" | "dt";
  assigne_id: string | null;
  numero_chambre?: string | null;
}): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: userData } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .single();
  if (!userData) throw new Error("Profil utilisateur introuvable");

  const { data: newIntervention, error } = await supabase
    .from("interventions")
    .insert({
      hotel_id: userData.hotel_id,
      createur_id: user.id,
      assigne_id: payload.assigne_id || null,
      titre: payload.titre,
      description: payload.description || null,
      zone: payload.zone || null,
      equipement: payload.equipement || null,
      priorite: payload.priorite,
      statut: "a_traiter",
      origine: payload.origine,
      numero_chambre: payload.numero_chambre || null,
    })
    .select("id")
    .single();

  if (error) throw error;

  // Notifications
  const notifTargets: string[] = [];

  if (payload.priorite === "urgente") {
    // Notifier tous les membres de l'hôtel
    const { data: allUsers } = await supabase
      .from("users")
      .select("id")
      .eq("hotel_id", userData.hotel_id)
      .neq("id", user.id);
    if (allUsers) allUsers.forEach((u) => notifTargets.push(u.id));
  } else if (payload.assigne_id && payload.assigne_id !== user.id) {
    notifTargets.push(payload.assigne_id);
  }

  if (notifTargets.length > 0) {
    await supabase.from("notifications").insert(
      notifTargets.map((uid) => ({
        hotel_id: userData.hotel_id,
        user_id: uid,
        type: payload.priorite === "urgente" ? "intervention_urgente" : "intervention_assignee",
        message: `Intervention ${payload.priorite === "urgente" ? "URGENTE" : ""} : ${payload.titre}`,
        lue: false,
      }))
    );
  }
}

export async function prendreEnChargeIntervention(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("interventions")
    .update({ statut: "en_cours", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function cloturerIntervention(id: string, payload: {
  description_cloture: string;
  signature_cloture: string;
}): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("interventions")
    .update({
      statut: "cloturee",
      description_cloture: payload.description_cloture,
      signature_cloture: payload.signature_cloture || null,
      cloturee_le: new Date().toISOString(),
      cloturee_par: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

// ─── Non-conformités ──────────────────────────────────────────────────────────

export type NCRecord = {
  id: string;
  description: string;
  gravite: "majeure" | "mineure";
  statut: "ouverte" | "levee";
  set_controle_id: string | null;
  controle_nom: string | null;
  equipement_id: string | null;
  source_obs_no: string | null;
  solution_text: string | null;
  action_comment_text: string | null;
  action_owner_name: string | null;
  cost_expl: number | null;
  cost_iae: number | null;
  completed_date: string | null;
  is_conforme: boolean | null;
  is_validated: boolean | null;
  date_cible: string | null;
  levee_le: string | null;
  created_at: string;
  updated_at: string | null;
};

export type NCKPIs = {
  ouvertesTotal: number;
  majeuresOuvertes: number;
  leveeTotal: number;
  coutTotal: number;
  coutExpl: number;
  coutIae: number;
};

export type SetControleItem = { id: string; nom: string };

export async function fetchNonConformites(): Promise<NCRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("non_conformites")
    .select(
      "id, description, gravite, statut, set_controle_id, equipement_id, source_obs_no, solution_text, action_comment_text, action_owner_name, cost_expl, cost_iae, completed_date, is_conforme, is_validated, date_cible, levee_le, created_at, updated_at, controle:set_controles(nom)"
    )
    .order("created_at", { ascending: false });

  if (error) console.error("fetchNonConformites error:", JSON.stringify(error, null, 2));
  console.log("[fetchNonConformites] rows:", data?.length, "| sample statuts:", data?.slice(0, 3).map(r => r.statut));
  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    description: row.description,
    gravite: row.gravite as "majeure" | "mineure",
    statut: row.statut as "ouverte" | "levee",
    set_controle_id: row.set_controle_id,
    controle_nom: (row.controle as unknown as { nom: string } | null)?.nom ?? null,
    equipement_id: row.equipement_id ?? null,
    source_obs_no: row.source_obs_no ?? null,
    solution_text: row.solution_text ?? null,
    action_comment_text: row.action_comment_text ?? null,
    action_owner_name: row.action_owner_name ?? null,
    cost_expl: row.cost_expl ?? null,
    cost_iae: row.cost_iae ?? null,
    completed_date: row.completed_date ?? null,
    is_conforme: row.is_conforme ?? null,
    is_validated: row.is_validated ?? null,
    date_cible: row.date_cible ?? null,
    levee_le: row.levee_le ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
  }));
}

export async function fetchNCKPIs(): Promise<NCKPIs> {
  const supabase = createClient();

  const [
    { count: ouvertes, error: e1 },
    { count: majeures, error: e2 },
    { count: levees, error: e3 },
    { data: coutData, error: e4 },
  ] = await Promise.all([
    supabase
      .from("non_conformites")
      .select("*", { count: "exact", head: true })
      .eq("statut", "ouverte"),
    supabase
      .from("non_conformites")
      .select("*", { count: "exact", head: true })
      .eq("gravite", "majeure")
      .eq("statut", "ouverte"),
    supabase
      .from("non_conformites")
      .select("*", { count: "exact", head: true })
      .eq("statut", "levee"),
    supabase
      .from("non_conformites")
      .select("cost_expl, cost_iae"),
  ]);

  if (e1) console.error("[NCKPIs] ouvertes:", e1.message);
  if (e2) console.error("[NCKPIs] majeures:", e2.message);
  if (e3) console.error("[NCKPIs] levees:", e3.message);
  if (e4) console.error("[NCKPIs] cout:", e4.message);

  const coutExpl  = (coutData ?? []).reduce((s, r) => s + (r.cost_expl ?? 0), 0);
  const coutIae   = (coutData ?? []).reduce((s, r) => s + (r.cost_iae  ?? 0), 0);

  return {
    ouvertesTotal: ouvertes ?? 0,
    majeuresOuvertes: majeures ?? 0,
    leveeTotal: levees ?? 0,
    coutTotal: coutExpl + coutIae,
    coutExpl,
    coutIae,
  };
}

export async function fetchSetControlesList(): Promise<SetControleItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("set_controles")
    .select("id, nom")
    .order("nom", { ascending: true });

  if (!data) return [];
  return data.map((row) => ({ id: row.id, nom: row.nom }));
}

export async function createNC(payload: {
  description: string;
  gravite: "majeure" | "mineure";
  set_controle_id?: string;
  equipement_id?: string;
  date_cible?: string;
  action_owner_name?: string;
  solution_text?: string;
  action_comment_text?: string;
  cost_expl?: number | null;
  cost_iae?: number | null;
}): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: userData } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .single();
  if (!userData) throw new Error("Profil introuvable");

  const insertPayload: Record<string, unknown> = {
    description: payload.description,
    gravite: payload.gravite,
    statut: "ouverte",
    set_controle_id: payload.set_controle_id || null,
    equipement_id: payload.equipement_id || null,
    date_cible: payload.date_cible || null,
    action_owner_name: payload.action_owner_name || null,
    solution_text: payload.solution_text || null,
    action_comment_text: payload.action_comment_text || null,
    cost_expl: payload.cost_expl ?? null,
    cost_iae: payload.cost_iae ?? null,
  };
  if (userData.hotel_id) insertPayload.hotel_id = userData.hotel_id;

  const { error } = await supabase.from("non_conformites").insert(insertPayload);
  if (error) {
    console.error("createNC Supabase error:", JSON.stringify(error, null, 2));
    throw new Error(error.message ?? "Erreur Supabase");
  }
}

export async function updateNCStatut(id: string, statut: "levee"): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("non_conformites")
    .update({ statut, levee_le: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateNC(id: string, payload: {
  description: string;
  gravite: "majeure" | "mineure";
  date_cible: string | null;
  action_owner_name: string | null;
  solution_text: string | null;
  action_comment_text: string | null;
  cost_expl: number | null;
  cost_iae: number | null;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("non_conformites")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteNC(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("non_conformites").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchNCByEquipement(equipementId: string): Promise<Pick<NCRecord, "id" | "description" | "gravite" | "statut" | "date_cible" | "controle_nom">[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("non_conformites")
    .select("id, description, gravite, statut, date_cible, controle:set_controles(nom)")
    .eq("equipement_id", equipementId)
    .order("created_at", { ascending: false });

  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    description: row.description,
    gravite: row.gravite as "majeure" | "mineure",
    statut: row.statut as "ouverte" | "levee",
    date_cible: row.date_cible ?? null,
    controle_nom: (row.controle as unknown as { nom: string } | null)?.nom ?? null,
  }));
}

export type NCEvolutionItem = {
  month: string;   // "YYYY-MM"
  label: string;   // "Janv.", "Févr.", …
  total: number;
  majeures: number;
  levees: number;
};

export type CoutEvolutionItem = {
  month: string;
  label: string;
  expl: number;
  iae: number;
};

export async function fetchCoutEvolution(): Promise<CoutEvolutionItem[]> {
  const supabase = createClient();
  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("non_conformites")
    .select("created_at, cost_expl, cost_iae")
    .gte("created_at", since.toISOString());

  const MONTHS_FR = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
  const map = new Map<string, { expl: number; iae: number }>();

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, { expl: 0, iae: 0 });
  }

  for (const row of data ?? []) {
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) continue;
    const entry = map.get(key)!;
    entry.expl += row.cost_expl ?? 0;
    entry.iae += row.cost_iae ?? 0;
  }

  return Array.from(map.entries()).map(([month, costs]) => ({
    month,
    label: MONTHS_FR[parseInt(month.split("-")[1], 10) - 1],
    ...costs,
  }));
}

export async function fetchNCEvolution(): Promise<NCEvolutionItem[]> {
  const supabase = createClient();
  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("non_conformites")
    .select("created_at, gravite, statut")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (!data) return [];

  const map = new Map<string, { total: number; majeures: number; levees: number }>();

  // Pre-fill last 6 months so months with 0 NC still appear
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, { total: 0, majeures: 0, levees: 0 });
  }

  for (const row of data) {
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) continue;
    const entry = map.get(key)!;
    entry.total += 1;
    if (row.gravite === "majeure") entry.majeures += 1;
    if (row.statut === "levee") entry.levees += 1;
  }

  const MONTHS_FR = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
  return Array.from(map.entries()).map(([month, counts]) => ({
    month,
    label: MONTHS_FR[parseInt(month.split("-")[1], 10) - 1],
    ...counts,
  }));
}

// ─── Planning ─────────────────────────────────────────────────────────────────

export type PrestataireEvent = {
  id: string;
  nom: string;
  date: string; // YYYY-MM-DD
  categorie: string;
};

export type PlanningInterventionEvent = {
  id: string;
  titre: string;
  date: string; // YYYY-MM-DD derived from created_at
  priorite: string;
  statut: string;
};

export type PlanningRondeEvent = {
  id: string;
  type: "ouverture" | "fermeture";
  date: string; // YYYY-MM-DD derived from date_heure
  hors_norme: boolean;
};

export type TacheRecord = {
  id: string;
  titre: string;
  description: string | null;
  date: string; // YYYY-MM-DD
  heure: string | null;
  assignee_a: string | null;
  assignee_prenom: string | null;
  statut: "a_faire" | "fait";
  created_par: string | null;
};

export async function fetchPlanningPrestataires(start: string, end: string): Promise<PrestataireEvent[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("set_controles")
    .select("id, nom, date_prochaine, set_categories(nom)")
    .gte("date_prochaine", start)
    .lte("date_prochaine", end)
    .order("date_prochaine", { ascending: true });

  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    nom: row.nom,
    date: row.date_prochaine,
    categorie: (row.set_categories as unknown as { nom: string } | null)?.nom ?? "",
  }));
}

export async function fetchPlanningInterventions(start: string, end: string): Promise<PlanningInterventionEvent[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("interventions")
    .select("id, titre, created_at, priorite, statut")
    .gte("created_at", `${start}T00:00:00.000Z`)
    .lte("created_at", `${end}T23:59:59.999Z`)
    .neq("statut", "cloturee")
    .order("created_at", { ascending: true });

  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    titre: row.titre,
    date: (row.created_at as string).slice(0, 10),
    priorite: row.priorite,
    statut: row.statut,
  }));
}

export async function fetchPlanningRondes(start: string, end: string): Promise<PlanningRondeEvent[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("rondes")
    .select("id, type, date_heure, hors_norme")
    .gte("date_heure", `${start}T00:00:00.000Z`)
    .lte("date_heure", `${end}T23:59:59.999Z`)
    .eq("validee", true)
    .order("date_heure", { ascending: true });

  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    type: row.type as "ouverture" | "fermeture",
    date: (row.date_heure as string).slice(0, 10),
    hors_norme: row.hors_norme,
  }));
}

export async function fetchTaches(start: string, end: string): Promise<TacheRecord[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("taches")
    .select("id, titre, description, date, heure, assignee_a, assignee:users!assignee_a(prenom), statut, created_par")
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true });

  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    titre: row.titre,
    description: row.description,
    date: row.date,
    heure: row.heure,
    assignee_a: row.assignee_a,
    assignee_prenom: (row.assignee as unknown as { prenom: string } | null)?.prenom ?? null,
    statut: row.statut as "a_faire" | "fait",
    created_par: row.created_par,
  }));
}

export async function createTache(payload: {
  titre: string;
  description?: string;
  date: string;
  heure?: string;
  assignee_a?: string;
}): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: userData } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .single();
  if (!userData) throw new Error("Profil introuvable");

  const { error } = await supabase.from("taches").insert({
    hotel_id: userData.hotel_id,
    titre: payload.titre,
    description: payload.description || null,
    date: payload.date,
    heure: payload.heure || null,
    assignee_a: payload.assignee_a || null,
    statut: "a_faire",
    created_par: user.id,
  });
  if (error) throw error;
}

export async function toggleTacheStatut(id: string, statut: "a_faire" | "fait"): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("taches").update({ statut }).eq("id", id);
  if (error) throw error;
}

export async function deleteTache(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("taches").delete().eq("id", id);
  if (error) throw error;
}

export async function updateTache(id: string, payload: { titre: string; date: string; heure?: string | null }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("taches")
    .update({ titre: payload.titre, date: payload.date, heure: payload.heure || null })
    .eq("id", id);
  if (error) throw error;
}

// ─── Équipements ──────────────────────────────────────────────────────────────

export type EquipementStatut = "ok" | "surveiller" | "critique" | "inactif";

export type EquipementRecord = {
  id: string;
  nom: string;
  categorie: string;
  sous_categorie: string | null;
  zone: string | null;
  marque: string | null;
  modele: string | null;
  numero_serie: string | null;
  date_installation: string | null;
  statut: EquipementStatut;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
};

export async function fetchEquipements(): Promise<EquipementRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("equipements")
    .select("id, nom, categorie, sous_categorie, zone, marque, modele, numero_serie, date_installation, statut, notes, photo_url, created_at")
    .order("categorie", { ascending: true })
    .order("nom", { ascending: true });

  if (error) console.error("fetchEquipements error:", error.message);
  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    nom: row.nom,
    categorie: row.categorie,
    sous_categorie: row.sous_categorie,
    zone: row.zone,
    marque: row.marque,
    modele: row.modele,
    numero_serie: row.numero_serie,
    date_installation: row.date_installation,
    statut: row.statut as EquipementStatut,
    notes: row.notes,
    photo_url: row.photo_url,
    created_at: row.created_at,
  }));
}

export async function fetchEquipementInterventions(equipementId: string): Promise<{ id: string; titre: string; statut: string; created_at: string }[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("interventions")
    .select("id, titre, statut, created_at")
    .eq("equipement_id", equipementId)
    .order("created_at", { ascending: false })
    .limit(5);
  return data ?? [];
}

export async function createEquipement(
  payload: {
    nom: string;
    categorie: string;
    sous_categorie?: string;
    zone?: string;
    marque?: string;
    modele?: string;
    numero_serie?: string;
    date_installation?: string;
    statut: EquipementStatut;
    notes?: string;
  },
  photo?: File
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: userData } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .single();

  let photo_url: string | null = null;
  if (photo) {
    try {
      const ext = photo.name.split(".").pop() ?? "jpg";
      const path = `${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("equipements")
        .upload(path, photo, { upsert: false });
      if (uploadErr) {
        console.warn("Photo upload failed:", uploadErr.message);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from("equipements")
          .getPublicUrl(uploadData.path);
        photo_url = publicUrl;
      }
    } catch {
      console.warn("Photo upload exception");
    }
  }

  const insertPayload: Record<string, unknown> = {
    nom: payload.nom,
    categorie: payload.categorie,
    sous_categorie: payload.sous_categorie || null,
    zone: payload.zone || null,
    marque: payload.marque || null,
    modele: payload.modele || null,
    numero_serie: payload.numero_serie || null,
    date_installation: payload.date_installation || null,
    statut: payload.statut,
    notes: payload.notes || null,
    photo_url,
  };
  if (userData?.hotel_id) insertPayload.hotel_id = userData.hotel_id;

  const { error } = await supabase.from("equipements").insert(insertPayload);
  if (error) throw new Error(error.message);
}

export async function updateEquipement(
  id: string,
  payload: {
    nom: string;
    categorie: string;
    sous_categorie?: string | null;
    zone?: string | null;
    marque?: string | null;
    modele?: string | null;
    numero_serie?: string | null;
    statut: EquipementStatut;
    notes?: string | null;
  }
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("equipements")
    .update({
      nom: payload.nom,
      categorie: payload.categorie,
      sous_categorie: payload.sous_categorie || null,
      zone: payload.zone || null,
      marque: payload.marque || null,
      modele: payload.modele || null,
      numero_serie: payload.numero_serie || null,
      statut: payload.statut,
      notes: payload.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteEquipement(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("equipements").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateEquipementStatut(id: string, statut: EquipementStatut): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("equipements")
    .update({ statut, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveRonde(payload: {
  type: "ouverture" | "fermeture";
  donnees: DonneesRonde;
  observations: string;
  signature: string;
  hors_norme: boolean;
}): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: userData } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .single();
  if (!userData) throw new Error("Profil utilisateur introuvable — votre compte doit être associé à un hôtel dans Supabase (table users).");

  const { error } = await supabase.from("rondes").insert({
    hotel_id: userData.hotel_id,
    technicien_id: user.id,
    type: payload.type,
    date_heure: new Date().toISOString(),
    donnees: payload.donnees,
    observations: payload.observations || null,
    signature: payload.signature || null,
    hors_norme: payload.hors_norme,
    validee: true,
  });
  if (error) throw error;

  if (payload.hors_norme) {
    const { data: dtUsers } = await supabase
      .from("users")
      .select("id")
      .eq("hotel_id", userData.hotel_id)
      .eq("role", "dt");

    if (dtUsers?.length) {
      await supabase.from("notifications").insert(
        dtUsers.map((u) => ({
          hotel_id: userData.hotel_id,
          user_id: u.id,
          type: "ronde_hors_norme",
          message: `Ronde ${payload.type} du ${new Date().toLocaleDateString("fr-FR")} — valeurs hors norme détectées`,
          lue: false,
        }))
      );
    }
  }
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationRecord = {
  id: string;
  type: string;
  message: string;
  lue: boolean;
  created_at: string;
};

export async function fetchNotifications(): Promise<NotificationRecord[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("notifications")
    .select("id, type, message, lue, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []).map((r) => ({
    id: r.id, type: r.type, message: r.message,
    lue: r.lue, created_at: r.created_at,
  }));
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ lue: true })
    .eq("user_id", user.id)
    .eq("lue", false);
}

// ─── Documents ────────────────────────────────────────────────────────────────

export type DocType = "rapport" | "attestation" | "registre" | "photo" | "autre";

export type DocumentRecord = {
  id: string;
  nom: string;
  type: DocType;
  zone: string | null;
  set_controle_id: string | null;
  set_controle_nom: string | null;
  equipement_id: string | null;
  equipement_nom: string | null;
  fichier_url: string;
  fichier_nom: string | null;
  taille_ko: number | null;
  created_at: string;
};

export async function fetchDocuments(): Promise<DocumentRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, nom, type, zone, set_controle_id, equipement_id, fichier_url, fichier_nom, taille_ko, created_at, controle:set_controles(nom), equipement:equipements(nom)"
    )
    .order("created_at", { ascending: false });

  if (error) console.error("fetchDocuments error:", error.message, error.code, error.details, error.hint);
  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    nom: row.nom,
    type: row.type as DocType,
    zone: row.zone,
    set_controle_id: row.set_controle_id,
    set_controle_nom: (row.controle as unknown as { nom: string } | null)?.nom ?? null,
    equipement_id: row.equipement_id,
    equipement_nom: (row.equipement as unknown as { nom: string } | null)?.nom ?? null,
    fichier_url: row.fichier_url,
    fichier_nom: row.fichier_nom,
    taille_ko: row.taille_ko,
    created_at: row.created_at,
  }));
}

export async function uploadDocument(
  file: File,
  payload: {
    nom: string;
    type: DocType;
    zone?: string | null;
    set_controle_id?: string | null;
    equipement_id?: string | null;
  }
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: userData } = await supabase
    .from("users")
    .select("hotel_id")
    .eq("id", user.id)
    .single();

  const hotelId = userData?.hotel_id ?? null;
  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = hotelId
    ? `${hotelId}/${payload.type}/${Date.now()}_${sanitized}`
    : `shared/${payload.type}/${Date.now()}_${sanitized}`;
  const taille_ko = Math.round(file.size / 1024);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, { upsert: false });

  if (uploadError) throw new Error(uploadError.message);

  const insertPayload: Record<string, unknown> = {
    nom: payload.nom,
    type: payload.type,
    zone: payload.zone || null,
    set_controle_id: payload.set_controle_id || null,
    equipement_id: payload.equipement_id || null,
    fichier_url: uploadData.path,
    fichier_nom: file.name,
    taille_ko,
  };
  if (hotelId) insertPayload.hotel_id = hotelId;
  if (userData) insertPayload.uploaded_par = user.id;

  const { error } = await supabase.from("documents").insert(insertPayload);

  if (error) {
    console.error("uploadDocument insert error:", error.message, error.code, error.details);
    throw new Error(error.message);
  }
}

export async function getDocumentSignedUrl(path: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function deleteDocument(id: string, fichierUrl: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from("documents").remove([fichierUrl]);
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Prestataires (table dédiée) ──────────────────────────────────────────────

export type Prestataire = {
  id: string;
  hotel_id: string | null;
  nom: string;
  contact_nom: string | null;
  contact_tel: string | null;
  contact_email: string | null;
  domaines: string[];
  notes: string | null;
  actif: boolean;
  created_at: string;
  controles: SetControle[];
  nb_controles: number;
  nb_retards: number;
  prochaine_visite: string | null;
};

export type CreatePrestatairePayload = {
  nom: string;
  contact_nom?: string | null;
  contact_tel?: string | null;
  contact_email?: string | null;
  domaines?: string[];
  notes?: string | null;
  actif?: boolean;
};

export async function fetchPrestatairesTable(): Promise<Prestataire[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("prestataires")
    .select(
      "*, set_controles(id, nom, categorie_id, date_derniere_visite, date_prochaine, statut, non_conformites, non_conformites_restantes, notes, categorie:set_categories(nom))"
    )
    .order("nom", { ascending: true });

  if (error) console.error("fetchPrestatairesTable error:", error.message);
  if (!data) return [];

  return data.map((p) => {
    const controles: SetControle[] = ((p.set_controles as unknown[]) ?? []).map((c: unknown) => {
      const row = c as {
        id: string; nom: string; categorie_id: string;
        date_derniere_visite: string | null; date_prochaine: string | null;
        non_conformites: number | null; non_conformites_restantes: number | null;
        notes: string | null; categorie: { nom: string } | null;
      };
      return {
        id: row.id,
        nom: row.nom,
        categorie_id: row.categorie_id,
        categorie_nom: row.categorie?.nom ?? "",
        type_intervenant: "",
        periodicite_mois: 0,
        prestataire: p.nom,
        date_derniere_visite: row.date_derniere_visite,
        date_prochaine: row.date_prochaine,
        statut: computeStatut(row.date_prochaine),
        non_conformites: row.non_conformites ?? 0,
        non_conformites_restantes: row.non_conformites_restantes ?? 0,
        notes: row.notes,
      };
    });

    const prochaine_visite =
      controles
        .map((c) => c.date_prochaine)
        .filter(Boolean)
        .sort()[0] ?? null;

    return {
      id: p.id,
      hotel_id: p.hotel_id,
      nom: p.nom,
      contact_nom: p.contact_nom,
      contact_tel: p.contact_tel,
      contact_email: p.contact_email,
      domaines: (p.domaines as string[]) ?? [],
      notes: p.notes,
      actif: p.actif,
      created_at: p.created_at,
      controles,
      nb_controles: controles.length,
      nb_retards: controles.filter((c) => c.statut === "retard").length,
      prochaine_visite,
    };
  });
}

export async function createPrestataire(payload: CreatePrestatairePayload): Promise<Prestataire> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let hotel_id: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("hotel_id")
      .eq("id", user.id)
      .single();
    hotel_id = profile?.hotel_id ?? null;
  }

  const { data, error } = await supabase
    .from("prestataires")
    .insert({ hotel_id, ...payload })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return {
    ...data,
    domaines: (data.domaines as string[]) ?? [],
    controles: [],
    nb_controles: 0,
    nb_retards: 0,
    prochaine_visite: null,
  };
}

export async function updatePrestataire(id: string, payload: Partial<CreatePrestatairePayload> & { actif?: boolean }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("prestataires").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePrestataire(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("prestataires").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function countSetControlesForPrestataire(prestataireId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("set_controles")
    .select("id", { count: "exact", head: true })
    .eq("prestataire_id", prestataireId);
  if (error) return 0;
  return count ?? 0;
}

// ─── REGISTRE SANITAIRE PISCINES ──────────────────────────────────────────────
// Eau de mer — Piscine Hôtel + Piscine Thalasso uniquement.
// Les données sont lues depuis les rondes (JSONB donnees).
// La table registre_sanitaire sert uniquement à stocker les incidents.

export type BassinId = "piscine_hotel" | "piscine_thalasso";

export const BASSIN_LABELS: Record<BassinId, string> = {
  piscine_hotel:   "Piscine Hôtel",
  piscine_thalasso:"Piscine Thalasso",
};

// Seuil unique applicable : température thalasso ≤ 32°C (arrêté du 26 mai 2021)
export const SEUIL_TEMP_THALASSO = 32;

export function isTempThalassoOk(v: number | null): boolean {
  return v === null || v <= SEUIL_TEMP_THALASSO;
}

// ── Données extraites depuis une ronde (lecture seule) ────────────────────────

export type RondePoolRecord = {
  ronde_id: string;
  date: string;          // YYYY-MM-DD
  heure: "matin" | "apres_midi";
  technicien: string;
  // Piscine Hôtel
  hotel_temperature: number | null;
  hotel_chlore: number | null;                  // niveau_chlore (L — litrage cuve)
  hotel_concentration_chlore: number | null;    // concentration chlore (mg/L)
  hotel_swan: "ok" | "nok" | null;
  // Piscine Thalasso
  thalasso_temperature: number | null;
  thalasso_hypochlorite: number | null;         // litres en bâche
  thalasso_concentration_chlore: number | null; // concentration chlore (mg/L)
  thalasso_compteur: number | null;             // compteur remplissage
  thalasso_nettoyage: "ok" | "nok" | null;
  thalasso_swan: "ok" | "nok" | null;
  // Conformité calculée
  hotel_alerte: boolean;      // true si swan=nok ou concentration hors seuil
  thalasso_alerte: boolean;   // true si temp>32°C, swan=nok ou concentration hors seuil
};

export async function fetchRondesPoolData(jours = 30): Promise<RondePoolRecord[]> {
  const supabase = createClient();
  const profile = await getCurrentUserProfile();
  if (!profile) return [];

  const since = new Date();
  since.setDate(since.getDate() - jours);

  const { data } = await supabase
    .from("rondes")
    .select("id, type, date_heure, validee, donnees, users(prenom)")
    .eq("hotel_id", profile.hotel_id)
    .eq("validee", true)
    .gte("date_heure", since.toISOString())
    .order("date_heure", { ascending: false });

  if (!data) return [];

  return data.map((row) => {
    const d = (row.donnees ?? {}) as Record<string, Record<string, number | string | null>>;
    const ph = d.piscine_hotel ?? {};
    const pt = d.piscine_thalasso ?? {};
    const heure = row.type === "ouverture" ? "matin" : "apres_midi";
    const date = row.date_heure.slice(0, 10);

    const thalassoTemp = (pt.temp_echange as number | null) ?? null;

    const hotelConcChlore = (ph.concentration_chlore as number | null) ?? null;
    const thalassoConcChlore = (pt.concentration_chlore as number | null) ?? null;
    const CHLORE_MIN = 0.4;
    const CHLORE_MAX = 1.4;
    const isHotelChloreOk = hotelConcChlore === null || (hotelConcChlore >= CHLORE_MIN && hotelConcChlore <= CHLORE_MAX);
    const isThalassoChloreOk = thalassoConcChlore === null || (thalassoConcChlore >= CHLORE_MIN && thalassoConcChlore <= CHLORE_MAX);

    return {
      ronde_id: row.id,
      date,
      heure,
      technicien: (row.users as unknown as { prenom: string } | null)?.prenom ?? "—",
      hotel_temperature: (ph.temperature as number | null) ?? null,
      hotel_chlore:      (ph.niveau_chlore as number | null) ?? null,
      hotel_concentration_chlore: hotelConcChlore,
      hotel_swan:        (ph.controle_swan as "ok" | "nok" | null) ?? null,
      thalasso_temperature:  thalassoTemp,
      thalasso_hypochlorite: (pt.niveau_hypochlorite as number | null) ?? null,
      thalasso_concentration_chlore: thalassoConcChlore,
      thalasso_compteur:     (pt.compteur_remplissage as number | null) ?? null,
      thalasso_nettoyage:    (pt.nettoyage_filtres as "ok" | "nok" | null) ?? null,
      thalasso_swan:         (pt.controle_swan as "ok" | "nok" | null) ?? null,
      hotel_alerte:   ph.controle_swan === "nok" || !isHotelChloreOk,
      thalasso_alerte: !isTempThalassoOk(thalassoTemp) || pt.controle_swan === "nok" || !isThalassoChloreOk,
    };
  });
}

// ── Nouvelle structure 3 bassins (carnet sanitaire Sofitel) ──────────────────

export type NewBassinId = "piscine_hotel" | "piscine_institut" | "pataugeoire";

export const NEW_BASSIN_LABELS: Record<NewBassinId, string> = {
  piscine_hotel:    "Piscine Hôtel",
  piscine_institut: "Piscine Institut / SPA",
  pataugeoire:      "Pataugeoire",
};

export type BassinRecord = {
  ronde_id: string;
  date: string;
  technicien: string;
  bassin: NewBassinId;
  matin_heure: string | null;
  matin_transparence: "TB" | "B" | "M" | null;
  matin_temperature: number | null;
  matin_chlore_libre: number | null;
  matin_chlore_total: number | null;
  matin_chlore_combine: number | null;
  soir_heure: string | null;
  soir_transparence: "TB" | "B" | "M" | null;
  soir_temperature: number | null;
  soir_chlore_libre: number | null;
  soir_chlore_total: number | null;
  soir_chlore_combine: number | null;
  alerte: boolean;
};

export async function fetchBassinRecords(jours = 30): Promise<BassinRecord[]> {
  const supabase = createClient();
  const profile = await getCurrentUserProfile();
  if (!profile) return [];

  const since = new Date();
  since.setDate(since.getDate() - jours);

  const { data } = await supabase
    .from("rondes")
    .select("id, date_heure, validee, donnees, users(prenom)")
    .eq("hotel_id", profile.hotel_id)
    .eq("validee", true)
    .gte("date_heure", since.toISOString())
    .order("date_heure", { ascending: false });

  if (!data) return [];

  function isCloreLibreOk(v: number | null) { return v === null || (v >= 0.4 && v <= 1.4); }
  function isCombineOk(v: number | null) { return v === null || v < 0.6; }
  function isTempHotelOk(v: number | null) { return v === null || (v >= 24 && v <= 30); }
  function isTempInstitutOk(v: number | null) { return v === null || v <= 32; }

  const bassins: NewBassinId[] = ["piscine_hotel", "piscine_institut", "pataugeoire"];
  const records: BassinRecord[] = [];

  for (const row of data) {
    const d = (row.donnees ?? {}) as Record<string, Record<string, unknown>>;
    const date = row.date_heure.slice(0, 10);
    const technicien = (row.users as unknown as { prenom: string } | null)?.prenom ?? "—";

    for (const bassin of bassins) {
      const m = (d[`${bassin}_matin`] ?? {}) as Record<string, unknown>;
      const s = (d[`${bassin}_soir`]  ?? {}) as Record<string, unknown>;
      const isTempOk = bassin === "piscine_institut" ? isTempInstitutOk : isTempHotelOk;

      const mClLibre   = (m.chlore_libre    as number | null) ?? null;
      const mClCombine = (m.chlore_combine  as number | null) ?? null;
      const mTemp      = (m.temperature     as number | null) ?? null;
      const sClLibre   = (s.chlore_libre    as number | null) ?? null;
      const sClCombine = (s.chlore_combine  as number | null) ?? null;
      const sTemp      = (s.temperature     as number | null) ?? null;

      records.push({
        ronde_id: row.id,
        date,
        technicien,
        bassin,
        matin_heure:          (m.heure         as string | null) ?? null,
        matin_transparence:   (m.transparence   as "TB" | "B" | "M" | null) ?? null,
        matin_temperature:    mTemp,
        matin_chlore_libre:   mClLibre,
        matin_chlore_total:   (m.chlore_total   as number | null) ?? null,
        matin_chlore_combine: mClCombine,
        soir_heure:           (s.heure          as string | null) ?? null,
        soir_transparence:    (s.transparence    as "TB" | "B" | "M" | null) ?? null,
        soir_temperature:     sTemp,
        soir_chlore_libre:    sClLibre,
        soir_chlore_total:    (s.chlore_total    as number | null) ?? null,
        soir_chlore_combine:  sClCombine,
        alerte:
          !isCloreLibreOk(mClLibre) || !isCombineOk(mClCombine) || !isTempOk(mTemp) ||
          !isCloreLibreOk(sClLibre) || !isCombineOk(sClCombine) || !isTempOk(sTemp),
      });
    }
  }

  return records;
}

// ── Incidents manuels (table registre_sanitaire) ──────────────────────────────

export type IncidentSanitaire = {
  id: string;
  date: string;
  bassin: BassinId;
  incident: string;
  action_corrective: string | null;
  technicien_nom: string | null;
  created_at: string;
};

export async function fetchIncidentsSanitaires(jours = 30): Promise<IncidentSanitaire[]> {
  const supabase = createClient();
  const profile = await getCurrentUserProfile();
  if (!profile) return [];

  const since = new Date();
  since.setDate(since.getDate() - jours);

  const { data } = await supabase
    .from("registre_sanitaire")
    .select("id, date, bassin, incident, action_corrective, technicien_nom, created_at")
    .eq("hotel_id", profile.hotel_id)
    .not("incident", "is", null)
    .gte("date", since.toISOString().slice(0, 10))
    .order("date", { ascending: false });

  if (!data) return [];
  return data as IncidentSanitaire[];
}

// ── Dépenses & Factures ───────────────────────────────────────────────────────

export type DepenseType = "facture_prestataire" | "achat_fournisseur" | "achat_magasin";

export type Depense = {
  id: string;
  date: string;
  type: DepenseType;
  fournisseur: string;
  description: string | null;
  montant: number;
  photo_url: string | null;
  envoye_compta: boolean;
  envoye_le: string | null;
  created_at: string;
};

export async function fetchDepenses(): Promise<Depense[]> {
  const supabase = createClient();
  const profile = await getCurrentUserProfile();
  if (!profile) return [];

  const { data } = await supabase
    .from("depenses")
    .select("id, date, type, fournisseur, description, montant, photo_url, envoye_compta, envoye_le, created_at")
    .eq("hotel_id", profile.hotel_id)
    .order("date", { ascending: false });

  if (!data) return [];
  return data.map((row) => ({
    id: row.id as string,
    date: row.date as string,
    type: row.type as DepenseType,
    fournisseur: row.fournisseur as string,
    description: (row.description as string | null) ?? null,
    montant: Number(row.montant),
    photo_url: (row.photo_url as string | null) ?? null,
    envoye_compta: Boolean(row.envoye_compta),
    envoye_le: (row.envoye_le as string | null) ?? null,
    created_at: row.created_at as string,
  }));
}

export async function createDepense(payload: {
  date: string;
  type: DepenseType;
  fournisseur: string;
  description?: string;
  montant: number;
  photo_url?: string;
}): Promise<void> {
  const supabase = createClient();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error("Non authentifié");

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("depenses").insert({
    hotel_id: profile.hotel_id,
    date: payload.date,
    type: payload.type,
    fournisseur: payload.fournisseur,
    description: payload.description ?? null,
    montant: payload.montant,
    photo_url: payload.photo_url ?? null,
    created_par: user?.id ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function uploadDepensePhoto(file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from("depenses").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data: { publicUrl } } = supabase.storage.from("depenses").getPublicUrl(path);
  return publicUrl;
}

// ── Suivi Fuel ────────────────────────────────────────────────────────────────

export type FuelReleveRecord = {
  ronde_id: string;
  date: string;    // YYYY-MM-DD
  niveau: number;  // litres
  technicien: string;
};

export type FuelLivraisonRecord = {
  id: string;
  date: string;
  volume_livre: number;
  prix_unitaire: number;
  prix_total: number;
  fournisseur: string | null;
  notes: string | null;
};

export async function fetchFuelReleves(jours = 90): Promise<FuelReleveRecord[]> {
  const supabase = createClient();
  const profile = await getCurrentUserProfile();
  if (!profile) return [];

  const since = new Date();
  since.setDate(since.getDate() - jours);

  const { data } = await supabase
    .from("rondes")
    .select("id, date_heure, donnees, users(prenom)")
    .eq("hotel_id", profile.hotel_id)
    .eq("validee", true)
    .gte("date_heure", since.toISOString())
    .order("date_heure", { ascending: true });

  if (!data) return [];

  return data
    .map((row) => {
      const d = row.donnees as DonneesRonde | null;
      const niveau = d?.niveau_fuel?.niveau_fuel ?? null;
      if (niveau === null) return null;
      return {
        ronde_id: row.id as string,
        date: (row.date_heure as string).slice(0, 10),
        niveau: niveau as number,
        technicien: (row.users as unknown as { prenom: string } | null)?.prenom ?? "—",
      };
    })
    .filter((r): r is FuelReleveRecord => r !== null);
}

export async function fetchFuelLivraisons(): Promise<FuelLivraisonRecord[]> {
  const supabase = createClient();
  const profile = await getCurrentUserProfile();
  if (!profile) return [];

  const { data } = await supabase
    .from("fuel_livraisons")
    .select("id, date, volume_livre, prix_unitaire, prix_total, fournisseur, notes")
    .eq("hotel_id", profile.hotel_id)
    .order("date", { ascending: false });

  if (!data) return [];

  return data.map((row) => ({
    id: row.id as string,
    date: row.date as string,
    volume_livre: row.volume_livre as number,
    prix_unitaire: Number(row.prix_unitaire),
    prix_total: Number(row.prix_total),
    fournisseur: (row.fournisseur as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
  }));
}

export async function createFuelLivraison(payload: {
  date: string;
  volume_livre: number;
  prix_unitaire: number;
  fournisseur?: string;
  notes?: string;
}): Promise<void> {
  const supabase = createClient();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error("Non authentifié");

  const { error } = await supabase.from("fuel_livraisons").insert({
    hotel_id: profile.hotel_id,
    date: payload.date,
    volume_livre: payload.volume_livre,
    prix_unitaire: payload.prix_unitaire,
    fournisseur: payload.fournisseur ?? null,
    notes: payload.notes ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function deleteFuelLivraison(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("fuel_livraisons").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Incidents manuels (table registre_sanitaire) ──────────────────────────────

export async function createIncidentSanitaire(payload: {
  date: string;
  bassin: BassinId;
  incident: string;
  action_corrective: string;
  technicien_nom: string;
}): Promise<void> {
  const supabase = createClient();
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error("Non authentifié");

  const { error } = await supabase.from("registre_sanitaire").insert({
    hotel_id: profile.hotel_id,
    date: payload.date,
    bassin: payload.bassin,
    heure: "matin",
    incident: payload.incident,
    action_corrective: payload.action_corrective || null,
    technicien_nom: payload.technicien_nom || null,
    conforme: false,
  });
  if (error) throw new Error(error.message);
}
