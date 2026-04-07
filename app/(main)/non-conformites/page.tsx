"use client";

import React, { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  createNC,
  fetchNCKPIs,
  fetchNonConformites,
  fetchSetControlesList,
  updateNCStatut,
  type NCKPIs,
  type NCRecord,
  type SetControleItem,
} from "@/lib/supabase";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function fmtCost(v: number | null): string {
  if (!v || v === 0) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

// ─── Style constants ───────────────────────────────────────────────────────────

const inputSt: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.10)",
  fontSize: 14,
  backgroundColor: "#F5F5F7",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "var(--font-inter, system-ui, sans-serif)",
  color: "#1D1D1F",
};

const labelSt: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#6E6E73",
  letterSpacing: "0.3px",
  marginBottom: 6,
};

// ─── Badges ────────────────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: NCRecord["statut"] }) {
  const cfg = statut === "levee"
    ? { bg: "#34C75918", color: "#34C759", label: "Levée" }
    : { bg: "#FF3B3018", color: "#FF3B30", label: "Ouverte" };
  return (
    <span style={{
      backgroundColor: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, padding: "2px 8px",
      borderRadius: 16, textTransform: "uppercase" as const, letterSpacing: 0.3,
    }}>
      {cfg.label}
    </span>
  );
}

function GraviteBadge({ gravite }: { gravite: NCRecord["gravite"] }) {
  const cfg = gravite === "majeure"
    ? { bg: "#FF3B3018", color: "#FF3B30", label: "Majeure" }
    : { bg: "#FF950018", color: "#FF9500", label: "Mineure" };
  return (
    <span style={{
      backgroundColor: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700, padding: "2px 8px",
      borderRadius: 16, textTransform: "uppercase" as const, letterSpacing: 0.3,
    }}>
      {cfg.label}
    </span>
  );
}

// ─── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{
      flex: "1 1 0", backgroundColor: "#FFFFFF", borderRadius: 16,
      padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      border: "1px solid rgba(0,0,0,0.05)", minWidth: 80,
    }}>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", marginTop: 5, lineHeight: 1.3 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#8E8E93", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── NC Card ───────────────────────────────────────────────────────────────────

