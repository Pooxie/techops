"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sunrise, Sunset, ChevronRight, AlertTriangle,
  CheckCircle, TrendingUp, RefreshCw, Clock,
  Wrench, Shield, FileDown, Loader2, type LucideIcon,
} from "lucide-react";
import Header from "@/components/layout/Header";
import {
  fetchDashboardKPIs,
  fetchAlertesPrioritaires,
  fetchAvancementMensuel,
  fetchTopNCParControle,
  fetchRondesKPI,
  fetchNCEvolution,
  fetchRondesToday,
  fetchNCKPIs,
  fetchCoutEvolution,
  type DashboardKPIs,
  type AlertePrioritaire,
  type AvancementCategorie,
  type NCParControleItem,
  type RondesKPI,
  type NCEvolutionItem,
  type RondeRecord,
  type NCKPIs,
  type CoutEvolutionItem,
} from "@/lib/supabase";

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg: "#F5F5F7",
  card: "#FFFFFF",
  ink: "#111111",
  mid: "#555555",
  soft: "#999999",
  faint: "#E0E0E8",
  border: "rgba(0,0,0,0.06)",
  accent: "#2563EB",
  accentBg: "#EEF4FF",
  ok: "#1B7F3A",
  okBg: "#F0FBF3",
  warn: "#B45309",
  warnBg: "#FFFBEB",
  danger: "#C0392B",
  dangerBg: "#FFF5F5",
} as const;

const card: React.CSSProperties = {
  backgroundColor: C.card,
  borderRadius: 18,
  padding: "20px 22px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 4px 14px rgba(0,0,0,0.04)",
  border: `1px solid ${C.border}`,
  minWidth: 0,
  overflow: "hidden",
};

const grid2: React.CSSProperties = { display: "grid", gap: 12 };
const grid3: React.CSSProperties = { display: "grid", gap: 12 };

// ─── Utils ────────────────────────────────────────────────────────────────────

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function statusColor(v: number) { return v >= 80 ? C.ok : v >= 60 ? C.warn : C.danger; }
function statusBg(v: number) { return v >= 80 ? C.okBg : v >= 60 ? C.warnBg : C.dangerBg; }

// ─── Section header ───────────────────────────────────────────────────────────

