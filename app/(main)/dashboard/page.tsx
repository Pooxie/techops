"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";
import {
  fetchDashboardKPIs,
  fetchAlertesPrioritaires,
  fetchAvancementMensuel,
  fetchTopNCParControle,
  type DashboardKPIs,
  type AlertePrioritaire,
  type AvancementCategorie,
  type NCParControleItem,
} from "@/lib/supabase";

// ─── SVG pattern pour carte héro ──────────────────────────────────────────────

function HeroPattern() {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.12 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="circles" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="30" cy="30" r="20" fill="none" stroke="white" strokeWidth="1" />
          <circle cx="30" cy="30" r="12" fill="none" stroke="white" strokeWidth="0.7" />
          <circle cx="30" cy="30" r="5"  fill="none" stroke="white" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#circles)" />
    </svg>
  );
}

// ─── Skeletons ─────────────────────────────────────────────────────────────────

function KpiSkeleton({ hero = false }: { hero?: boolean }) {
  return (
    <div
      style={{
        backgroundColor: hero ? "#2563EB" : "#FFFFFF",
        borderRadius: 16,
        padding: hero ? 24 : 20,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        border: "1px solid rgba(0,0,0,0.05)",
        minHeight: hero ? 128 : 100,
      }}
    >
      <div style={{ height: 10, width: 80, borderRadius: 5, backgroundColor: hero ? "rgba(255,255,255,0.2)" : "#F5F5F7", marginBottom: 14 }} />
      <div style={{ height: hero ? 40 : 32, width: 70, borderRadius: 8, backgroundColor: hero ? "rgba(255,255,255,0.2)" : "#F5F5F7" }} />
    </div>
  );
}

function RowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0",
            borderBottom: i < count - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
          }}
        >
          <div style={{ height: 13, width: 160, borderRadius: 6, backgroundColor: "#F5F5F7" }} />
          <div style={{ height: 22, width: 64, borderRadius: 20, backgroundColor: "#F5F5F7" }} />
        </div>
      ))}
    </>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function progressColor(pct: number) {
  if (pct >= 80) return "#34C759";
  if (pct >= 60) return "#FF9500";
  return "#FF3B30";
}

function conformiteLabel(v: number) {
  if (v >= 80) return "Conforme";
  if (v >= 60) return "À surveiller";
  return "Critique";
}

// ─── Carte héro (conformité) ───────────────────────────────────────────────────

function HeroCard({ value }: { value: number }) {
  const color = progressColor(value);
  return (
    <div
      className="hero-card"
      style={{
        background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
        borderRadius: 16,
        padding: "24px 28px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(37,99,235,0.30)",
        minHeight: 128,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <HeroPattern />
      <div style={{ position: "relative" }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.65)",
            margin: "0 0 10px",
          }}
        >
          Conformité globale
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
          <span
            className="hero-value"
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-1px",
            }}
          >
            {value}%
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(255,255,255,0.70)",
              paddingBottom: 8,
            }}
          >
            {conformiteLabel(value)}
          </span>
        </div>
      </div>
      {/* Barre de progression */}
      <div style={{ position: "relative", marginTop: 16 }}>
        <div
          style={{
            height: 4,
            borderRadius: 99,
            backgroundColor: "rgba(255,255,255,0.20)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${value}%`,
              borderRadius: 99,
              backgroundColor: color === "#34C759" ? "#A7F3D0" : color === "#FF9500" ? "#FED7AA" : "#FCA5A5",
              transition: "width 0.8s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Carte KPI standard ────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  subtext,
  color,
}: {
  label: string;
  value: string;
  subtext?: string;
  color: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: "18px 20px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        border: "1px solid rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          color: "#AEAEB2",
          margin: 0,
        }}
      >
        {label}
      </p>
      <p
        className="kpi-value"
        style={{
          fontSize: 36,
          fontWeight: 700,
          color,
          margin: 0,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.5px",
        }}
      >
        {value}
      </p>
      {subtext && (
        <p style={{ fontSize: 11, color: "#AEAEB2", margin: 0 }}>{subtext}</p>
      )}
    </div>
  );
}

// ─── Donut SVG ────────────────────────────────────────────────────────────────

