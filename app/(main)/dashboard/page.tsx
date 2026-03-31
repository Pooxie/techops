"use client";

import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";
import {
  fetchDashboardKPIs,
  fetchAlertesPrioritaires,
  fetchAvancementMensuel,
  type DashboardKPIs,
  type AlertePrioritaire,
  type AvancementCategorie,
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [alertes, setAlertes] = useState<AlertePrioritaire[] | null>(null);
  const [avancement, setAvancement] = useState<AvancementCategorie[] | null>(null);

  useEffect(() => {
    Promise.all([
      fetchDashboardKPIs(),
      fetchAlertesPrioritaires(),
      fetchAvancementMensuel(),
    ]).then(([k, a, av]) => {
      setKpis(k);
      setAlertes(a);
      setAvancement(av);
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
              label="Non-conformités"
              value={`${kpis.nonConformitesMajeures}`}
              subtext={kpis.nonConformitesMajeures === 0 ? "RAS ✓" : "Ouvertes"}
              color={kpis.nonConformitesMajeures === 0 ? "#34C759" : "#FF9500"}
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