function Section({ label }: { label: string }) {
  return (
    <p style={{
      margin: "28px 0 12px",
      fontSize: 10, fontWeight: 800,
      color: C.soft,
      textTransform: "uppercase",
      letterSpacing: "1.2px",
    }}>
      {label}
    </p>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skel({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) {
  return <div style={{ width: w, height: h, borderRadius: r, backgroundColor: "#F0F0F5", flexShrink: 0 }} />;
}

// ─── Card title ───────────────────────────────────────────────────────────────

function CardTitle({ icon: Icon, title, href }: { icon: LucideIcon; title: string; href?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <Icon size={13} color={C.soft} strokeWidth={2} />
        <span style={{ fontSize: 12, fontWeight: 700, color: C.mid, textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</span>
      </div>
      {href && (
        <Link href={href} style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 600, color: C.accent, textDecoration: "none" }}>
          Voir <ChevronRight size={11} />
        </Link>
      )}
    </div>
  );
}

// ─── Big KPI card ─────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color, bg, href,
}: {
  label: string; value: string | number; sub?: string;
  color: string; bg: string; href?: string;
}) {
  const inner = (
    <>
      <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: C.soft, textTransform: "uppercase", letterSpacing: "0.8px" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 42, fontWeight: 800, color, lineHeight: 1, letterSpacing: "-1.5px", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </p>
      {sub && <p style={{ margin: "8px 0 0", fontSize: 12, color: C.soft }}>{sub}</p>}
    </>
  );

  if (href) {
    return (
      <Link href={href} style={{ ...card, display: "block", textDecoration: "none", backgroundColor: bg, borderColor: `${color}22` }}>
        {inner}
      </Link>
    );
  }
  return <div style={{ ...card, backgroundColor: bg, borderColor: `${color}22` }}>{inner}</div>;
}

// ─── Donut SVG ────────────────────────────────────────────────────────────────

function Donut({ value, total, color, size = 88, sw = 11 }: {
  value: number; total: number; color: string; size?: number; sw?: number;
}) {
  const r = (size - sw) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? value / total : 0;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F0F0F5" strokeWidth={sw} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`}
          style={{ transition: "stroke-dasharray .9s cubic-bezier(.34,1.56,.64,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: Math.round(size * 0.21), fontWeight: 800, color, lineHeight: 1 }}>
          {Math.round(pct * 100)}%
        </span>
      </div>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, color, height = 5 }: { value: number; color: string; height?: number }) {
  return (
    <div style={{ height, backgroundColor: "#F0F0F5", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(value, 100)}%`, backgroundColor: color, borderRadius: 99, transition: "width .7s ease" }} />
    </div>
  );
}

// ─── NC Evolution bars ────────────────────────────────────────────────────────

function EvoBars({ data }: { data: NCEvolutionItem[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const H = 64;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
      {data.map((item) => {
        const h = Math.round((item.total / max) * H);
        const majH = item.total > 0 ? Math.round((item.majeures / item.total) * h) : 0;
        const minH = h - majH;

        return (
          <div key={item.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 0 }}>
            <div style={{ width: "100%", height: H, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 1 }}>
              {item.total === 0
                ? <div style={{ width: "100%", height: 3, borderRadius: 2, backgroundColor: "#F0F0F5" }} />
                : <>
                  {majH > 0 && <div style={{ width: "100%", height: majH, borderRadius: minH === 0 ? "4px 4px 2px 2px" : 0, backgroundColor: C.danger, transition: "height .6s ease" }} />}
                  {minH > 0 && <div style={{ width: "100%", height: minH, borderRadius: majH === 0 ? "4px 4px 2px 2px" : "0 0 2px 2px", backgroundColor: "#FCA5A5", transition: "height .6s ease" }} />}
                </>}
            </div>
            <span style={{ fontSize: 10, color: C.soft, fontWeight: 500 }}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Horizontal bars ─────────────────────────────────────────────────────────

function HBars({ items }: { items: NCParControleItem[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {items.map((item) => (
        <div key={item.nom}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: C.mid, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
              {item.nom}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
              {item.majeures > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: C.danger, backgroundColor: C.dangerBg, padding: "2px 6px", borderRadius: 5 }}>
                  {item.majeures} maj.
                </span>
              )}
              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{item.count}</span>
            </div>
          </div>
          <ProgressBar value={(item.count / max) * 100} color={item.majeures > 0 ? C.danger : C.warn} />
        </div>
      ))}
    </div>
  );
}

// ─── Coût bar chart ───────────────────────────────────────────────────────────

function CoutBars({ data, field, color }: { data: CoutEvolutionItem[]; field: "expl" | "iae"; color: string }) {
  const max = Math.max(...data.map((d) => d[field]), 1);
  const H = 64;

  const fmtEur = (v: number) =>
    v === 0 ? "—" : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
      {data.map((item) => {
        const v = item[field];
        const h = max > 0 ? Math.round((v / max) * H) : 0;
        return (
          <div key={item.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 0 }}>
            <div style={{ width: "100%", height: H, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              {h > 0
                ? <div title={fmtEur(v)} style={{ width: "100%", height: h, borderRadius: "4px 4px 2px 2px", backgroundColor: color, transition: "height .6s ease", opacity: 0.85 }} />
                : <div style={{ width: "100%", height: 3, borderRadius: 2, backgroundColor: "#F0F0F5" }} />}
            </div>
            <span style={{ fontSize: 10, color: C.soft, fontWeight: 500 }}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const now = useLiveClock();
  const [generatingPDF, setGeneratingPDF] = useState(false);

  async function handleRapportPDF() {
    if (generatingPDF) return;
    setGeneratingPDF(true);
    try {
      const { generateRapportPDF } = await import("@/lib/generatePDF");
      await generateRapportPDF();
    } catch (err) {
      console.error("Erreur génération PDF:", err);
    } finally {
      setGeneratingPDF(false);
    }
  }

  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [alertes, setAlertes] = useState<AlertePrioritaire[] | null>(null);
  const [avancement, setAvancement] = useState<AvancementCategorie[] | null>(null);
  const [topNC, setTopNC] = useState<NCParControleItem[] | null>(null);
  const [rondesKpi, setRondesKpi] = useState<RondesKPI | null>(null);
  const [ncEvol, setNcEvol] = useState<NCEvolutionItem[] | null>(null);
  const [rondes, setRondes] = useState<{ ouverture: RondeRecord | null; fermeture: RondeRecord | null } | null>(null);
  const [ncKpis, setNcKpis] = useState<NCKPIs | null>(null);
  const [coutEvol, setCoutEvol] = useState<CoutEvolutionItem[] | null>(null);

  useEffect(() => {
    Promise.all([
      fetchDashboardKPIs(),
      fetchAlertesPrioritaires(),
      fetchAvancementMensuel(),
      fetchTopNCParControle(),
      fetchRondesKPI(),
      fetchNCEvolution(),
      fetchRondesToday(),
      fetchNCKPIs(),
      fetchCoutEvolution(),
    ]).then(([k, a, av, nc, rk, re, r, nck, ce]) => {
      setKpis(k); setAlertes(a); setAvancement(av);
      setTopNC(nc); setRondesKpi(rk); setNcEvol(re); setRondes(r);
      setNcKpis(nck); setCoutEvol(ce);
    });
  }, []);

  const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <Header title="Tableau de bord" />

      <div style={{ backgroundColor: C.bg, minHeight: "100%", padding: "24px 24px 48px", boxSizing: "border-box" }}>

        {/* ── Greeting ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
          <div>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: "-0.4px" }}>
              Sofitel Golfe d&apos;Ajaccio
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: C.soft, textTransform: "capitalize" }}>{dateStr}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              onClick={handleRapportPDF}
              disabled={generatingPDF}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                height: 34, padding: "0 14px", borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.12)",
                backgroundColor: C.card,
                color: generatingPDF ? C.soft : C.ink,
                fontSize: 13, fontWeight: 600, cursor: generatingPDF ? "not-allowed" : "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                opacity: generatingPDF ? 0.7 : 1,
              }}
            >
              {generatingPDF
                ? <Loader2 size={14} color={C.soft} className="animate-spin" />
                : <FileDown size={14} color={C.accent} />}
              <span>{generatingPDF ? "Génération en cours…" : "Rapport mensuel"}</span>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, backgroundColor: C.card, borderRadius: 10, padding: "7px 12px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <Clock size={12} color={C.soft} />
              <span style={{ fontSize: 13, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{timeStr}</span>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION 1 — VUE D'ENSEMBLE
        ════════════════════════════════════════ */}
        <Section label="Vue d'ensemble" />

        {/* Conformité pleine largeur */}
        <div style={{ ...card, marginBottom: 12, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          {kpis === null ? (
            <div style={{ display: "flex", gap: 20, alignItems: "center", width: "100%" }}>
              <Skel w={88} h={88} r={44} />
              <div style={{ flex: 1 }}><Skel w="40%" h={12} /><div style={{ marginTop: 10 }}><Skel w="30%" h={44} r={8} /></div></div>
            </div>
          ) : (
            <>
              <Donut value={kpis.controlesOk} total={kpis.totalControles} color={statusColor(kpis.scoreConformite)} size={88} sw={11} />
              <div style={{ flex: 1, minWidth: 160 }}>
                <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: C.soft, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  Conformité globale SET
                </p>
                <p style={{ margin: 0, fontSize: 44, fontWeight: 800, color: statusColor(kpis.scoreConformite), lineHeight: 1, letterSpacing: "-1.5px" }}>
                  {kpis.scoreConformite}%
                </p>
                <p style={{ margin: "5px 0 0", fontSize: 12, color: C.soft }}>
                  {kpis.controlesOk} contrôles à jour sur {kpis.totalControles}
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { label: "À jour", v: kpis.controlesOk, color: C.ok, bg: C.okBg },
                  { label: "Alerte", v: kpis.controlesAlerte, color: C.warn, bg: C.warnBg },
                  { label: "Retard", v: kpis.equipementsCritiques, color: C.danger, bg: C.dangerBg },
                ].map(({ label, v, color, bg }) => (
                  <div key={label} style={{ backgroundColor: bg, borderRadius: 12, padding: "10px 16px", textAlign: "center", minWidth: 70 }}>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{v}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 10, fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 3 KPI cards */}
        <div style={grid3} className="grid-3-resp">
          {kpis === null ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={card}><Skel w="50%" h={10} /><div style={{ marginTop: 12 }}><Skel w="40%" h={36} r={6} /></div></div>
          )) : <>
            <KpiCard label="NC ouvertes" value={kpis.ncOuvertes} href="/non-conformites"
              sub={kpis.ncOuvertes === 0 ? "Aucune NC active" : `dont ${kpis.nonConformitesMajeures} majeure${kpis.nonConformitesMajeures > 1 ? "s" : ""}`}
              color={kpis.ncOuvertes === 0 ? C.ok : kpis.nonConformitesMajeures > 0 ? C.danger : C.warn}
              bg={kpis.ncOuvertes === 0 ? C.okBg : kpis.nonConformitesMajeures > 0 ? C.dangerBg : C.warnBg}
            />
            <KpiCard label="Retards contrôles" value={kpis.equipementsCritiques} href="/set"
              sub={kpis.equipementsCritiques === 0 ? "Tout est à jour" : `${kpis.controlesAlerte} en alerte`}
              color={kpis.equipementsCritiques === 0 ? C.ok : C.danger}
              bg={kpis.equipementsCritiques === 0 ? C.okBg : C.dangerBg}
            />
            <KpiCard label="Prestataires — semaine" value={kpis.prestatairesCetteSemaine}
              sub="Visites programmées"
              color={C.accent}
              bg={C.accentBg}
            />
          </>}
        </div>

        {/* ════════════════════════════════════════
            SECTION 2 — RONDES
        ════════════════════════════════════════ */}
        <Section label="Rondes" />

        <div style={grid2} className="grid-2-resp">
          {/* Rondes du jour */}
          <div style={card}>
            <CardTitle icon={RefreshCw} title="Rondes du jour" href="/rondes" />

            {rondes === null ? (
              <div style={grid2}><Skel w="100%" h={72} r={12} /><Skel w="100%" h={72} r={12} /></div>
            ) : (
              <div style={grid2}>
                {(["ouverture", "fermeture"] as const).map((type) => {
                  const r = rondes[type];
                  const col = r ? (r.hors_norme ? C.warn : C.ok) : C.soft;
                  const bg = r ? (r.hors_norme ? C.warnBg : C.okBg) : "#F9F9FB";
                  return (
                    <div key={type} style={{ backgroundColor: bg, borderRadius: 12, padding: "14px", border: `1px solid ${col}25` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        {type === "ouverture"
                          ? <Sunrise size={13} color={col} strokeWidth={2} />
                          : <Sunset size={13} color={col} strokeWidth={2} />}
                        <span style={{ fontSize: 11, fontWeight: 700, color: col, textTransform: "capitalize" }}>{type}</span>
                      </div>
                      {r ? (
                        <>
                          <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.ink, letterSpacing: "-0.5px" }}>{fmtTime(r.date_heure)}</p>
                          <p style={{ margin: "3px 0 0", fontSize: 11, color: C.soft }}>{r.technicien_prenom}</p>
                        </>
                      ) : (
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.faint }}>À effectuer</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stats rondes mois */}
          <div style={card}>
            <CardTitle icon={RefreshCw} title="Rondes — ce mois" href="/rondes" />
            {rondesKpi === null ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Skel w="100%" h={50} r={10} />
                <Skel w="100%" h={50} r={10} />
              </div>
            ) : (
              <>
                <div style={grid2}>
                  {[
                    { label: "Rondes effectuées", v: rondesKpi.rondesMois, color: C.accent, bg: C.accentBg },
                    { label: "Anomalies détectées", v: rondesKpi.anomaliesMois, color: rondesKpi.anomaliesMois > 0 ? C.warn : C.ok, bg: rondesKpi.anomaliesMois > 0 ? C.warnBg : C.okBg },
                  ].map(({ label, v, color, bg }) => (
                    <div key={label} style={{ backgroundColor: bg, borderRadius: 12, padding: "14px" }}>
                      <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
                      <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{v}</p>
                    </div>
                  ))}
                </div>
                {rondesKpi.derniereAnomalie && (
                  <p style={{ margin: "12px 0 0", fontSize: 12, color: C.soft }}>
                    Dernière anomalie : <strong style={{ color: C.danger }}>{fmtDateShort(rondesKpi.derniereAnomalie)}</strong>
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION 3 — CONTRÔLES SET
        ════════════════════════════════════════ */}
        <Section label="Contrôles SET" />

        {/* Alertes + Avancement */}
        <div style={{ ...grid2, marginBottom: 12 }}>

          {/* Alertes prioritaires */}
          <div style={card}>
            <CardTitle icon={AlertTriangle} title="Alertes prioritaires" href="/set" />
            {alertes === null ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Array.from({ length: 4 }).map((_, i) => <Skel key={i} w="100%" h={46} r={10} />)}
              </div>
            ) : alertes.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px", borderRadius: 12, backgroundColor: C.okBg }}>
                <CheckCircle size={14} color={C.ok} />
                <span style={{ fontSize: 13, fontWeight: 600, color: C.ok }}>Tout est à jour — aucune alerte</span>
              </div>
            ) : (
              <div>
                {alertes.map((al, i) => {
                  const isR = al.statut === "retard";
                  return (
                    <div key={al.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < alertes.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: isR ? C.danger : C.warn, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{al.nom}</p>
                        {al.categorie && <p style={{ margin: "1px 0 0", fontSize: 11, color: C.soft }}>{al.categorie}</p>}
                      </div>
                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: isR ? C.danger : C.warn, backgroundColor: isR ? C.dangerBg : C.warnBg, padding: "2px 7px", borderRadius: 20 }}>
                          {isR ? "Retard" : "Urgent"}
                        </span>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: C.soft }}>{fmtDateShort(al.date_prochaine)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Avancement par catégorie */}
          <div style={card}>
            <CardTitle icon={Shield} title="Avancement par catégorie" href="/set" />
            {avancement === null ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {Array.from({ length: 4 }).map((_, i) => <Skel key={i} w="100%" h={38} />)}
              </div>
            ) : avancement.length === 0 ? (
              <p style={{ fontSize: 13, color: C.soft, margin: 0 }}>Aucune donnée</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {avancement.map((cat) => {
                  const c = statusColor(cat.pct);
                  return (
                    <div key={cat.categorie}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: C.mid, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
                          {cat.categorie}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: c, flexShrink: 0 }}>{cat.pct}%</span>
                      </div>
                      <ProgressBar value={cat.pct} color={c} />
                      <p style={{ margin: "3px 0 0", fontSize: 10, color: C.soft }}>{cat.ok}/{cat.total} OK</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION 4 — COÛTS NC (EXPL / IAE)
        ════════════════════════════════════════ */}
        <Section label="Coûts des non-conformités" />

        <div style={grid2} className="grid-2-resp">

          {/* EXPL */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: C.soft, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  Coût Exploitation (EXPL)
                </p>
                <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: C.warn, lineHeight: 1, letterSpacing: "-1px" }}>
                  {ncKpis === null
                    ? "—"
                    : ncKpis.coutExpl === 0
                      ? "0 €"
                      : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(ncKpis.coutExpl)}
                </p>
                <p style={{ margin: "5px 0 0", fontSize: 11, color: C.soft }}>
                  {ncKpis !== null && ncKpis.coutTotal > 0
                    ? `${Math.round((ncKpis.coutExpl / ncKpis.coutTotal) * 100)}% du coût total`
                    : "Impact sur exploitation courante"}
                </p>
              </div>
              <div style={{ backgroundColor: C.warnBg, borderRadius: 10, padding: "6px 10px" }}>
                <Wrench size={14} color={C.warn} strokeWidth={2} />
              </div>
            </div>
            {coutEvol === null
              ? <Skel w="100%" h={80} r={8} />
              : <CoutBars data={coutEvol} field="expl" color={C.warn} />}
          </div>

          {/* IAE */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: C.soft, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  Coût IAE (Investissement)
                </p>
                <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: C.accent, lineHeight: 1, letterSpacing: "-1px" }}>
                  {ncKpis === null
                    ? "—"
                    : ncKpis.coutIae === 0
                      ? "0 €"
                      : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(ncKpis.coutIae)}
                </p>
                <p style={{ margin: "5px 0 0", fontSize: 11, color: C.soft }}>
                  {ncKpis !== null && ncKpis.coutTotal > 0
                    ? `${Math.round((ncKpis.coutIae / ncKpis.coutTotal) * 100)}% du coût total`
                    : "Impact sur investissements"}
                </p>
              </div>
              <div style={{ backgroundColor: C.accentBg, borderRadius: 10, padding: "6px 10px" }}>
                <TrendingUp size={14} color={C.accent} strokeWidth={2} />
              </div>
            </div>
            {coutEvol === null
              ? <Skel w="100%" h={80} r={8} />
              : <CoutBars data={coutEvol} field="iae" color={C.accent} />}
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION 5 — NON-CONFORMITÉS
        ════════════════════════════════════════ */}
        <Section label="Non-Conformités" />

        <div style={{ ...grid2, marginBottom: 12 }}>

          {/* NC répartition */}
          <div style={card}>
            <CardTitle icon={AlertTriangle} title="Répartition NC" href="/non-conformites" />
            {kpis === null ? (
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <Skel w={88} h={88} r={44} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  {Array.from({ length: 3 }).map((_, i) => <Skel key={i} w="100%" h={16} />)}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 14 }}>
                  <Donut
                    value={kpis.ncOuvertes}
                    total={Math.max(kpis.ncOuvertes + kpis.ncLevees, 1)}
                    color={kpis.nonConformitesMajeures > 0 ? C.danger : C.warn}
                    size={88} sw={11}
                  />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9, minWidth: 0 }}>
                    {[
                      { label: "Majeures ouvertes", v: kpis.nonConformitesMajeures, c: C.danger },
                      { label: "Mineures ouvertes", v: kpis.ncMineuresOuvertes, c: C.warn },
                      { label: "Levées", v: kpis.ncLevees, c: C.ok },
                    ].map(({ label, v, c }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: c, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: C.soft, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: C.ink, flexShrink: 0 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: "10px 12px", backgroundColor: "#F9F9FB", borderRadius: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: C.soft }}>Taux de levée</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: C.ok }}>
                      {kpis.ncOuvertes + kpis.ncLevees > 0 ? Math.round((kpis.ncLevees / (kpis.ncOuvertes + kpis.ncLevees)) * 100) : 0}%
                    </span>
                  </div>
                  <ProgressBar value={kpis.ncOuvertes + kpis.ncLevees > 0 ? Math.round((kpis.ncLevees / (kpis.ncOuvertes + kpis.ncLevees)) * 100) : 0} color={C.ok} height={4} />
                </div>
              </>
            )}
          </div>

          {/* Évolution 6 mois */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <TrendingUp size={13} color={C.soft} strokeWidth={2} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.mid, textTransform: "uppercase", letterSpacing: "0.5px" }}>Évolution — 6 mois</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {[{ c: C.danger, l: "Maj." }, { c: "#FCA5A5", l: "Min." }].map(({ c, l }) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: c }} />
                    <span style={{ fontSize: 10, color: C.soft }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            {ncEvol === null
              ? <Skel w="100%" h={80} r={8} />
              : <EvoBars data={ncEvol} />}
          </div>
        </div>

        {/* Top NC */}
        <div style={card}>
          <CardTitle icon={Wrench} title="Contrôles avec le plus de NC ouvertes" href="/non-conformites" />
          {topNC === null ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Array.from({ length: 5 }).map((_, i) => <Skel key={i} w="100%" h={34} />)}
            </div>
          ) : topNC.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px", borderRadius: 10, backgroundColor: C.okBg }}>
              <CheckCircle size={14} color={C.ok} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.ok }}>Aucune NC ouverte en ce moment</span>
            </div>
          ) : (
            <HBars items={topNC} />
          )}
        </div>

        {/* Bouton Mode TV */}
        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8, paddingBottom: 4 }}>
          <a
            href="/dashboard/tv"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.10)", background: "#1D1D1F",
              color: "#FFFFFF", fontSize: 12, fontWeight: 600,
              textDecoration: "none", cursor: "pointer",
            }}
          >
            📺 Mode TV
          </a>
        </div>
      </div>
    </>
  );
}
