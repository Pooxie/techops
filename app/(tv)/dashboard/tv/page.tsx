"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { normalizeDonneesRonde } from "@/lib/rondes";

// ── Constants ─────────────────────────────────────────────────────────────────

const HOTEL_ID       = "00000000-0000-0000-0000-000000000587";
const CUVE_CAPACITY  = 30_000;
const SEUIL_ROUGE    = 8_000;
const SEUIL_ORANGE   = 16_000;
const DEFAULT_CONSO  = 400; // L/jour

// ── Design tokens ─────────────────────────────────────────────────────────────

const TV = {
  bg:     "#0A0A0F",
  card:   "#13131A",
  border: "rgba(255,255,255,0.06)",
  text:   "#F0F0F5",
  sub:    "#6E6E8A",
  green:  "#34C759",
  red:    "#FF3B30",
  orange: "#FF9500",
  blue:   "#2563EB",
  cyan:   "#00C7BE",
  violet: "#BF5AF2",
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type RondeSummary = { date_heure: string; prenom: string } | null;

type DayHistory = { date: string; ouverture: boolean; fermeture: boolean };

type TVData = {
  rondeOuverture:   RondeSummary;
  rondeFermeture:   RondeSummary;
  derniereRonde:    RondeSummary;
  rondesHistorique: DayHistory[];
  // Piscines (dernière ronde avec données)
  hotelTemp:        number | null;
  hotelChlore:      number | null;
  hotelSwan:        "ok" | "nok" | null;
  thalaTemp:        number | null;
  thalaChlore:      number | null;
  thalaHypo:        number | null;
  // Fuel
  fuelNiveau:       number | null;
  fuelDate:         string | null;
  // Interventions
  interventions:    Array<{ id: string; titre: string; priorite: string; statut: string; zone: string | null; created_at: string }>;
  interventionsMois:number;
  // SET
  setEnRetard:      Array<{ nom: string; jours: number }>;
  setEnAlerte:      Array<{ nom: string; jours: number }>;
  setTotal:         number;
  setOk:            number;
  // NC
  ncMajeures:       number;
  // Dépenses
  depensesMois:     number;
};

function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ── Data hook ─────────────────────────────────────────────────────────────────

function useTVData() {
  const [data, setData] = useState<TVData | null>(null);

  const fetchAll = useCallback(async () => {
    const supabase  = createClient();
    const now       = new Date();
    const startDay  = new Date(now); startDay.setHours(0,0,0,0);
    const endDay    = new Date(now); endDay.setHours(23,59,59,999);
    const startMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const since5d   = new Date(now); since5d.setDate(since5d.getDate() - 4); since5d.setHours(0,0,0,0);

    const [
      rondesJour,
      rondesHisto,
      derniereRondeRes,
      dernierePiscineRondeRes,
      dernieresFuelRondes,
      interventionsRes,
      interventionsMoisRes,
      setControlesRes,
      ncRes,
      depensesRes,
    ] = await Promise.all([
      // Rondes du jour
      supabase.from("rondes").select("id, type, date_heure, users(prenom)").eq("hotel_id", HOTEL_ID).eq("validee", true).gte("date_heure", startDay.toISOString()).lte("date_heure", endDay.toISOString()).order("date_heure", { ascending: true }),
      // Historique 5 derniers jours
      supabase.from("rondes").select("type, date_heure").eq("hotel_id", HOTEL_ID).eq("validee", true).gte("date_heure", since5d.toISOString()).order("date_heure", { ascending: false }),
      // Dernière ronde globale
      supabase.from("rondes").select("date_heure, users(prenom)").eq("hotel_id", HOTEL_ID).eq("validee", true).order("date_heure", { ascending: false }).limit(1),
      // Dernière ronde avec données piscine
      supabase.from("rondes").select("donnees").eq("hotel_id", HOTEL_ID).eq("validee", true).not("donnees", "is", null).order("date_heure", { ascending: false }).limit(10),
      // Fuel : dernière ronde avec fuel_niveau
      supabase.from("rondes").select("date_heure, donnees").eq("hotel_id", HOTEL_ID).not("donnees->niveau_fuel", "is", null).order("date_heure", { ascending: false }).limit(1),
      // Interventions en cours
      supabase.from("interventions").select("id, titre, priorite, statut, zone, created_at").eq("hotel_id", HOTEL_ID).neq("statut", "cloturee").order("created_at", { ascending: false }),
      // Interventions ce mois
      supabase.from("interventions").select("id", { count: "exact", head: true }).eq("hotel_id", HOTEL_ID).gte("created_at", startMois),
      // SET contrôles
      supabase.from("set_controles").select("nom, date_prochaine, statut").eq("hotel_id", HOTEL_ID),
      // NC majeures ouvertes
      supabase.from("non_conformites").select("id", { count: "exact", head: true }).eq("hotel_id", HOTEL_ID).eq("statut", "ouverte").eq("gravite", "majeure"),
      // Dépenses ce mois
      supabase.from("depenses").select("montant").eq("hotel_id", HOTEL_ID).gte("date", startMois.slice(0,10)),
    ]);

    // ── Rondes du jour ────────────────────────────────────────────────────────
    let rondeOuverture: RondeSummary = null;
    let rondeFermeture: RondeSummary = null;
    for (const r of rondesJour.data ?? []) {
      const prenom = (r.users as unknown as { prenom: string } | null)?.prenom ?? "Tech";
      if (r.type === "ouverture" && !rondeOuverture) rondeOuverture = { date_heure: r.date_heure, prenom };
      if (r.type === "fermeture" && !rondeFermeture) rondeFermeture = { date_heure: r.date_heure, prenom };
    }

    // ── Dernière ronde ────────────────────────────────────────────────────────
    const lastRaw = derniereRondeRes.data?.[0];
    const derniereRonde: RondeSummary = lastRaw ? {
      date_heure: lastRaw.date_heure,
      prenom: (lastRaw.users as unknown as { prenom: string } | null)?.prenom ?? "Tech",
    } : null;

    // ── Historique 5 jours ────────────────────────────────────────────────────
    const rondesHistorique: DayHistory[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0,10);
      const dayRondes = (rondesHisto.data ?? []).filter((r) => r.date_heure.startsWith(iso));
      rondesHistorique.push({
        date: iso,
        ouverture: dayRondes.some((r) => r.type === "ouverture"),
        fermeture: dayRondes.some((r) => r.type === "fermeture"),
      });
    }

    // ── Piscines (dernière ronde avec les données) ────────────────────────────
    let hotelTemp: number | null = null, hotelChlore: number | null = null, hotelSwan: "ok" | "nok" | null = null;
    let thalaTemp: number | null = null, thalaChlore: number | null = null, thalaHypo: number | null = null;

    for (const row of (dernierePiscineRondeRes.data ?? [])) {
      const d = normalizeDonneesRonde(row.donnees);
      if (hotelTemp === null && d.piscine_hotel?.temperature != null) hotelTemp = d.piscine_hotel.temperature;
      if (hotelChlore === null && d.piscine_hotel?.concentration_chlore != null) hotelChlore = d.piscine_hotel.concentration_chlore;
      if (hotelSwan === null && d.piscine_hotel?.controle_swan != null) hotelSwan = d.piscine_hotel.controle_swan;
      if (thalaTemp === null && d.piscine_thalasso?.temp_echange != null) thalaTemp = d.piscine_thalasso.temp_echange;
      if (thalaChlore === null && d.piscine_thalasso?.concentration_chlore != null) thalaChlore = d.piscine_thalasso.concentration_chlore;
      if (thalaHypo === null && d.piscine_thalasso?.niveau_hypochlorite != null) thalaHypo = d.piscine_thalasso.niveau_hypochlorite;
      if (hotelTemp !== null && hotelChlore !== null && thalaTemp !== null) break;
    }

    // ── Fuel ─────────────────────────────────────────────────────────────────
    let fuelNiveau: number | null = null;
    let fuelDate: string | null = null;
    const fuelRow = dernieresFuelRondes.data?.[0];
    if (fuelRow) {
      const d = normalizeDonneesRonde(fuelRow.donnees);
      fuelNiveau = (d.niveau_fuel as { niveau_fuel?: number } | null)?.niveau_fuel ?? null;
      fuelDate = fuelRow.date_heure;
    }

    // ── SET contrôles ─────────────────────────────────────────────────────────
    const allSet = setControlesRes.data ?? [];
    const setTotal = allSet.length;
    const setOk = allSet.filter((s) => s.statut !== "retard" && s.statut !== "alerte").length;
    const today = now.toISOString().slice(0,10);

    const setEnRetard: Array<{ nom: string; jours: number }> = allSet
      .filter((s) => s.statut === "retard" && s.date_prochaine)
      .map((s) => {
        const jours = Math.ceil((new Date(today).getTime() - new Date(s.date_prochaine!).getTime()) / 86_400_000);
        return { nom: s.nom, jours };
      })
      .sort((a, b) => b.jours - a.jours)
      .slice(0, 3);

    const setEnAlerte: Array<{ nom: string; jours: number }> = allSet
      .filter((s) => s.statut === "alerte" && s.date_prochaine)
      .map((s) => {
        const jours = Math.ceil((new Date(s.date_prochaine!).getTime() - new Date(today).getTime()) / 86_400_000);
        return { nom: s.nom, jours: Math.max(0, jours) };
      })
      .sort((a, b) => a.jours - b.jours)
      .slice(0, 3);

    const setEnRetardCount = allSet.filter((s) => s.statut === "retard").length;
    const setEnAlerteCount = allSet.filter((s) => s.statut === "alerte").length;

    // ── Dépenses ─────────────────────────────────────────────────────────────
    const depensesMois = (depensesRes.data ?? []).reduce((s, d) => s + (d.montant ?? 0), 0);

    setData({
      rondeOuverture, rondeFermeture, derniereRonde, rondesHistorique,
      hotelTemp, hotelChlore, hotelSwan, thalaTemp, thalaChlore, thalaHypo,
      fuelNiveau, fuelDate,
      interventions: (interventionsRes.data ?? []).slice(0, 8),
      interventionsMois: interventionsMoisRes.count ?? 0,
      setEnRetard: [...setEnRetard, ...Array(3).fill(null)].slice(0,3).filter(Boolean) as { nom: string; jours: number }[],
      setEnAlerte: [...setEnAlerte, ...Array(3).fill(null)].slice(0,3).filter(Boolean) as { nom: string; jours: number }[],
      setTotal, setOk,
      setEnRetardCount,
      setEnAlerteCount,
      ncMajeures: ncRes.count ?? 0,
      depensesMois,
    } as TVData & { setEnRetardCount: number; setEnAlerteCount: number });
  }, []);

  useEffect(() => {
    void fetchAll();
    const id = setInterval(() => void fetchAll(), 30_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  return data;
}

// ── Live clock ────────────────────────────────────────────────────────────────

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function fmtEur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function heuresDepuis(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (diff < 1) return `${Math.round(diff * 60)}min`;
  return `${diff.toFixed(0)}h`;
}

function fmtNum(n: number) {
  return n.toLocaleString("fr-FR");
}

function joursLabel(n: number, suffix: string) {
  return `${n} jour${n > 1 ? "s" : ""} ${suffix}`;
}

// ── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: TV.card,
      border: `1px solid ${TV.border}`,
      borderRadius: 14,
      padding: "12px 14px",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      minHeight: 0,
      ...style,
    }}>
      {children}
    </div>
  );
}

