"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BedDouble } from "lucide-react";
import Header from "@/components/layout/Header";
import {
  fetchAllChambreStats,
  type ChambreStats,
} from "@/lib/supabase";

// ── Structure des chambres ────────────────────────────────────────────────────

type Chambre = {
  numero: string;
  aile: "Ajaccio" | "Piscine" | "Thalasso";
  etage: 1 | 2;
};

function range(from: number, to: number, exclude: number[] = []): number[] {
  const result: number[] = [];
  for (let i = from; i <= to; i++) {
    if (!exclude.includes(i)) result.push(i);
  }
  return result;
}

const CHAMBRES: Chambre[] = [
  // Étage 1
  ...range(101, 115, [113]).map((n) => ({ numero: String(n), aile: "Ajaccio" as const, etage: 1 as const })),
  ...range(120, 138).map((n) => ({ numero: String(n), aile: "Piscine" as const, etage: 1 as const })),
  ...range(140, 155).map((n) => ({ numero: String(n), aile: "Thalasso" as const, etage: 1 as const })),
  // Étage 2
  ...range(201, 215, [213]).map((n) => ({ numero: String(n), aile: "Ajaccio" as const, etage: 2 as const })),
  ...range(220, 238).map((n) => ({ numero: String(n), aile: "Piscine" as const, etage: 2 as const })),
  ...range(240, 255).map((n) => ({ numero: String(n), aile: "Thalasso" as const, etage: 2 as const })),
];

// ── Couleur par nombre d'interventions ce mois ────────────────────────────────

function getCouleur(thisMon: number): { bg: string; border: string; text: string; badge: string; badgeBg: string } {
  if (thisMon === 0) return { bg: "#F5F5F7", border: "rgba(0,0,0,0.08)", text: "#8E8E93", badge: "#6E6E73", badgeBg: "#EBEBED" };
  if (thisMon <= 2) return { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8", badge: "#2563EB", badgeBg: "#DBEAFE" };
  if (thisMon <= 5) return { bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C", badge: "#EA580C", badgeBg: "#FFEDD5" };
  return { bg: "#FFF1F0", border: "#FECACA", text: "#B91C1C", badge: "#DC2626", badgeBg: "#FEE2E2" };
}

// ── Groupe aile ───────────────────────────────────────────────────────────────

function AileGroup({
  title,
  chambres,
  stats,
  onSelect,
}: {
  title: string;
  chambres: Chambre[];
  stats: Record<string, ChambreStats>;
  onSelect: (c: Chambre) => void;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#6E6E73", marginBottom: 12, marginTop: 0 }}>
        {title}
      </p>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
        gap: 10,
      }}>
        {chambres.map((c) => {
          const s = stats[c.numero] ?? { total: 0, thisMon: 0 };
          const col = getCouleur(s.thisMon);
          return (
            <button
              key={c.numero}
              type="button"
              onClick={() => onSelect(c)}
              style={{
                backgroundColor: col.bg,
                border: `1.5px solid ${col.border}`,
                borderRadius: 14,
                padding: "12px 8px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                transition: "transform 0.1s, box-shadow 0.1s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.10)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 800, color: col.text, lineHeight: 1 }}>
                {c.numero}
              </span>
              <span style={{ fontSize: 9, fontWeight: 600, color: col.text, opacity: 0.7, letterSpacing: "0.3px" }}>
                {c.aile.toUpperCase()}
              </span>
              {s.thisMon > 0 && (
                <span style={{
                  marginTop: 2,
                  fontSize: 10, fontWeight: 700,
                  color: col.badge,
                  backgroundColor: col.badgeBg,
                  padding: "1px 7px", borderRadius: 20,
                }}>
                  {s.thisMon} ce mois
                </span>
              )}
              {s.total > 0 && s.thisMon === 0 && (
                <span style={{
                  marginTop: 2,
                  fontSize: 10, fontWeight: 600,
                  color: "#AEAEB2",
                }}>
                  {s.total} total
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

type FiltreEtage = "tous" | "1" | "2";

export default function ChambresPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Record<string, ChambreStats>>({});
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<FiltreEtage>("tous");

  useEffect(() => {
    fetchAllChambreStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const chambresFiltered = CHAMBRES.filter((c) => {
    if (filtre === "1") return c.etage === 1;
    if (filtre === "2") return c.etage === 2;
    return true;
  });

  // Grouper par étage + aile
  type Groupe = { key: string; title: string; chambres: Chambre[] };
  const groupes: Groupe[] = [];
  const etages = filtre === "tous" ? [1, 2] : [Number(filtre)];
  const ailes = ["Ajaccio", "Piscine", "Thalasso"] as const;
  for (const etage of etages) {
    for (const aile of ailes) {
      const cs = chambresFiltered.filter((c) => c.etage === etage && c.aile === aile);
      if (cs.length > 0) {
        groupes.push({ key: `${etage}-${aile}`, title: `Aile ${aile} — Étage ${etage}`, chambres: cs });
      }
    }
  }

  // Stats globales
  const totalAvecInterventions = Object.keys(stats).length;
  const totalInterventionsMois = Object.values(stats).reduce((acc, s) => acc + s.thisMon, 0);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F5F7" }}>
      <Header title="Chambres" />

      <main style={{ padding: "24px" }} className="max-md:px-4">
        {/* KPIs */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            padding: "16px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.05)",
            flex: "1 1 140px",
          }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#AEAEB2", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Chambres
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color: "#1D1D1F" }}>
              {CHAMBRES.length}
            </p>
          </div>
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            padding: "16px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.05)",
            flex: "1 1 140px",
          }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#AEAEB2", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Avec interventions
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color: "#1D1D1F" }}>
              {totalAvecInterventions}
            </p>
          </div>
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            padding: "16px 20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.05)",
            flex: "1 1 140px",
          }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#AEAEB2", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Interventions ce mois
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color: "#2563EB" }}>
              {totalInterventionsMois}
            </p>
          </div>
        </div>

        {/* Filtres */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["tous", "1", "2"] as FiltreEtage[]).map((f) => {
            const label = f === "tous" ? "Tous les étages" : `Étage ${f}`;
            const active = filtre === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFiltre(f)}
                style={{
                  padding: "7px 16px",
                  borderRadius: 20,
                  border: "none",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  backgroundColor: active ? "#1D1D1F" : "#FFFFFF",
                  color: active ? "#FFFFFF" : "#6E6E73",
                  boxShadow: active ? "none" : "0 1px 4px rgba(0,0,0,0.08)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Légende */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { label: "Aucune intervention", bg: "#F5F5F7", border: "rgba(0,0,0,0.08)", text: "#8E8E93" },
            { label: "1-2 ce mois", bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
            { label: "3-5 ce mois", bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C" },
            { label: "6+ ce mois", bg: "#FFF1F0", border: "#FECACA", text: "#B91C1C" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 14, height: 14, borderRadius: 4,
                backgroundColor: item.bg, border: `1.5px solid ${item.border}`,
              }} />
              <span style={{ fontSize: 12, color: "#6E6E73" }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Grilles */}
        {loading ? (
          <div style={{ textAlign: "center", color: "#AEAEB2", fontSize: 14, padding: "40px 0" }}>
            Chargement…
          </div>
        ) : (
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}>
            {groupes.map((g) => (
              <AileGroup
                key={g.key}
                title={g.title}
                chambres={g.chambres}
                stats={stats}
                onSelect={(c) => router.push(`/chambres/${c.numero}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
