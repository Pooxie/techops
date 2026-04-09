"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, ChevronRight, ExternalLink } from "lucide-react";
import Header from "@/components/layout/Header";
import { createClient, getCurrentUserProfile } from "@/lib/supabase";
import { normalizeDonneesRonde } from "@/lib/rondes";

// ── Zone definitions ──────────────────────────────────────────────────────────

type RoomRange = [number, number];

type ZoneDef = {
  id:         string;
  label:      string;
  sub:        string;
  left:       number;
  top:        number;
  width:      number;
  height:     number;
  color:      string;
  bg:         string;
  roomRanges: RoomRange[];
};

const CANVAS_W = 695;
const CANVAS_H = 470;

const ZONES: ZoneDef[] = [
  {
    id: "ajaccio", label: "AILE AJACCIO", sub: "38 ch. · 101–119 / 201–219",
    left: 0, top: 0, width: 570, height: 130,
    color: "#BF5AF2", bg: "#1A1A2E",
    roomRanges: [[101, 119], [201, 219]],
  },
  {
    id: "parking", label: "PARKING", sub: "Accès · Barrière",
    left: 578, top: 0, width: 110, height: 180,
    color: "#2563EB", bg: "#161624",
    roomRanges: [],
  },
  {
    id: "piscine", label: "PISCINE HÔTEL", sub: "Sous-station · SWAN",
    left: 0, top: 137, width: 160, height: 155,
    color: "#00C7BE", bg: "#0A1A2A",
    roomRanges: [],
  },
  {
    id: "aile-piscine", label: "AILE PISCINE", sub: "38 ch. · 120–138 / 220–238",
    left: 169, top: 139, width: 210, height: 80,
    color: "#BF5AF2", bg: "#1A1A2E",
    roomRanges: [[120, 138], [220, 238]],
  },
  {
    id: "hall", label: "HALL", sub: "Réception · ARM",
    left: 390, top: 137, width: 80, height: 120,
    color: "#FF9500", bg: "#1E1A10",
    roomRanges: [],
  },
  {
    id: "technique", label: "TECHNIQUE", sub: "Chaufferie · DC · Fuel",
    left: 479, top: 135, width: 90, height: 120,
    color: "#FF9500", bg: "#1C1400",
    roomRanges: [],
  },
  {
    id: "thalasso", label: "THALASSO SPA", sub: "Bâches EMF · EMC",
    left: 40, top: 328, width: 155, height: 130,
    color: "#00C7BE", bg: "#0A1A2A",
    roomRanges: [],
  },
  {
    id: "thalasso-aile", label: "AILE THALASSO", sub: "32 ch. · 140–155 / 240–255",
    left: 200, top: 328, width: 210, height: 80,
    color: "#BF5AF2", bg: "#1A1A2E",
    roomRanges: [[140, 155], [240, 255]],
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

export type ZoneStatus = "ok" | "alerte" | "retard";

type InterventionRow = {
  id: string;
  titre: string;
  priorite: string;
  statut: string;
  zone: string | null;
  numero_chambre: string | null;
  created_at: string;
};

type SetRow = {
  id: string;
  nom: string;
  statut: string;
  date_prochaine: string | null;
  categorie_nom: string;
};

type NcRow = {
  id: string;
  titre: string;
  gravite: string;
  statut: string;
  numero_chambre: string | null;
  zone: string | null;
};

type PlanData = {
  interventions:  InterventionRow[];
  rondeLastDonnees: ReturnType<typeof normalizeDonneesRonde> | null;
  rondeDate:      string | null;
  setAlerts:      SetRow[];
  ncs:            NcRow[];
  fuelNiveau:     number | null;
};

// ── Data hook ─────────────────────────────────────────────────────────────────

function usePlanData() {
  const [data, setData] = useState<PlanData | null>(null);

  const load = useCallback(async () => {
    const supabase  = createClient();
    const profile   = await getCurrentUserProfile();
    if (!profile) return;
    const hotelId   = profile.hotel_id;

    const debutJour = new Date(); debutJour.setHours(0, 0, 0, 0);

    const [ivRes, rondeRes, setRes, ncRes, fuelRes] = await Promise.all([
      supabase
        .from("interventions")
        .select("id, titre, priorite, statut, zone, numero_chambre, created_at")
        .eq("hotel_id", hotelId)
        .neq("statut", "cloturee")
        .order("created_at", { ascending: false }),

      supabase
        .from("rondes")
        .select("donnees, date_heure")
        .eq("hotel_id", hotelId)
        .gte("date_heure", debutJour.toISOString())
        .order("date_heure", { ascending: false })
        .limit(1),

      supabase
        .from("set_controles")
        .select("id, nom, statut, date_prochaine, set_categories(nom)")
        .eq("hotel_id", hotelId)
        .in("statut", ["retard", "alerte"]),

      supabase
        .from("non_conformites")
        .select("id, titre, gravite, statut, numero_chambre, zone")
        .eq("hotel_id", hotelId)
        .eq("statut", "ouverte"),

      supabase
        .from("rondes")
        .select("date_heure, donnees")
        .eq("hotel_id", hotelId)
        .not("donnees->niveau_fuel", "is", null)
        .order("date_heure", { ascending: false })
        .limit(1),
    ]);

    const setAlerts: SetRow[] = (setRes.data ?? []).map((r) => ({
      id:            r.id,
      nom:           r.nom,
      statut:        r.statut,
      date_prochaine:r.date_prochaine,
      categorie_nom: (r.set_categories as unknown as { nom: string } | null)?.nom ?? "",
    }));

    const rondeRow = rondeRes.data?.[0];
    const rondeLastDonnees = rondeRow ? normalizeDonneesRonde(rondeRow.donnees) : null;

    const fuelRow = fuelRes.data?.[0];
    let fuelNiveau: number | null = null;
    if (fuelRow) {
      const fd = normalizeDonneesRonde(fuelRow.donnees);
      fuelNiveau = (fd.niveau_fuel as { niveau_fuel?: number } | null)?.niveau_fuel ?? null;
    }

    setData({
      interventions:  (ivRes.data ?? []) as InterventionRow[],
      rondeLastDonnees,
      rondeDate:      rondeRow?.date_heure ?? null,
      setAlerts,
      ncs:            (ncRes.data ?? []) as NcRow[],
      fuelNiveau,
    });
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [load]);

  return data;
}

// ── Status computation ────────────────────────────────────────────────────────

function roomInRange(chambre: string | null, ranges: RoomRange[]): boolean {
  if (!chambre || ranges.length === 0) return false;
  const n = parseInt(chambre, 10);
  if (isNaN(n)) return false;
  return ranges.some(([min, max]) => n >= min && n <= max);
}

const TECHNIQUE_CATS = ["chaufferie", "thermique", "cvc", "combustion", "fuel", "chaudière"];

function computeStatus(zone: ZoneDef, data: PlanData): ZoneStatus {
  const iv   = data.interventions;
  const sets = data.setAlerts;
  const d    = data.rondeLastDonnees;

  switch (zone.id) {
    case "ajaccio":
    case "aile-piscine":
    case "thalasso-aile": {
      const zoneIv = iv.filter((i) => roomInRange(i.numero_chambre, zone.roomRanges));
      const urgent = zoneIv.filter((i) => i.priorite === "urgente").length;
      if (urgent > 2) return "retard";
      if (urgent > 0) return "alerte";
      return "ok";
    }
    case "piscine": {
      const temp  = d?.piscine_hotel?.temperature;
      const chlor = d?.piscine_hotel?.concentration_chlore;
      if (
        (temp != null && (temp < 24 || temp > 30)) ||
        (chlor != null && (chlor < 0.4 || chlor > 1.4))
      ) return "alerte";
      return "ok";
    }
    case "thalasso": {
      const temp = d?.piscine_thalasso?.temp_echange;
      if (temp != null && temp > 32) return "alerte";
      return "ok";
    }
    case "technique": {
      const techSets = sets.filter((s) =>
        TECHNIQUE_CATS.some((k) => s.categorie_nom.toLowerCase().includes(k)),
      );
      if (techSets.some((s) => s.statut === "retard")) return "retard";
      const fuelPct = data.fuelNiveau != null ? (data.fuelNiveau / 30_000) * 100 : 100;
      if (fuelPct < 25 || techSets.length > 0) return "alerte";
      return "ok";
    }
    case "hall": {
      const hallIv = iv.filter((i) => !i.numero_chambre && i.priorite === "urgente");
      if (hallIv.length > 2) return "retard";
      if (hallIv.length > 0) return "alerte";
      return "ok";
    }
    case "parking": {
      const parkIv = iv.filter((i) =>
        i.zone?.toLowerCase().includes("parking") ||
        i.titre.toLowerCase().includes("parking"),
      );
      if (parkIv.some((i) => i.priorite === "urgente")) return "alerte";
      return "ok";
    }
    default:
      return "ok";
  }
}

const STATUS_COLOR: Record<ZoneStatus, string> = {
  ok:     "#34C759",
  alerte: "#FF9500",
  retard: "#FF3B30",
};

const STATUS_LABEL: Record<ZoneStatus, string> = {
  ok:     "OK",
  alerte: "Alerte",
  retard: "En retard",
};

// ── Zone rectangle ────────────────────────────────────────────────────────────

function ZoneRect({
  zone, status, selected, onClick,
}: {
  zone: ZoneDef; status: ZoneStatus; selected: boolean; onClick: () => void;
}) {
  const anim = status === "retard" ? "zoneRetard 1.4s infinite" : status === "alerte" ? "zoneAlert 2s infinite" : undefined;
  const borderColor = status === "ok" ? zone.color : STATUS_COLOR[status];

  return (
    <button
      onClick={onClick}
      style={{
        position:     "absolute",
        left:         zone.left,
        top:          zone.top,
        width:        zone.width,
        height:       zone.height,
        background:   zone.bg,
        border:       `1.5px solid ${borderColor}`,
        borderRadius: 8,
        cursor:       "pointer",
        padding:      "8px 10px",
        textAlign:    "left",
        display:      "flex",
        flexDirection:"column",
        justifyContent:"space-between",
        outline:      selected ? `2px solid ${zone.color}` : "none",
        outlineOffset: 2,
        animation:    anim,
        transition:   "opacity 0.15s",
        opacity:      selected ? 1 : 0.92,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
      onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.opacity = "0.92"; }}
    >
      {/* Top row: status dot */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ margin: 0, fontSize: zone.width < 100 ? 8 : 10, fontWeight: 800, color: zone.color, letterSpacing: "0.8px", textTransform: "uppercase", lineHeight: 1.2 }}>
            {zone.label}
          </p>
          {zone.width >= 120 && (
            <p style={{ margin: "2px 0 0", fontSize: 9, color: "rgba(255,255,255,0.45)", lineHeight: 1.2 }}>
              {zone.sub}
            </p>
          )}
        </div>
        <div style={{
          width:  8, height: 8, borderRadius: "50%",
          background: STATUS_COLOR[status],
          flexShrink: 0, marginLeft: 4, marginTop: 2,
          boxShadow: `0 0 6px ${STATUS_COLOR[status]}`,
        }} />
      </div>
      {/* Badge if alerte/retard */}
      {status !== "ok" && zone.height >= 80 && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          padding: "2px 6px", borderRadius: 5,
          background: `${STATUS_COLOR[status]}22`,
          border: `1px solid ${STATUS_COLOR[status]}44`,
          width: "fit-content",
        }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: STATUS_COLOR[status], textTransform: "uppercase" }}>
            {STATUS_LABEL[status]}
          </span>
        </div>
      )}
    </button>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

function DrawerKpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#F5F5F7", borderRadius: 12, padding: "14px 16px" }}>
      <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: color ?? "#1D1D1F", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#8E8E93" }}>{sub}</p>}
    </div>
  );
}

function DrawerIvRow({ iv }: { iv: InterventionRow }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", marginTop: 6, flexShrink: 0, background: iv.priorite === "urgente" ? "#FF3B30" : "#FF9500" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1D1D1F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{iv.titre}</p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6E6E73" }}>
          {iv.numero_chambre ? `Ch. ${iv.numero_chambre} · ` : ""}
          {iv.statut === "en_cours" ? "En cours" : "À traiter"}
        </p>
      </div>
      {iv.priorite === "urgente" && (
        <span style={{ fontSize: 9, fontWeight: 700, color: "#FF3B30", background: "#FFF5F5", padding: "2px 6px", borderRadius: 4, flexShrink: 0 }}>URGENT</span>
      )}
    </div>
  );
}

function DrawerSetRow({ set }: { set: SetRow }) {
  const color = set.statut === "retard" ? "#FF3B30" : "#FF9500";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: color }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1D1D1F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{set.nom}</p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6E6E73" }}>{set.categorie_nom}</p>
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}15`, padding: "2px 7px", borderRadius: 4, flexShrink: 0, textTransform: "uppercase" }}>
        {set.statut}
      </span>
    </div>
  );
}

function ZoneDrawer({ zone, data, onClose }: { zone: ZoneDef; data: PlanData; onClose: () => void }) {
  const status  = computeStatus(zone, data);
  const iv      = data.interventions;
  const d       = data.rondeLastDonnees;
  const sets    = data.setAlerts;

  const statusColor = STATUS_COLOR[status];

  const zoneIv = zone.roomRanges.length > 0
    ? iv.filter((i) => roomInRange(i.numero_chambre, zone.roomRanges))
    : zone.id === "hall"
      ? iv.filter((i) => !i.numero_chambre)
      : zone.id === "parking"
        ? iv.filter((i) => i.zone?.toLowerCase().includes("parking") || i.titre.toLowerCase().includes("parking"))
        : zone.id === "technique"
          ? iv.filter((i) => i.zone?.toLowerCase().includes("tech") || i.titre.toLowerCase().includes("fuel") || i.titre.toLowerCase().includes("chaudière"))
          : [];

  const techSets = sets.filter((s) =>
    TECHNIQUE_CATS.some((k) => s.categorie_nom.toLowerCase().includes(k)),
  );
  const fuelPct = data.fuelNiveau != null ? Math.round((data.fuelNiveau / 30_000) * 100) : null;
  const zoneNcCount = zone.roomRanges.length > 0
    ? data.ncs.filter((n) => roomInRange(n.numero_chambre, zone.roomRanges)).length
    : 0;

  // KPIs per zone type
  const kpis: React.ReactNode = (() => {
    if (["ajaccio", "aile-piscine", "thalasso-aile"].includes(zone.id)) {
      const totalRooms = zone.roomRanges.reduce((s, [a, b]) => s + (b - a + 1), 0) * 2;
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <DrawerKpi label="Chambres" value={String(totalRooms)} />
          <DrawerKpi label="Interventions" value={String(zoneIv.length)} color={zoneIv.length > 0 ? "#FF9500" : "#34C759"} sub="en cours" />
          <DrawerKpi label="NC ouvertes" value={String(zoneNcCount)} color={zoneNcCount > 0 ? "#FF3B30" : "#34C759"} />
        </div>
      );
    }
    if (zone.id === "piscine") {
      const temp  = d?.piscine_hotel?.temperature;
      const chlor = d?.piscine_hotel?.concentration_chlore;
      const swan  = d?.piscine_hotel?.controle_swan;
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <DrawerKpi label="Température" value={temp != null ? `${temp.toFixed(1)}°C` : "—"} color={temp != null && (temp < 24 || temp > 30) ? "#FF3B30" : "#34C759"} />
          <DrawerKpi label="Chlore" value={chlor != null ? `${chlor.toFixed(2)} mg/L` : "—"} color={chlor != null && (chlor < 0.4 || chlor > 1.4) ? "#FF3B30" : "#34C759"} />
          <DrawerKpi label="SWAN" value={swan === "ok" ? "✓ OK" : swan === "nok" ? "✗ NOK" : "—"} color={swan === "ok" ? "#34C759" : swan === "nok" ? "#FF3B30" : "#8E8E93"} />
        </div>
      );
    }
    if (zone.id === "thalasso") {
      const temp = d?.piscine_thalasso?.temp_echange;
      const chlor = d?.piscine_thalasso?.concentration_chlore;
      const hypo  = d?.piscine_thalasso?.niveau_hypochlorite;
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <DrawerKpi label="T° Échange" value={temp != null ? `${temp.toFixed(1)}°C` : "—"} color={temp != null && temp > 32 ? "#FF3B30" : "#34C759"} />
          <DrawerKpi label="Chlore" value={chlor != null ? `${chlor.toFixed(2)} mg/L` : "—"} color={chlor != null && (chlor < 0.4 || chlor > 1.4) ? "#FF3B30" : "#34C759"} />
          <DrawerKpi label="Hypochlorite" value={hypo != null ? `${hypo.toFixed(0)} L` : "—"} />
        </div>
      );
    }
    if (zone.id === "technique") {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <DrawerKpi label="Fuel" value={fuelPct != null ? `${fuelPct}%` : "—"} color={fuelPct != null && fuelPct < 25 ? "#FF3B30" : fuelPct != null && fuelPct < 50 ? "#FF9500" : "#34C759"} sub={data.fuelNiveau != null ? `${Math.round(data.fuelNiveau / 400)} jours` : undefined} />
          <DrawerKpi label="SET en retard" value={String(techSets.filter((s) => s.statut === "retard").length)} color={techSets.some((s) => s.statut === "retard") ? "#FF3B30" : "#34C759"} />
          <DrawerKpi label="SET en alerte" value={String(techSets.filter((s) => s.statut === "alerte").length)} color={techSets.some((s) => s.statut === "alerte") ? "#FF9500" : "#34C759"} />
        </div>
      );
    }
    if (zone.id === "hall") {
      const armOk:  true | null = null;
      const eclOk:  true | null = null;
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <DrawerKpi label="ARM Incendie" value={armOk === true ? "✓ OK" : armOk === false ? "✗ NOK" : "—"} color={armOk === true ? "#34C759" : "#8E8E93"} />
          <DrawerKpi label="Écl. secours" value={eclOk === true ? "✓ OK" : eclOk === false ? "✗ NOK" : "—"} color={eclOk === true ? "#34C759" : "#8E8E93"} />
          <DrawerKpi label="Interventions" value={String(zoneIv.length)} color={zoneIv.length > 0 ? "#FF9500" : "#34C759"} />
        </div>
      );
    }
    if (zone.id === "parking") {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <DrawerKpi label="Interventions" value={String(zoneIv.length)} color={zoneIv.length > 0 ? "#FF9500" : "#34C759"} />
          <DrawerKpi label="Statut" value={status === "ok" ? "✓ OK" : "⚠ Alerte"} color={statusColor} />
        </div>
      );
    }
    return null;
  })();

  // List content per zone
  const listItems: React.ReactNode = (() => {
    if (["ajaccio", "aile-piscine", "thalasso-aile", "hall", "parking"].includes(zone.id)) {
      if (zoneIv.length === 0) {
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: "#34C759" }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Aucune intervention en cours</span>
          </div>
        );
      }
      return zoneIv.slice(0, 8).map((iv) => <DrawerIvRow key={iv.id} iv={iv} />);
    }
    if (zone.id === "technique") {
      if (techSets.length === 0) {
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", color: "#34C759" }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Aucun contrôle en retard</span>
          </div>
        );
      }
      return techSets.map((s) => <DrawerSetRow key={s.id} set={s} />);
    }
    if (zone.id === "piscine" || zone.id === "thalasso") {
      const items = [
        zone.id === "piscine" ? { label: "Température eau", value: d?.piscine_hotel?.temperature != null ? `${d.piscine_hotel.temperature.toFixed(1)} °C` : "—" } : null,
        zone.id === "piscine" ? { label: "Concentration chlore", value: d?.piscine_hotel?.concentration_chlore != null ? `${d.piscine_hotel.concentration_chlore.toFixed(2)} mg/L` : "—" } : null,
        zone.id === "piscine" ? { label: "Niveau chlore cuve", value: d?.piscine_hotel?.niveau_chlore != null ? `${d.piscine_hotel.niveau_chlore.toFixed(1)} L` : "—" } : null,
        zone.id === "piscine" ? { label: "Débordement", value: d?.piscine_hotel?.debordement === "ok" ? "Non" : d?.piscine_hotel?.debordement === "nok" ? "Oui ⚠" : "—" } : null,
        zone.id === "thalasso" ? { label: "T° échange piscine", value: d?.piscine_thalasso?.temp_echange != null ? `${d.piscine_thalasso.temp_echange.toFixed(1)} °C` : "—" } : null,
        zone.id === "thalasso" ? { label: "Niveau hypochlorite", value: d?.piscine_thalasso?.niveau_hypochlorite != null ? `${d.piscine_thalasso.niveau_hypochlorite.toFixed(1)} L` : "—" } : null,
        zone.id === "thalasso" ? { label: "Concentration chlore", value: d?.piscine_thalasso?.concentration_chlore != null ? `${d.piscine_thalasso.concentration_chlore.toFixed(2)} mg/L` : "—" } : null,
        zone.id === "thalasso" ? { label: "Compteur débit", value: d?.piscine_thalasso?.compteur_debit != null ? `${d.piscine_thalasso.compteur_debit} m³/h` : "—" } : null,
      ].filter(Boolean) as { label: string; value: string }[];

      return items.map(({ label, value }) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          <span style={{ fontSize: 13, color: "#6E6E73" }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", fontVariantNumeric: "tabular-nums" }}>{value}</span>
        </div>
      ));
    }
    return null;
  })();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
      />
      {/* Drawer */}
      <div style={{
        position:   "fixed",
        right:      0, top: 0, bottom: 0,
        width:      400,
        zIndex:     201,
        background: "#FFFFFF",
        boxShadow:  "-8px 0 32px rgba(0,0,0,0.12)",
        display:    "flex",
        flexDirection: "column",
        overflowY:  "auto",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: zone.color, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                {zone.sub}
              </p>
              <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#1D1D1F" }}>{zone.label}</h2>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: `${statusColor}15`, border: `1px solid ${statusColor}40` }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>{STATUS_LABEL[status]}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8E8E93", padding: 4 }}>
              <X size={20} />
            </button>
          </div>
          {data.rondeDate && (
            <p style={{ margin: "10px 0 0", fontSize: 11, color: "#AEAEB2" }}>
              Données de la dernière ronde · {new Date(data.rondeDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>

        {/* KPIs */}
        <div style={{ padding: "16px 20px 0" }}>
          {kpis}
        </div>

        {/* List */}
        <div style={{ flex: 1, padding: "16px 20px 0" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.6px" }}>
            {["ajaccio", "aile-piscine", "thalasso-aile", "hall", "parking"].includes(zone.id)
              ? "Interventions en cours"
              : zone.id === "technique"
                ? "Contrôles SET"
                : "Derniers relevés"}
          </p>
          {listItems}
        </div>

        {/* CTA */}
        <div style={{ padding: "16px 20px 24px", borderTop: "1px solid rgba(0,0,0,0.06)", marginTop: 16 }}>
          <Link
            href={`/interventions${zone.roomRanges.length > 0 ? "?zone=" + zone.id : ""}`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "12px", borderRadius: 12,
              background: "#2563EB", color: "#FFF",
              fontSize: 13, fontWeight: 700, textDecoration: "none",
            }}
          >
            Voir toutes les interventions
            <ChevronRight size={14} />
          </Link>
          {(zone.id === "piscine" || zone.id === "thalasso") && (
            <Link
              href="/piscine"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "11px", borderRadius: 12, marginTop: 8,
                border: "1px solid rgba(0,0,0,0.1)", color: "#1D1D1F",
                fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}
            >
              Registre sanitaire
              <ExternalLink size={13} />
            </Link>
          )}
          {zone.id === "technique" && (
            <Link
              href="/fuel"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "11px", borderRadius: 12, marginTop: 8,
                border: "1px solid rgba(0,0,0,0.1)", color: "#1D1D1F",
                fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}
            >
              Suivi Fuel
              <ExternalLink size={13} />
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

// ── Canvas with scale ─────────────────────────────────────────────────────────

function HotelCanvas({ data, selectedId, onSelect }: {
  data: PlanData;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function update() {
      if (!wrapRef.current) return;
      const available = wrapRef.current.clientWidth;
      setScale(Math.min(1, available / CANVAS_W));
    }
    update();
    const obs = new ResizeObserver(update);
    if (wrapRef.current) obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      {/* Container that shrinks to scaled height */}
      <div style={{ position: "relative", height: CANVAS_H * scale, overflow: "hidden" }}>
        {/* Canvas at natural size, then scaled */}
        <div style={{
          position:        "absolute",
          top:             0, left: 0,
          width:           CANVAS_W,
          height:          CANVAS_H,
          transform:       `scale(${scale})`,
          transformOrigin: "top left",
          background:      "#0A0A0F",
          borderRadius:    12 / scale,
        }}>
          {/* Compass / label */}
          <div style={{ position: "absolute", right: 578, top: 185, width: 80, height: 140, background: "#0F0F17", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textAlign: "center", lineHeight: 1.6 }}>COULOIR<br />CENTRAL</span>
          </div>
          <div style={{ position: "absolute", left: 0, top: 295, width: 40, height: 30, background: "#0F0F17", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 7, color: "rgba(255,255,255,0.2)" }}>SAS</span>
          </div>

          {ZONES.map((zone) => {
            const status = computeStatus(zone, data);
            return (
              <ZoneRect
                key={zone.id}
                zone={zone}
                status={status}
                selected={selectedId === zone.id}
                onClick={() => onSelect(selectedId === zone.id ? null : zone.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      {([["#34C759", "Tout OK"], ["#FF9500", "Alerte"], ["#FF3B30", "En retard"]] as const).map(([c, l]) => (
        <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: `0 0 5px ${c}` }} />
          <span style={{ fontSize: 11, color: "#6E6E73", fontWeight: 500 }}>{l}</span>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34C759", animation: "liveDot 2s infinite" }} />
        <span style={{ fontSize: 11, color: "#6E6E73" }}>EN DIRECT · actualisation 60s</span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlanPage() {
  const data       = usePlanData();
  const [selId, setSelId] = useState<string | null>(null);

  const selectedZone = selId ? ZONES.find((z) => z.id === selId) : null;

  return (
    <>
      <style>{`
        @keyframes zoneAlert {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,149,0,.4); }
          50%       { box-shadow: 0 0 0 6px rgba(255,149,0,0); }
        }
        @keyframes zoneRetard {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,59,48,.5); }
          50%       { box-shadow: 0 0 0 8px rgba(255,59,48,0); }
        }
        @keyframes liveDot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#F5F5F7" }}>
        <Header title="Plan de l'hôtel" />

        <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }} className="page-main">

          {/* Page header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1D1D1F" }}>Plan de l'hôtel</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6E6E73" }}>
                Sofitel Golfe d'Ajaccio · Jumeau numérique temps réel
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, background: "#F0FBF3", border: "1px solid #BBF7D0" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34C759", animation: "liveDot 2s infinite" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#15803D" }}>EN DIRECT</span>
            </div>
          </div>

          {/* Canvas card */}
          <div style={{
            background: "#FFFFFF",
            borderRadius: 18,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}>
            {/* Top bar */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <Legend />
              {selId && (
                <button
                  onClick={() => setSelId(null)}
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6E6E73", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <X size={13} />
                  Désélectionner
                </button>
              )}
            </div>

            {/* Canvas */}
            <div style={{ padding: "16px 18px 20px" }}>
              {!data ? (
                <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#AEAEB2", gap: 10 }}>
                  <div style={{ width: 18, height: 18, border: "2px solid #2563EB", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <span style={{ fontSize: 13 }}>Chargement du plan…</span>
                </div>
              ) : (
                <HotelCanvas data={data} selectedId={selId} onSelect={setSelId} />
              )}
            </div>
          </div>

          {/* Summary strip */}
          {data && (
            <div style={{ display: "grid", gap: 12 }} className="grid-3-resp">
              {[
                { label: "Interventions en cours", value: data.interventions.length, color: data.interventions.length > 0 ? "#FF9500" : "#34C759" },
                { label: "Contrôles SET en retard", value: data.setAlerts.filter((s) => s.statut === "retard").length, color: data.setAlerts.some((s) => s.statut === "retard") ? "#FF3B30" : "#34C759" },
                { label: "NC majeures ouvertes", value: data.ncs.filter((n) => n.gravite === "majeure").length, color: data.ncs.some((n) => n.gravite === "majeure") ? "#FF3B30" : "#34C759" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "#FFFFFF", borderRadius: 14, padding: "16px 18px", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{value}</p>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>

      {/* Drawer */}
      {selectedZone && data && (
        <ZoneDrawer zone={selectedZone} data={data} onClose={() => setSelId(null)} />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