function BlockTitle({ emoji, label, color }: { emoji: string; label: string; color: string }) {
  return (
    <p style={{ margin: "0 0 10px", fontSize: 9, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "1.5px", display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ fontSize: 13 }}>{emoji}</span>
      {label}
    </p>
  );
}

// ── Stat row ─────────────────────────────────────────────────────────────────

function Stat({ label, value, color, ok }: { label: string; value: string; color?: string; ok?: boolean | null }) {
  const c = color ?? (ok === true ? TV.green : ok === false ? TV.red : TV.text);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${TV.border}` }}>
      <span style={{ fontSize: 11, color: TV.sub, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: c, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

// ── BLOC PISCINES ─────────────────────────────────────────────────────────────

function BlocPiscines({ d }: { d: TVData }) {
  const hotelChlorOk = d.hotelChlore != null ? d.hotelChlore >= 0.4 && d.hotelChlore <= 1.4 : null;
  const hotelTempOk  = d.hotelTemp != null ? d.hotelTemp >= 25 && d.hotelTemp <= 29 : null;
  const thalaChlorOk = d.thalaChlore != null ? d.thalaChlore >= 0.4 && d.thalaChlore <= 1.4 : null;
  const thalaTempOk  = d.thalaTemp != null ? d.thalaTemp <= 32 : null;

  return (
    <Card>
      <BlockTitle emoji="🌊" label="Piscines" color={TV.cyan} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1, minHeight: 0 }}>
        {/* Hôtel */}
        <div style={{ background: "rgba(0,199,190,0.06)", borderRadius: 10, padding: "10px 12px", border: `1px solid rgba(0,199,190,0.12)` }}>
          <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, color: TV.cyan, textTransform: "uppercase", letterSpacing: "0.8px" }}>Piscine Hôtel</p>
          <Stat label="Température" value={d.hotelTemp != null ? `${d.hotelTemp.toFixed(1)} °C` : "—"} ok={hotelTempOk} />
          <Stat label="Chlore" value={d.hotelChlore != null ? `${d.hotelChlore.toFixed(2)} mg/L` : "—"} ok={hotelChlorOk} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 11, color: TV.sub }}>SWAN</span>
            {d.hotelSwan === "ok" ? (
              <span style={{ fontSize: 11, fontWeight: 800, color: TV.green }}>✓ OK</span>
            ) : d.hotelSwan === "nok" ? (
              <span style={{ fontSize: 11, fontWeight: 800, color: TV.red }}>✗ NOK</span>
            ) : (
              <span style={{ fontSize: 11, color: TV.sub }}>—</span>
            )}
          </div>
        </div>
        {/* Thalasso */}
        <div style={{ background: "rgba(0,199,190,0.06)", borderRadius: 10, padding: "10px 12px", border: `1px solid rgba(0,199,190,0.12)` }}>
          <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, color: TV.cyan, textTransform: "uppercase", letterSpacing: "0.8px" }}>Piscine Thalasso</p>
          <Stat label="T° échange" value={d.thalaTemp != null ? `${d.thalaTemp.toFixed(1)} °C` : "—"} ok={thalaTempOk} />
          <Stat label="Chlore" value={d.thalaChlore != null ? `${d.thalaChlore.toFixed(2)} mg/L` : "—"} ok={thalaChlorOk} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 11, color: TV.sub }}>Hypochlorite</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: TV.text }}>
              {d.thalaHypo != null ? `${d.thalaHypo.toFixed(1)} L` : "—"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── BLOC RONDES ───────────────────────────────────────────────────────────────

function RondeCard({ type, ronde }: { type: "ouverture" | "fermeture"; ronde: RondeSummary }) {
  const now   = new Date();
  const heure = now.getHours();
  const isLate = type === "ouverture" ? heure >= 10 : heure >= 19;
  const isPending = type === "ouverture" ? heure < 10 : heure < 17;

  if (ronde) {
    return (
      <div style={{ flex: 1, background: "rgba(52,199,89,0.1)", border: `1px solid rgba(52,199,89,0.2)`, borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: TV.green, textTransform: "uppercase", letterSpacing: "0.6px" }}>{type === "ouverture" ? "Ouverture" : "Fermeture"}</span>
        </div>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TV.text, fontVariantNumeric: "tabular-nums" }}>{fmtTime(ronde.date_heure)}</p>
        <p style={{ margin: 0, fontSize: 11, color: TV.sub }}>par {ronde.prenom}</p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div style={{ flex: 1, background: "rgba(110,110,138,0.1)", border: `1px solid rgba(110,110,138,0.2)`, borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>⏳</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: TV.sub, textTransform: "uppercase", letterSpacing: "0.6px" }}>{type === "ouverture" ? "Ouverture" : "Fermeture"}</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: TV.sub }}>En attente</p>
      </div>
    );
  }

  // Late
  return (
    <div style={{ flex: 1, background: "rgba(255,59,48,0.1)", border: `1px solid rgba(255,59,48,0.3)`, borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4, animation: "pulse 2s infinite" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 16 }}>❌</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: TV.red, textTransform: "uppercase", letterSpacing: "0.6px" }}>{type === "ouverture" ? "Ouverture" : "Fermeture"}</span>
      </div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TV.red }}>Non effectuée</p>
    </div>
  );
}

function BlocRondes({ d }: { d: TVData }) {
  const jours = ["L", "M", "M", "J", "V", "S", "D"];
  return (
    <Card>
      <BlockTitle emoji="🔄" label="Rondes du jour" color={TV.violet} />
      <div style={{ display: "flex", gap: 8, flex: 1, minHeight: 0 }}>
        <RondeCard type="ouverture" ronde={d.rondeOuverture} />
        <RondeCard type="fermeture" ronde={d.rondeFermeture} />
      </div>
      {/* Historique 5 jours */}
      <div style={{ marginTop: 10, display: "flex", gap: 6, justifyContent: "center" }}>
        {d.rondesHistorique.map((day) => {
          const dow = new Date(day.date + "T12:00:00").getDay();
          return (
            <div key={day.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 9, color: TV.sub, fontWeight: 600 }}>{jours[dow]}</span>
              <div style={{ display: "flex", gap: 2 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: day.ouverture ? TV.green : TV.red }} title="Ouverture" />
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: day.fermeture ? TV.green : TV.red }} title="Fermeture" />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── BLOC FUEL ─────────────────────────────────────────────────────────────────

function BlocFuel({ d }: { d: TVData }) {
  const niveau   = d.fuelNiveau ?? 0;
  const pct      = Math.min(100, Math.round((niveau / CUVE_CAPACITY) * 100));
  const autonomie = niveau > 0 ? Math.round(niveau / DEFAULT_CONSO) : 0;
  const isBas    = niveau < SEUIL_ROUGE;
  const isMoyen  = !isBas && niveau < SEUIL_ORANGE;
  const barColor = isBas ? TV.red : isMoyen ? TV.orange : TV.green;

  return (
    <Card style={{ border: isBas ? `1px solid ${TV.red}` : `1px solid ${TV.border}`, animation: isBas ? "borderPulse 2s infinite" : undefined }}>
      <BlockTitle emoji="⛽" label="Suivi Fuel" color={TV.orange} />
      <div style={{ display: "flex", gap: 14, flex: 1, minHeight: 0, alignItems: "stretch" }}>
        {/* Gauge verticale */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: 18, flex: 1, minHeight: 60, background: "rgba(255,255,255,0.06)", borderRadius: 6, overflow: "hidden", position: "relative", display: "flex", alignItems: "flex-end" }}>
            <div style={{
              width: "100%",
              height: `${pct}%`,
              background: `linear-gradient(to top, ${barColor}, ${barColor}aa)`,
              borderRadius: 6,
              transition: "height 1s ease",
            }} />
          </div>
          <span style={{ fontSize: 9, color: TV.sub, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
        </div>
        {/* Infos */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: barColor, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
            {fmtNum(niveau)} L
          </p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TV.sub }}>
            Autonomie ~{autonomie} jours
          </p>
          {d.fuelDate && (
            <p style={{ margin: 0, fontSize: 10, color: TV.sub }}>
              Dernière ronde : il y a {heuresDepuis(d.fuelDate)}
            </p>
          )}
          {isBas && (
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: TV.red, animation: "blink 1s infinite" }}>
              ⚠️ COMMANDER
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── BLOC INTERVENTIONS ────────────────────────────────────────────────────────

const PRIORITE_COLORS: Record<string, string> = {
  urgente: TV.red,
  normale:  TV.orange,
};

const STATUT_LABELS: Record<string, string> = {
  a_traiter: "À traiter",
  en_cours:  "En cours",
};

function BlocInterventions({ d }: { d: TVData }) {
  const list = d.interventions.slice(0, 5);
  const more = d.interventions.length > 5 ? d.interventions.length - 5 : 0;

  return (
    <Card>
      <BlockTitle emoji="🔧" label="Interventions en cours" color={TV.red} />
      {list.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 28 }}>✅</span>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: TV.green }}>Aucune intervention en cours</p>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
          {list.map((iv) => (
            <div key={iv.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 7, borderLeft: `2px solid ${PRIORITE_COLORS[iv.priorite] ?? TV.sub}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: TV.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{iv.titre}</p>
                {iv.zone && <p style={{ margin: 0, fontSize: 9, color: TV.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{iv.zone}</p>}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: PRIORITE_COLORS[iv.priorite] ?? TV.sub, whiteSpace: "nowrap", flexShrink: 0 }}>
                {STATUT_LABELS[iv.statut] ?? iv.statut}
              </span>
            </div>
          ))}
          {more > 0 && (
            <p style={{ margin: 0, fontSize: 10, color: TV.sub, textAlign: "center", paddingTop: 2 }}>+{more} autre{more > 1 ? "s" : ""}</p>
          )}
        </div>
      )}
    </Card>
  );
}