function NCCard({ nc, onClick }: { nc: NCRecord; onClick: () => void }) {
  const accentColor = nc.gravite === "majeure" ? "#FF3B30" : "#FF9500";
  const hasCost = nc.cost_expl && nc.cost_expl > 0;

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: "14px 16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        border: "1px solid rgba(0,0,0,0.04)",
        cursor: "pointer",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      {/* Barre accent */}
      <div style={{ width: 3, borderRadius: 99, backgroundColor: accentColor, alignSelf: "stretch", flexShrink: 0, minHeight: 40 }} />

      {/* Contenu */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Ligne 1 : numéro obs + badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
          {nc.source_obs_no && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", backgroundColor: "#F5F5F7", padding: "1px 7px", borderRadius: 10 }}>
              #{nc.source_obs_no}
            </span>
          )}
          <GraviteBadge gravite={nc.gravite} />
          <StatutBadge statut={nc.statut} />
        </div>

        {/* Description (2 lignes max) */}
        <div style={{
          fontSize: 14, fontWeight: 600, color: "#1D1D1F", lineHeight: 1.4, marginBottom: 5,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden",
        }}>
          {nc.description}
        </div>

        {/* Contrôle associé */}
        {nc.controle_nom && (
          <div style={{ fontSize: 12, color: "#8E8E93", marginBottom: 6 }}>
            {nc.controle_nom}
          </div>
        )}

        {/* Méta : responsable, date cible, coût */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {nc.action_owner_name && (
            <span style={{ fontSize: 12, color: "#6E6E73", display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ opacity: 0.6 }}>👤</span> {nc.action_owner_name}
            </span>
          )}
          {nc.date_cible && (
            <span style={{ fontSize: 12, color: nc.statut === "ouverte" ? "#FF9500" : "#8E8E93" }}>
              Cible : <strong>{fmtDate(nc.date_cible)}</strong>
            </span>
          )}
          {hasCost && (
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", backgroundColor: "#F5F5F7", padding: "1px 7px", borderRadius: 10 }}>
              {fmtCost(nc.cost_expl)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section helper ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 10px" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "7px 0", borderBottom: "1px solid #F5F5F7", gap: 12 }}>
      <span style={{ fontSize: 13, color: "#8E8E93", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", textAlign: "right" }}>{value}</span>
    </div>
  );
}

// ─── Detail drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({
  nc,
  onClose,
  onUpdated,
}: {
  nc: NCRecord;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function marquerLevee() {
    setSaving(true);
    setError("");
    try {
      await updateNCStatut(nc.id, "levee");
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setSaving(false);
    }
  }

  const coutTotal = (nc.cost_expl ?? 0) + (nc.cost_iae ?? 0);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.40)", backdropFilter: "blur(4px)", zIndex: 200 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
        backgroundColor: "#FFFFFF", zIndex: 201,
        display: "flex", flexDirection: "column",
        boxShadow: "-24px 0 64px rgba(0,0,0,0.12)",
        overflowY: "auto",
      }}>
        {/* ── En-tête ── */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "flex-start", gap: 12, justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {nc.source_obs_no && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", backgroundColor: "#F5F5F7", padding: "2px 8px", borderRadius: 10 }}>
                  #{nc.source_obs_no}
                </span>
              )}
              <GraviteBadge gravite={nc.gravite} />
              <StatutBadge statut={nc.statut} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: 0, lineHeight: 1.4 }}>
              {nc.description}
            </h2>
            {nc.controle_nom && (
              <p style={{ fontSize: 12, color: "#8E8E93", margin: "6px 0 0" }}>{nc.controle_nom}</p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", backgroundColor: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <X size={15} color="#6E6E73" />
          </button>
        </div>

        {/* ── Infos générales ── */}
        <Section title="Informations">
          <InfoRow label="Créée le" value={fmtDate(nc.created_at)} />
          <InfoRow label="Date cible" value={fmtDate(nc.date_cible)} />
          {nc.action_owner_name && <InfoRow label="Responsable" value={nc.action_owner_name} />}
          {nc.statut === "levee" && nc.levee_le && (
            <div style={{ marginTop: 10, padding: "8px 12px", backgroundColor: "#F0FDF4", borderRadius: 10, border: "1px solid rgba(52,199,89,0.2)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#34C759" }}>
                ✓ Levée le {fmtDate(nc.levee_le)}
              </span>
            </div>
          )}
        </Section>

        {/* ── Observation ── */}
        <Section title="Observation">
          <p style={{ fontSize: 14, color: "#1D1D1F", lineHeight: 1.6, margin: 0 }}>
            {nc.description}
          </p>
        </Section>

        {/* ── Solution proposée ── */}
        {nc.solution_text && (
          <Section title="Solution proposée">
            <p style={{ fontSize: 14, color: "#1D1D1F", lineHeight: 1.6, margin: 0 }}>
              {nc.solution_text}
            </p>
          </Section>
        )}

        {/* ── Action ── */}
        {(nc.action_comment_text || nc.action_owner_name) && (
          <Section title="Action corrective">
            {nc.action_owner_name && (
              <p style={{ fontSize: 12, fontWeight: 600, color: "#6E6E73", margin: "0 0 6px" }}>
                Responsable : {nc.action_owner_name}
              </p>
            )}
            {nc.action_comment_text && (
              <p style={{ fontSize: 14, color: "#1D1D1F", lineHeight: 1.6, margin: 0 }}>
                {nc.action_comment_text}
              </p>
            )}
          </Section>
        )}

        {/* ── Coûts ── */}
        {(nc.cost_expl || nc.cost_iae) && (
          <Section title="Coûts estimés">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ padding: "10px 14px", backgroundColor: "#F5F5F7", borderRadius: 10 }}>
                <p style={{ fontSize: 11, color: "#8E8E93", margin: "0 0 4px", fontWeight: 600 }}>Exploitation</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>{fmtCost(nc.cost_expl)}</p>
              </div>
              <div style={{ padding: "10px 14px", backgroundColor: "#F5F5F7", borderRadius: 10 }}>
                <p style={{ fontSize: 11, color: "#8E8E93", margin: "0 0 4px", fontWeight: 600 }}>IAE</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>{fmtCost(nc.cost_iae)}</p>
              </div>
            </div>
            {coutTotal > 0 && (
              <p style={{ fontSize: 13, color: "#6E6E73", margin: "10px 0 0", textAlign: "right" }}>
                Total estimé : <strong style={{ color: "#1D1D1F" }}>{fmtCost(coutTotal)}</strong>
              </p>
            )}
          </Section>
        )}

        {/* ── Actions ── */}
        <div style={{ padding: "20px", marginTop: "auto" }}>
          {error && (
            <div style={{ backgroundColor: "#FF3B3015", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#FF3B30", fontSize: 13 }}>
              {error}
            </div>
          )}
          {nc.statut === "ouverte" && (
            <button
              onClick={marquerLevee}
              disabled={saving}
              style={{
                width: "100%", padding: "14px",
                backgroundColor: saving ? "#C7C7CC" : "#34C759",
                color: "#FFFFFF", border: "none", borderRadius: 14,
                fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving ? "none" : "0 2px 10px rgba(52,199,89,0.35)",
                marginBottom: 10,
              }}
            >
              {saving ? "Enregistrement…" : "Marquer comme levée ✓"}
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              width: "100%", padding: "12px", backgroundColor: "transparent",
              color: "#8E8E93", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 14,
              fontSize: 15, cursor: "pointer",
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Create sheet ──────────────────────────────────────────────────────────────

function CreateSheet({
  controles,
  onClose,
  onCreated,
}: {
  controles: SetControleItem[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [description, setDescription] = useState("");
  const [gravite, setGravite] = useState<"majeure" | "mineure">("mineure");
  const [controleId, setControleId] = useState("");
  const [dateCible, setDateCible] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [solutionText, setSolutionText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!description.trim()) { setError("La description est obligatoire"); return; }
    setSaving(true);
    setError("");
    try {
      await createNC({
        description: description.trim(),
        gravite,
        set_controle_id: controleId || undefined,
        date_cible: dateCible || undefined,
        action_owner_name: ownerName.trim() || undefined,
        solution_text: solutionText.trim() || undefined,
      });
      onCreated();
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Erreur inconnue";
      setError(msg);
      setSaving(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 200 }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        backgroundColor: "#FFFFFF", borderRadius: "24px 24px 0 0",
        padding: "20px 20px 48px", zIndex: 201,
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#C7C7CC", margin: "0 auto 18px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Nouvelle non-conformité</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={20} color="#8E8E93" />
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: "#FF3B3015", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#FF3B30", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Description */}
          <div>
            <label style={labelSt}>DESCRIPTION *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Décrivez la non-conformité constatée…"
              style={{ ...inputSt, resize: "vertical" as const }}
            />
          </div>

          {/* Gravité */}
          <div>
            <label style={labelSt}>GRAVITÉ</label>
            <div style={{ display: "flex", gap: 10 }}>
              {(["majeure", "mineure"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGravite(g)}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                    backgroundColor: gravite === g ? (g === "majeure" ? "#FF3B30" : "#FF9500") : "#F5F5F7",
                    color: gravite === g ? "#FFFFFF" : "#6E6E73",
                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                    textTransform: "capitalize" as const,
                  }}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Contrôle SET */}
          <div>
            <label style={labelSt}>CONTRÔLE SET ASSOCIÉ</label>
            <select value={controleId} onChange={(e) => setControleId(e.target.value)} style={{ ...inputSt, appearance: "none" as const }}>
              <option value="">— Aucun —</option>
              {controles.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          {/* Date cible */}
          <div>
            <label style={labelSt}>DATE CIBLE</label>
            <input type="date" value={dateCible} onChange={(e) => setDateCible(e.target.value)} style={inputSt} />
          </div>

          {/* Responsable */}
          <div>
            <label style={labelSt}>RESPONSABLE</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Nom du responsable de l'action"
              style={inputSt}
            />
          </div>

          {/* Solution proposée */}
          <div>
            <label style={labelSt}>SOLUTION PROPOSÉE</label>
            <textarea
              value={solutionText}
              onChange={(e) => setSolutionText(e.target.value)}
              rows={2}
              placeholder="Description de la solution envisagée…"
              style={{ ...inputSt, resize: "vertical" as const }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              width: "100%", padding: "14px",
              backgroundColor: saving ? "#C7C7CC" : "#2563EB",
              color: "#FFFFFF", border: "none", borderRadius: 14,
              fontSize: 16, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
              boxShadow: saving ? "none" : "0 2px 10px rgba(37,99,235,0.3)",
            }}
          >
            {saving ? "Création…" : "Créer la NC"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type Filter = "toutes" | "majeures" | "mineures" | "ouvertes" | "levees";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "toutes", label: "Toutes" },
  { key: "ouvertes", label: "Ouvertes" },
  { key: "majeures", label: "Majeures" },
  { key: "mineures", label: "Mineures" },
  { key: "levees", label: "Levées" },
];

export default function NonConformitesPage() {
  const [ncs, setNcs] = useState<NCRecord[]>([]);
  const [kpis, setKpis] = useState<NCKPIs>({ ouvertesTotal: 0, majeuresOuvertes: 0, leveeTotal: 0, coutTotal: 0 });
  const [controles, setControles] = useState<SetControleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("toutes");
  const [selected, setSelected] = useState<NCRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [ncData, kpiData, controleData] = await Promise.all([
      fetchNonConformites(),
      fetchNCKPIs(),
      fetchSetControlesList(),
    ]);
    setNcs(ncData);
    setKpis(kpiData);
    setControles(controleData);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  function handleUpdated() {
    setSelected(null);
    loadAll();
  }

  const filtered = ncs.filter((nc) => {
    if (filter === "ouvertes") return nc.statut === "ouverte";
    if (filter === "majeures") return nc.gravite === "majeure" && nc.statut === "ouverte";
    if (filter === "mineures") return nc.gravite === "mineure" && nc.statut === "ouverte";
    if (filter === "levees") return nc.statut === "levee";
    return true;
  });

  const counts: Record<Filter, number> = {
    toutes: ncs.length,
    ouvertes: ncs.filter((nc) => nc.statut === "ouverte").length,
    majeures: ncs.filter((nc) => nc.gravite === "majeure" && nc.statut === "ouverte").length,
    mineures: ncs.filter((nc) => nc.gravite === "mineure" && nc.statut === "ouverte").length,
    levees: ncs.filter((nc) => nc.statut === "levee").length,
  };

  const coutFormatted = kpis.coutTotal > 0
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(kpis.coutTotal)
    : "—";

  return (
    <div style={{ backgroundColor: "#F5F5F7", minHeight: "100vh", paddingBottom: 90 }}>

      {/* Header */}
      <div style={{ backgroundColor: "#FFFFFF", padding: "16px 16px 12px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.5px" }}>Non-conformités</h1>
        <p style={{ fontSize: 14, color: "#8E8E93", margin: 0 }}>
          {ncs.length} NC · Suivi des écarts et actions correctives
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 10, padding: "14px 16px 0", overflowX: "auto" }}>
        <KpiCard label="Ouvertes" value={`${kpis.ouvertesTotal}`} color={kpis.ouvertesTotal > 0 ? "#FF3B30" : "#34C759"} />
        <KpiCard label="Majeures" value={`${kpis.majeuresOuvertes}`} color={kpis.majeuresOuvertes > 0 ? "#FF3B30" : "#34C759"} sub="ouvertes" />
        <KpiCard label="Levées" value={`${kpis.leveeTotal}`} color="#34C759" />
        <KpiCard label="Coût total" value={coutFormatted} color="#1D1D1F" sub="estimé" />
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, padding: "12px 16px 0", overflowX: "auto" }}>
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              flexShrink: 0,
              padding: "6px 14px",
              borderRadius: 16,
              border: "none",
              backgroundColor: filter === key ? "#2563EB" : "#FFFFFF",
              color: filter === key ? "#FFFFFF" : "#6E6E73",
              fontSize: 13,
              fontWeight: filter === key ? 700 : 400,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {label}
            <span style={{
              backgroundColor: filter === key ? "rgba(255,255,255,0.3)" : "#F5F5F7",
              color: filter === key ? "#FFFFFF" : "#8E8E93",
              borderRadius: 10, fontSize: 11, fontWeight: 700, padding: "1px 6px",
            }}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#8E8E93" }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: 48, color: "#8E8E93",
            backgroundColor: "#FFFFFF", borderRadius: 16,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}>
            Aucune non-conformité dans cette catégorie
          </div>
        ) : (
          filtered.map((nc) => (
            <NCCard key={nc.id} nc={nc} onClick={() => setSelected(nc)} />
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        style={{
          position: "fixed", bottom: 80, right: 20,
          width: 52, height: 52, borderRadius: 26,
          backgroundColor: "#2563EB", color: "#FFFFFF",
          fontSize: 26, border: "none", cursor: "pointer",
          boxShadow: "0 4px 16px rgba(37,99,235,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100, fontWeight: 300,
        }}
      >
        +
      </button>

      {/* Detail drawer */}
      {selected && (
        <DetailDrawer
          nc={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}

      {/* Create sheet */}
      {showCreate && (
        <CreateSheet
          controles={controles}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadAll(); }}
        />
      )}
    </div>
  );
}