function DonutChart({
  segments,
  size = 120,
  label,
  sublabel,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  label?: string;
  sublabel?: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return (
    <div style={{ width: size, height: size, borderRadius: "50%", backgroundColor: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 12, color: "#AEAEB2" }}>—</span>
    </div>
  );

  const r = 44;
  const cx = size / 2;
  const cy = size / 2;
  const strokeW = 16;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const arcs = segments.map(seg => {
    const pct = seg.value / total;
    const dash = pct * circumference;
    const arc = { dash, offset: circumference - offset, color: seg.color };
    offset += dash;
    return arc;
  });

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F5F5F7" strokeWidth={strokeW} />
        {arcs.map((arc, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={arc.color} strokeWidth={strokeW}
            strokeDasharray={`${arc.dash} ${circumference}`}
            strokeDashoffset={arc.offset}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        ))}
      </svg>
      {(label !== undefined) && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#1D1D1F", lineHeight: 1 }}>{label}</span>
          {sublabel && <span style={{ fontSize: 10, color: "#AEAEB2", marginTop: 2 }}>{sublabel}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Barre empilée horizontale ─────────────────────────────────────────────────

function StackedBar({ segments, height = 10 }: { segments: { value: number; color: string; label: string }[]; height?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  return (
    <div style={{ display: "flex", borderRadius: 99, overflow: "hidden", height }}>
      {segments.filter(s => s.value > 0).map((seg, i) => (
        <div
          key={i}
          title={`${seg.label} : ${seg.value}`}
          style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color, transition: "width 0.6s ease" }}
        />
      ))}
    </div>
  );
}

// ─── Barres horizontales (top NC) ─────────────────────────────────────────────

function HBarChart({ items }: { items: NCParControleItem[] }) {
  const max = Math.max(...items.map(i => i.count), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map(item => (
        <div key={item.nom}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "#1D1D1F", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0, marginRight: 8 }}>
              {item.nom}
            </span>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {item.majeures > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#FF3B30", backgroundColor: "#FF3B3012", padding: "1px 5px", borderRadius: 6 }}>
                  {item.majeures} maj.
                </span>
              )}
              <span style={{ fontSize: 12, fontWeight: 700, color: "#6E6E73" }}>{item.count}</span>
            </div>
          </div>
          <div style={{ height: 6, backgroundColor: "#F5F5F7", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(item.count / max) * 100}%`, backgroundColor: item.majeures > 0 ? "#FF3B30" : "#FF9500", borderRadius: 3, transition: "width 0.6s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [alertes, setAlertes] = useState<AlertePrioritaire[] | null>(null);
  const [avancement, setAvancement] = useState<AvancementCategorie[] | null>(null);
  const [topNC, setTopNC] = useState<NCParControleItem[] | null>(null);

  useEffect(() => {
    Promise.all([
      fetchDashboardKPIs(),
      fetchAlertesPrioritaires(),
      fetchAvancementMensuel(),
      fetchTopNCParControle(),
    ]).then(([k, a, av, nc]) => {
      setKpis(k);
      setAlertes(a);
      setAvancement(av);
      setTopNC(nc);
    });
  }, []);

  const conformiteColor = (v: number) => v >= 80 ? "#34C759" : v >= 60 ? "#FF9500" : "#FF3B30";

  return (
    <>
      <Header title="Tableau de bord" />

      <div
        style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}
        className="max-md:px-4"
      >
        {/* Titre */}
        <div>
          <h1
            className="page-title"
            style={{
              fontFamily: "var(--font-inter, system-ui)",
              fontSize: 28,
              fontWeight: 700,
              color: "#1D1D1F",
              margin: 0,
              lineHeight: 1.2,
              letterSpacing: "-0.5px",
            }}
          >
            Vue d&apos;ensemble
          </h1>
          <p style={{ fontSize: 14, color: "#6E6E73", margin: "4px 0 0" }}>
            Sofitel Golfe d&apos;Ajaccio
          </p>
        </div>

        {/* ── KPI grid ── */}
        <div
          className="kpi-grid"
          style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14 }}
        >
          {/* Carte héro — conformité (full-width sur mobile) */}
          <div className="kpi-hero">
            {kpis === null ? (
              <KpiSkeleton hero />
            ) : (
              <HeroCard value={kpis.scoreConformite} />
            )}
          </div>

          {/* Équipements en retard */}
          {kpis === null ? (
            <KpiSkeleton />
          ) : (
            <KpiCard
              label="Équip. en retard"
              value={`${kpis.equipementsCritiques}`}
              subtext={kpis.equipementsCritiques === 0 ? "Tout est à jour ✓" : "Nécessite attention"}
              color={kpis.equipementsCritiques === 0 ? "#34C759" : "#FF3B30"}
            />
          )}

          {/* Non-conformités */}
          {kpis === null ? (
            <KpiSkeleton />
          ) : (
            <KpiCard
              label="NC ouvertes"
              value={`${kpis.ncOuvertes}`}
              subtext={kpis.ncOuvertes === 0 ? "RAS ✓" : `dont ${kpis.nonConformitesMajeures} majeure${kpis.nonConformitesMajeures > 1 ? "s" : ""}`}
              color={kpis.ncOuvertes === 0 ? "#34C759" : kpis.nonConformitesMajeures > 0 ? "#FF3B30" : "#FF9500"}
            />
          )}
        </div>

        {/* Prestataires cette semaine — petite card */}
        {kpis !== null && (
          <div
            style={{
              backgroundColor: "#EFF6FF",
              borderRadius: 12,
              padding: "12px 18px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              border: "1px solid rgba(37,99,235,0.12)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "#FFFFFF",
              }}
            >
              {kpis.prestatairesCetteSemaine}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#2563EB", margin: 0 }}>
                {kpis.prestatairesCetteSemaine === 0
                  ? "Aucune visite prestataire cette semaine"
                  : `${kpis.prestatairesCetteSemaine} visite${kpis.prestatairesCetteSemaine > 1 ? "s" : ""} prestataire cette semaine`}
              </p>
              <p style={{ fontSize: 11, color: "#6E6E73", margin: "2px 0 0" }}>
                Semaine en cours
              </p>
            </div>
          </div>
        )}

        {/* ── Santé SET + NC charts ── */}
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">

          {/* Santé des contrôles SET */}
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", margin: "0 0 16px", letterSpacing: "-0.2px" }}>
              Santé des contrôles SET
            </h2>
            {kpis === null ? <RowSkeleton count={3} /> : (
              <>
                <StackedBar segments={[
                  { value: kpis.controlesOk, color: "#34C759", label: "À jour" },
                  { value: kpis.controlesAlerte, color: "#FF9500", label: "Alerte" },
                  { value: kpis.equipementsCritiques, color: "#FF3B30", label: "En retard" },
                ]} height={12} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 14 }}>
                  {[
                    { label: "À jour", value: kpis.controlesOk, color: "#34C759", pct: Math.round((kpis.controlesOk / Math.max(kpis.totalControles, 1)) * 100) },
                    { label: "Alerte", value: kpis.controlesAlerte, color: "#FF9500", pct: Math.round((kpis.controlesAlerte / Math.max(kpis.totalControles, 1)) * 100) },
                    { label: "En retard", value: kpis.equipementsCritiques, color: "#FF3B30", pct: Math.round((kpis.equipementsCritiques / Math.max(kpis.totalControles, 1)) * 100) },
                  ].map(({ label, value, color, pct }) => (
                    <div key={label} style={{ padding: "10px 12px", backgroundColor: color + "10", borderRadius: 10, border: `1px solid ${color}22` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px" }}>{label}</p>
                      <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value}</p>
                      <p style={{ fontSize: 11, color, opacity: 0.7, margin: "2px 0 0" }}>{pct}%</p>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "#AEAEB2", margin: "12px 0 0", textAlign: "right" }}>
                  {kpis.totalControles} contrôles au total
                </p>
              </>
            )}
          </div>

          {/* Répartition NC */}
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", margin: "0 0 16px", letterSpacing: "-0.2px" }}>
              Répartition des NC
            </h2>
            {kpis === null ? <RowSkeleton count={3} /> : (
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <DonutChart
                  size={120}
                  label={`${kpis.ncOuvertes + kpis.ncLevees}`}
                  sublabel="NC total"
                  segments={[
                    { value: kpis.nonConformitesMajeures, color: "#FF3B30" },
                    { value: kpis.ncMineuresOuvertes, color: "#FF9500" },
                    { value: kpis.ncLevees, color: "#34C759" },
                  ]}
                />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "Majeures ouvertes", value: kpis.nonConformitesMajeures, color: "#FF3B30" },
                    { label: "Mineures ouvertes", value: kpis.ncMineuresOuvertes, color: "#FF9500" },
                    { label: "Levées", value: kpis.ncLevees, color: "#34C759" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "#6E6E73", flex: 1 }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 4, paddingTop: 8, borderTop: "1px solid #F5F5F7" }}>
                    <span style={{ fontSize: 11, color: "#AEAEB2" }}>
                      Taux de levée : <strong style={{ color: "#34C759" }}>
                        {kpis.ncOuvertes + kpis.ncLevees > 0 ? Math.round((kpis.ncLevees / (kpis.ncOuvertes + kpis.ncLevees)) * 100) : 0}%
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Top NC par contrôle ── */}
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", margin: "0 0 16px", letterSpacing: "-0.2px" }}>
            Contrôles avec le plus de NC ouvertes
          </h2>
          {topNC === null ? <RowSkeleton count={5} /> : topNC.length === 0 ? (
            <p style={{ fontSize: 13, color: "#AEAEB2", margin: 0 }}>Aucune NC ouverte</p>
          ) : (
            <HBarChart items={topNC} />
          )}
        </div>

        {/* ── Ligne alertes + avancement ── */}
        <div
          className="grid grid-cols-2 gap-4 max-md:grid-cols-1"
        >
          {/* Alertes prioritaires */}
          <div
            className="dashboard-card"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              border: "1px solid rgba(0,0,0,0.05)",
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#1D1D1F",
                margin: "0 0 16px",
                letterSpacing: "-0.2px",
              }}
            >
              Alertes prioritaires
            </h2>
            {alertes === null ? (
              <RowSkeleton count={3} />
            ) : alertes.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 14px",
                  borderRadius: 10,
                  backgroundColor: "#F0FDF4",
                }}
              >
                <span style={{ fontSize: 16 }}>✓</span>
                <p style={{ fontSize: 13, color: "#34C759", fontWeight: 600, margin: 0 }}>
                  Aucune alerte prioritaire
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {alertes.map((alerte, i) => (
                  <div
                    key={alerte.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 0",
                      borderBottom:
                        i < alertes.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#1D1D1F",
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {alerte.nom}
                      </p>
                      {alerte.categorie && (
                        <p style={{ fontSize: 11, color: "#AEAEB2", margin: "2px 0 0" }}>
                          {alerte.categorie}
                        </p>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      <Badge variant={alerte.statut === "retard" ? "danger" : "warning"}>
                        {alerte.statut === "retard" ? "En retard" : "Urgent"}
                      </Badge>
                      <span style={{ fontSize: 11, color: "#AEAEB2" }}>
                        {formatDate(alerte.date_prochaine)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Avancement mensuel */}
          <div
            className="dashboard-card"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              border: "1px solid rgba(0,0,0,0.05)",
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#1D1D1F",
                margin: "0 0 16px",
                letterSpacing: "-0.2px",
              }}
            >
              Avancement mensuel
            </h2>
            {avancement === null ? (
              <RowSkeleton count={4} />
            ) : avancement.length === 0 ? (
              <p style={{ fontSize: 14, color: "#AEAEB2", margin: 0, padding: "12px 0" }}>
                Aucune donnée disponible
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {avancement.map((cat) => (
                  <div key={cat.categorie}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#1D1D1F" }}>
                        {cat.categorie}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: progressColor(cat.pct),
                        }}
                      >
                        {cat.pct}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        borderRadius: 99,
                        backgroundColor: "#F5F5F7",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${cat.pct}%`,
                          borderRadius: 99,
                          backgroundColor: progressColor(cat.pct),
                          transition: "width 0.6s ease",
                        }}
                      />
                    </div>
                    <p style={{ fontSize: 11, color: "#AEAEB2", margin: "4px 0 0" }}>
                      {cat.ok} / {cat.total} contrôles OK
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