// ── BLOC SET ALERTES ──────────────────────────────────────────────────────────

function BlocSetAlertes({ d }: { d: TVData & { setEnRetardCount: number; setEnAlerteCount: number } }) {
  const conformite = d.setTotal > 0 ? Math.round((d.setOk / d.setTotal) * 100) : 100;
  const confColor  = conformite >= 80 ? TV.green : conformite >= 60 ? TV.orange : TV.red;

  return (
    <Card>
      <BlockTitle emoji="📋" label="Contrôles SET — Alertes" color={TV.blue} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* En retard */}
        <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.15)", borderRadius: 10, padding: "8px 10px" }}>
          <p style={{ margin: "0 0 4px", fontSize: 9, color: TV.sub, textTransform: "uppercase", letterSpacing: "0.6px" }}>En retard</p>
          <p style={{ margin: "0 0 6px", fontSize: 32, fontWeight: 800, color: TV.red, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{d.setEnRetardCount}</p>
          {d.setEnRetard.map((s, i) => (
            <p key={i} style={{ margin: "2px 0 0", fontSize: 10, color: "#FCA5A5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.nom} · <span style={{ fontWeight: 700 }}>{joursLabel(s.jours, "de retard")}</span>
            </p>
          ))}
        </div>
        {/* En alerte J-30 */}
        <div style={{ background: "rgba(255,149,0,0.08)", border: "1px solid rgba(255,149,0,0.15)", borderRadius: 10, padding: "8px 10px" }}>
          <p style={{ margin: "0 0 4px", fontSize: 9, color: TV.sub, textTransform: "uppercase", letterSpacing: "0.6px" }}>Alerte J-30</p>
          <p style={{ margin: "0 0 6px", fontSize: 32, fontWeight: 800, color: TV.orange, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{d.setEnAlerteCount}</p>
          {d.setEnAlerte.map((s, i) => (
            <p key={i} style={{ margin: "2px 0 0", fontSize: 10, color: "#FCD34D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.nom} · <span style={{ fontWeight: 700 }}>{joursLabel(s.jours, "restants")}</span>
            </p>
          ))}
        </div>
      </div>
      {/* Barre conformité */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: TV.sub, textTransform: "uppercase", letterSpacing: "0.5px" }}>Conformité</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: confColor }}>{conformite}%</span>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${conformite}%`, background: confColor, borderRadius: 2, transition: "width 1s ease" }} />
        </div>
      </div>
    </Card>
  );
}

// ── TICKER ────────────────────────────────────────────────────────────────────

function Ticker({ d }: { d: TVData }) {
  const fuelPct = d.fuelNiveau != null ? Math.round((d.fuelNiveau / CUVE_CAPACITY) * 100) : null;
  const fuelAuto = d.fuelNiveau != null ? Math.round(d.fuelNiveau / DEFAULT_CONSO) : null;

  const items = [
    d.ncMajeures > 0 ? `⚠️ ${d.ncMajeures} NC majeure${d.ncMajeures > 1 ? "s" : ""} ouverte${d.ncMajeures > 1 ? "s" : ""}` : "✅ Aucune NC majeure",
    `💶 Dépenses ce mois : ${fmtEur(d.depensesMois)}`,
    fuelPct != null ? `⛽ Fuel : ${fuelPct}% — Autonomie ~${fuelAuto} jours` : "⛽ Fuel : données indisponibles",
    `🔧 ${d.interventions.length} intervention${d.interventions.length > 1 ? "s" : ""} en cours`,
    d.derniereRonde ? `✅ Dernière ronde : il y a ${heuresDepuis(d.derniereRonde.date_heure)} par ${d.derniereRonde.prenom}` : "⏳ Aucune ronde récente",
    `📋 Conformité SET : ${d.setTotal > 0 ? Math.round((d.setOk / d.setTotal) * 100) : 100}%`,
  ];

  const text = items.join("     ·     ");

  return (
    <div style={{
      background: "#0D0D15",
      borderTop: `1px solid ${TV.border}`,
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      paddingLeft: 0,
    }}>
      <div style={{
        display: "flex",
        whiteSpace: "nowrap",
        animation: "tickerScroll 40s linear infinite",
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: TV.sub, padding: "0 40px" }}>{text}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: TV.sub, padding: "0 40px" }}>{text}</span>
      </div>
    </div>
  );
}

// ── HEADER ────────────────────────────────────────────────────────────────────

function TVHeader({ clock }: { clock: Date }) {
  const dateLong = clock.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeLong = clock.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateCapitalized = dateLong.charAt(0).toUpperCase() + dateLong.slice(1);

  return (
    <div style={{
      background: "#111118",
      borderBottom: `1px solid ${TV.border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #2563EB, #7C3AED)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
            🔧
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: TV.text, letterSpacing: "-0.5px" }}>TechOps</span>
        </div>
        <span style={{ fontSize: 9, color: TV.sub, fontWeight: 500 }}>Sofitel Golfe d'Ajaccio — Salle Technique</span>
      </div>

      {/* Horloge */}
      <div style={{ textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 11, color: TV.sub, marginBottom: 1 }}>{dateCapitalized}</p>
        <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: TV.text, fontVariantNumeric: "tabular-nums", lineHeight: 1, letterSpacing: "-1px" }}>{timeLong}</p>
      </div>

      {/* Statut rapide */}
      <div style={{ textAlign: "right" }}>
        <p style={{ margin: 0, fontSize: 9, color: TV.sub, textTransform: "uppercase", letterSpacing: "0.6px" }}>Mode affichage</p>
        <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end", marginTop: 3 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: TV.green, animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: TV.green }}>EN DIRECT</span>
        </div>
        <p style={{ margin: "3px 0 0", fontSize: 9, color: TV.sub }}>Actualisation toutes les 30s</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TVDashboard() {
  const data  = useTVData();
  const clock = useLiveClock();

  if (!data) {
    return (
      <div style={{ width: "100vw", height: "100vh", background: TV.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${TV.blue}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ margin: 0, fontSize: 13, color: TV.sub }}>Chargement du tableau de bord…</p>
      </div>
    );
  }

  const d = data as TVData & { setEnRetardCount: number; setEnAlerteCount: number };

  return (
    <>
      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }
        @keyframes borderPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,59,48,0.4); }
          50%       { box-shadow: 0 0 0 6px rgba(255,59,48,0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{
        width: "100vw",
        height: "100vh",
        background: TV.bg,
        color: TV.text,
        fontFamily: "var(--font-inter, system-ui, sans-serif)",
        display: "grid",
        gridTemplateRows: "60px 1fr 44px",
        overflow: "hidden",
      }}>
        {/* Header */}
        <TVHeader clock={clock} />

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "8px", minHeight: 0, overflow: "hidden" }}>
          {/* Colonne gauche : Piscines + Rondes */}
          <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 8, minHeight: 0 }}>
            <BlocPiscines d={d} />
            <BlocRondes d={d} />
          </div>

          {/* Colonne droite : Fuel + Interventions + SET */}
          <div style={{ display: "grid", gridTemplateRows: "1fr 1fr 1fr", gap: 8, minHeight: 0 }}>
            <BlocFuel d={d} />
            <BlocInterventions d={d} />
            <BlocSetAlertes d={d} />
          </div>
        </div>

        {/* Ticker */}
        <Ticker d={d} />
      </div>
    </>
  );
}
