"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sunrise, Sunset, CheckCircle, AlertCircle, History, ChevronRight } from "lucide-react";
import Header from "@/components/layout/Header";
import {
  fetchRondesTodayWithDonnees,
  fetchRondesHistoriqueWithDonnees,
  fetchRondesKPI,
  type RondeWithDonnees,
  type RondesKPI,
  type DonneesRonde,
} from "@/lib/supabase";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function isLate(type: "ouverture" | "fermeture") {
  const h = new Date().getHours();
  return type === "ouverture" ? h >= 10 : h >= 20;
}

// ── Dot indicateur de valeur ─────────────────────────────────────────────────

function Dot({ ok }: { ok: boolean | null }) {
  const color = ok === null ? "#C7C7CC" : ok ? "#34C759" : "#FF3B30";
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8,
      borderRadius: "50%", backgroundColor: color, flexShrink: 0,
    }} />
  );
}

function isPhOk(v: number | null) {
  if (v === null) return null;
  return v >= 7.2 && v <= 7.6;
}
function isChloreOk(v: number | null) {
  if (v === null) return null;
  return v >= 0.4 && v <= 1.4;
}
function isEcsOk(v: number | null) {
  if (v === null) return null;
  return v >= 55 && v <= 65;
}

function KeyValues({ donnees }: { donnees: DonneesRonde }) {
  const ph = donnees.piscine_thalasso.piscine_hotel.ph;
  const chlore = donnees.piscine_thalasso.piscine_hotel.chlore_libre;
  const ecs = donnees.chaufferie_ecs.chaufferie.temp_depart_ecs;
  const fuel = donnees.chaufferie_ecs.dry_cooling.niveau_fuel;

  const vals = [
    { label: "pH", value: ph, ok: isPhOk(ph), unit: "" },
    { label: "Chlore", value: chlore, ok: isChloreOk(chlore), unit: " mg/L" },
    { label: "T° ECS", value: ecs, ok: isEcsOk(ecs), unit: "°C" },
    { label: "Fuel", value: fuel, ok: null, unit: "%" },
  ];

  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, marginBottom: 12 }}>
      {vals.map(({ label, value, ok, unit }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Dot ok={value !== null ? ok : null} />
          <span style={{ fontSize: 12, color: "#6E6E73" }}>
            {label}: {value !== null ? `${value}${unit}` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Carte ronde du jour ───────────────────────────────────────────────────────

function RondeCard({ type, ronde }: { type: "ouverture" | "fermeture"; ronde: RondeWithDonnees | null }) {
  const isOuv = type === "ouverture";
  const late = !ronde && isLate(type);
  const limit = isOuv ? "10h00" : "20h00";

  return (
    <div
      style={{
        backgroundColor: late ? "#FFF8F7" : "#FFFFFF",
        borderRadius: 16,
        border: `1px solid ${late ? "rgba(255,59,48,0.2)" : "rgba(0,0,0,0.06)"}`,
        padding: "20px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isOuv
            ? <Sunrise size={20} color="#FF9500" strokeWidth={2} />
            : <Sunset size={20} color="#5856D6" strokeWidth={2} />}
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>
              Ronde {type}
            </p>
            <p style={{ fontSize: 12, color: "#AEAEB2", margin: 0 }}>
              Avant {limit}
            </p>
          </div>
        </div>
        {late && !ronde && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: "#FF3B30",
            backgroundColor: "#FFF1F0", padding: "3px 10px", borderRadius: 16,
            letterSpacing: "0.2px",
          }}>
            En retard
          </span>
        )}
        {!late && !ronde && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: "#FF9500",
            backgroundColor: "#FFF5E6", padding: "3px 10px", borderRadius: 16,
          }}>
            À faire
          </span>
        )}
        {ronde && (
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: ronde.hors_norme ? "#FF9500" : "#34C759",
            backgroundColor: ronde.hors_norme ? "#FFF5E6" : "#F0FDF4",
            padding: "3px 10px", borderRadius: 16,
          }}>
            {ronde.hors_norme ? "⚠ anomalie" : "✓ Tout OK"}
          </span>
        )}
      </div>

      {/* Contenu */}
      {ronde ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <CheckCircle size={17} color="#34C759" strokeWidth={2.5} />
            <span style={{ fontSize: 14, color: "#1D1D1F" }}>
              {formatTime(ronde.date_heure)} — {ronde.technicien_prenom}
            </span>
            {ronde.hors_norme && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#FF3B30", marginLeft: 4 }}>
                <AlertCircle size={14} />
                Hors norme
              </span>
            )}
          </div>
          <KeyValues donnees={ronde.donnees} />
          <Link
            href={`/rondes/detail/${ronde.id}`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", borderRadius: 10,
              backgroundColor: "#F5F5F7", textDecoration: "none",
            }}
          >
            <span style={{ fontSize: 13, color: "#2563EB", fontWeight: 500 }}>Voir le détail</span>
            <ChevronRight size={14} color="#2563EB" />
          </Link>
        </>
      ) : (
        <Link
          href={`/rondes/${type}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "13px",
            borderRadius: 12,
            backgroundColor: late ? "#FF3B30" : "#2563EB",
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: late ? "0 2px 8px rgba(255,59,48,0.3)" : "0 2px 8px rgba(37,99,235,0.25)",
            letterSpacing: "-0.1px",
          }}
        >
          Démarrer la ronde →
        </Link>
      )}
    </div>
  );
}

// ── KPI mini card ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{
      flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16,
      border: "1px solid rgba(0,0,0,0.05)", padding: "14px 16px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    }}>
      <p className="kpi-value" style={{ fontSize: 20, fontWeight: 700, color: color ?? "#1D1D1F", margin: 0, lineHeight: 1.2 }}>
        {value}
      </p>
      <p style={{ fontSize: 11, color: "#8E8E93", margin: "3px 0 0", lineHeight: 1.3 }}>{label}</p>
      {sub && <p style={{ fontSize: 10, color: "#AEAEB2", margin: "2px 0 0" }}>{sub}</p>}
    </div>
  );
}

// ── Historique 7 jours ────────────────────────────────────────────────────────

function SlotDot({ ronde }: { ronde: RondeWithDonnees | undefined }) {
  if (!ronde) return <span style={{ fontSize: 14 }}>🔴</span>;
  if (ronde.hors_norme) return <span style={{ fontSize: 14 }}>🟡</span>;
  return <span style={{ fontSize: 14 }}>🟢</span>;
}

function DayRow({ dateStr, ouv, ferm }: { dateStr: string; ouv: RondeWithDonnees | undefined; ferm: RondeWithDonnees | undefined }) {
  const isToday = dateStr === new Date().toISOString().split("T")[0];
  const date = new Date(dateStr + "T12:00:00");
  const label = date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

  const linkRonde = ouv ?? ferm;

  const inner = (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "11px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          fontSize: 12, fontWeight: isToday ? 700 : 500,
          color: isToday ? "#2563EB" : "#1D1D1F",
          textTransform: "capitalize", minWidth: 80,
        }}>
          {isToday ? "Aujourd'hui" : label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Sunrise size={12} color="#FF9500" />
          <SlotDot ronde={ouv} />
          {ouv && <span style={{ fontSize: 11, color: "#8E8E93" }}>{formatTime(ouv.date_heure)}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Sunset size={12} color="#5856D6" />
          <SlotDot ronde={ferm} />
          {ferm && <span style={{ fontSize: 11, color: "#8E8E93" }}>{formatTime(ferm.date_heure)}</span>}
        </div>
        {linkRonde && <ChevronRight size={14} color="#C7C7CC" />}
      </div>
    </div>
  );

  if (linkRonde) {
    return (
      <Link href={`/rondes/detail/${linkRonde.id}`} style={{ textDecoration: "none", display: "block" }}>
        {inner}
      </Link>
    );
  }
  return inner;
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function RondesPage() {
  const [todayRondes, setTodayRondes] = useState<{ ouverture: RondeWithDonnees | null; fermeture: RondeWithDonnees | null }>({
    ouverture: null,
    fermeture: null,
  });
  const [historique, setHistorique] = useState<RondeWithDonnees[]>([]);
  const [kpi, setKpi] = useState<RondesKPI>({ rondesMois: 0, anomaliesMois: 0, derniereAnomalie: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchRondesTodayWithDonnees(),
      fetchRondesHistoriqueWithDonnees(7),
      fetchRondesKPI(),
    ]).then(([today, hist, kpiData]) => {
      setTodayRondes(today);
      setHistorique(hist);
      setKpi(kpiData);
      setLoading(false);
    });
  }, []);

  const todayLabel = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // Générer les 7 derniers jours (aujourd'hui inclus)
  const days7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  // Index rondes par date et type
  const rondeByDateType = new Map<string, RondeWithDonnees>();
  for (const r of historique) {
    const key = `${r.date_heure.split("T")[0]}_${r.type}`;
    if (!rondeByDateType.has(key)) rondeByDateType.set(key, r);
  }

  const derniereAnomalieLabel = kpi.derniereAnomalie
    ? formatDateShort(kpi.derniereAnomalie)
    : "—";

  return (
    <div>
      <Header title="Rondes" />

      <div style={{ padding: "24px" }} className="max-md:px-4">
        {/* Titre + date */}
        <div style={{ marginBottom: 20 }}>
          <h1 className="page-title" style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
            Rondes
          </h1>
          <p style={{ fontSize: 13, color: "#AEAEB2", margin: 0, textTransform: "capitalize" }}>
            {todayLabel}
          </p>
        </div>

        {/* KPI bar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <KpiCard label="Rondes ce mois" value={kpi.rondesMois} />
          <KpiCard
            label="Anomalies ce mois"
            value={kpi.anomaliesMois}
            color={kpi.anomaliesMois > 0 ? "#FF9500" : "#34C759"}
          />
          <KpiCard
            label="Dernière anomalie"
            value={derniereAnomalieLabel}
            color={kpi.derniereAnomalie ? "#FF3B30" : "#34C759"}
          />
        </div>

        {/* Rondes du jour */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          <RondeCard type="ouverture" ronde={todayRondes.ouverture} />
          <RondeCard type="fermeture" ronde={todayRondes.fermeture} />
        </div>

        {/* Historique 7 jours */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <History size={15} color="#AEAEB2" />
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.7px",
              textTransform: "uppercase", color: "#AEAEB2", margin: 0,
            }}>
              7 derniers jours
            </p>
          </div>

          {loading ? (
            <p style={{ fontSize: 14, color: "#AEAEB2" }}>Chargement…</p>
          ) : (
            <div style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              border: "1px solid rgba(0,0,0,0.06)",
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              {[...days7].reverse().map((dateStr, i) => {
                const ouv = rondeByDateType.get(`${dateStr}_ouverture`);
                const ferm = rondeByDateType.get(`${dateStr}_fermeture`);
                return (
                  <div
                    key={dateStr}
                    style={{ borderBottom: i < 6 ? "1px solid rgba(0,0,0,0.05)" : "none" }}
                  >
                    <DayRow dateStr={dateStr} ouv={ouv} ferm={ferm} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
