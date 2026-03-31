"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  createNC,
  fetchNCKPIs,
  fetchNonConformites,
  fetchSetControlesList,
  fetchUsers,
  updateNCStatut,
  type NCKPIs,
  type NCRecord,
  type SetControleItem,
  type UserRecord,
} from "@/lib/supabase";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function initiales(prenom: string | null, nom: string | null): string {
  return `${(prenom?.[0] ?? "").toUpperCase()}${(nom?.[0] ?? "").toUpperCase()}`;
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
};

const labelSt: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#6E6E73",
  marginBottom: 6,
};

// ─── Statut badge ──────────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: NCRecord["statut"] }) {
  const cfg = {
    ouverte:  { bg: "#FF3B3018", color: "#FF3B30", label: "Ouverte" },
    en_cours: { bg: "#FF950018", color: "#FF9500", label: "En cours" },
    levee:    { bg: "#34C75918", color: "#34C759", label: "Levée" },
  }[statut];

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

function KpiCard({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <div style={{
      flex: "1 1 0", backgroundColor: "#FFFFFF", borderRadius: 16,
      padding: "14px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", minWidth: 90,
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#8E8E93", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── NC Card ───────────────────────────────────────────────────────────────────

function NCCard({ nc, onClick }: { nc: NCRecord; onClick: () => void }) {
  const dotColor = nc.gravite === "majeure" ? "#FF3B30" : "#FF9500";
  const hasAssignee = nc.assigne_prenom && nc.assigne_nom;

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: "14px 16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        cursor: "pointer",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      {/* Dot */}
      <div style={{
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: dotColor, flexShrink: 0, marginTop: 5,
      }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#1D1D1F", marginBottom: 3, lineHeight: 1.3 }}>
          {nc.description}
        </div>
        {nc.controle_nom && (
          <div style={{ fontSize: 12, color: "#8E8E93", marginBottom: 8 }}>
            {nc.controle_nom}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <StatutBadge statut={nc.statut} />
          {nc.date_cible && (
            <span style={{ fontSize: 12, color: "#8E8E93" }}>
              Cible : {fmtDate(nc.date_cible)}
            </span>
          )}
        </div>
      </div>

      {/* Assignee avatar */}
      {hasAssignee && (
        <div style={{
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: "#2563EB22",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB" }}>
            {initiales(nc.assigne_prenom, nc.assigne_nom)}
          </span>
        </div>
      )}
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

  async function passer(newStatut: "en_cours" | "levee") {
    setSaving(true);
    setError("");
    try {
      await updateNCStatut(nc.id, newStatut);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setSaving(false);
    }
  }

  const dotColor = nc.gravite === "majeure" ? "#FF3B30" : "#FF9500";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 200 }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        backgroundColor: "#FFFFFF", borderRadius: "24px 24px 0 0",
        padding: "20px 20px 44px", zIndex: 201,
        maxHeight: "85vh", overflowY: "auto",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#C7C7CC", margin: "0 auto 20px" }} />

        {/* Header */}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dotColor, flexShrink: 0, marginTop: 5 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", lineHeight: 1.3, marginBottom: 6 }}>
              {nc.description}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <StatutBadge statut={nc.statut} />
              <span style={{
                fontSize: 11, fontWeight: 600,
                backgroundColor: dotColor + "22", color: dotColor,
                padding: "2px 8px", borderRadius: 16, textTransform: "uppercase" as const,
              }}>
                {nc.gravite}
              </span>
            </div>
          </div>
        </div>

        {/* Info rows */}
        {[
          { label: "Créée le", value: fmtDate(nc.created_at) },
          { label: "Contrôle associé", value: nc.controle_nom ?? "—" },
          { label: "Date cible", value: fmtDate(nc.date_cible) },
          {
            label: "Assignée à",
            value: nc.assigne_prenom
              ? `${nc.assigne_prenom} ${nc.assigne_nom ?? ""}`.trim()
              : "—",
          },
        ].map(({ label, value }) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderBottom: "1px solid #F5F5F7",
          }}>
            <span style={{ fontSize: 14, color: "#8E8E93" }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F" }}>{value}</span>
          </div>
        ))}


        {error && (
          <div style={{
            backgroundColor: "#FF3B3015", borderRadius: 10, padding: "10px 14px",
            marginTop: 12, color: "#FF3B30", fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          {nc.statut === "ouverte" && (
            <button
              onClick={() => passer("en_cours")}
              disabled={saving}
              style={{
                padding: "14px", backgroundColor: saving ? "#C7C7CC" : "#FF9500",
                color: "#FFFFFF", border: "none", borderRadius: 14,
                fontSize: 16, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Mise à jour…" : "Passer En cours"}
            </button>
          )}
          {nc.statut === "en_cours" && (
            <button
              onClick={() => passer("levee")}
              disabled={saving}
              style={{
                padding: "14px",
                backgroundColor: saving ? "#C7C7CC" : "#34C759",
                color: "#FFFFFF", border: "none", borderRadius: 14,
                fontSize: 16, fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Clôture…" : "Marquer comme levée"}
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: "14px", backgroundColor: "transparent",
              color: "#8E8E93", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 14,
              fontSize: 16, cursor: "pointer",
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
  users,
  controles,
  onClose,
  onCreated,
}: {
  users: UserRecord[];
  controles: SetControleItem[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [description, setDescription] = useState("");
  const [gravite, setGravite] = useState<"majeure" | "mineure">("mineure");
  const [controleId, setControleId] = useState("");
  const [dateCible, setDateCible] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
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
        assigne_a: assigneeId || undefined,
      });
      onCreated();
    } catch (e) {
      console.error("createNC error:", e);
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
        padding: "20px 20px 44px", zIndex: 201,
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#C7C7CC", margin: "0 auto 20px" }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 20px" }}>Nouvelle non-conformité</h2>

        {error && (
          <div style={{
            backgroundColor: "#FF3B3015", borderRadius: 10, padding: "10px 14px",
            marginBottom: 16, color: "#FF3B30", fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Description */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelSt}>Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Décrivez la non-conformité constatée…"
            style={{ ...inputSt, resize: "vertical" as const }}
          />
        </div>

        {/* Gravité */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelSt}>Gravité</label>
          <div style={{ display: "flex", gap: 10 }}>
            {(["majeure", "mineure"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGravite(g)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                  backgroundColor: gravite === g
                    ? (g === "majeure" ? "#FF3B30" : "#FF9500")
                    : "#F5F5F7",
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
        <div style={{ marginBottom: 16 }}>
          <label style={labelSt}>Contrôle SET associé</label>
          <select value={controleId} onChange={(e) => setControleId(e.target.value)} style={inputSt}>
            <option value="">— Aucun —</option>
            {controles.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>

        {/* Date cible */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelSt}>Date cible</label>
          <input
            type="date"
            value={dateCible}
            onChange={(e) => setDateCible(e.target.value)}
            style={inputSt}
          />
        </div>

        {/* Assignée à */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelSt}>Assignée à</label>
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={inputSt}>
            <option value="">— Non assignée —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            width: "100%", padding: "14px",
            backgroundColor: saving ? "#C7C7CC" : "#2563EB",
            color: "#FFFFFF", border: "none", borderRadius: 14,
            fontSize: 16, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Création…" : "Créer la NC"}
        </button>
      </div>
    </>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type Filter = "toutes" | "majeures" | "mineures" | "levees";

export default function NonConformitesPage() {
  const [ncs, setNcs] = useState<NCRecord[]>([]);
  const [kpis, setKpis] = useState<NCKPIs>({ ouvertesTotal: 0, majeuresOuvertes: 0, leevesCeMois: 0 });
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [controles, setControles] = useState<SetControleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("toutes");
  const [selected, setSelected] = useState<NCRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [ncData, kpiData, userData, controleData] = await Promise.all([
      fetchNonConformites(),
      fetchNCKPIs(),
      fetchUsers(),
      fetchSetControlesList(),
    ]);
    setNcs(ncData);
    setKpis(kpiData);
    setUsers(userData);
    setControles(controleData);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  function handleUpdated() {
    setSelected(null);
    loadAll();
  }

  // Filter logic
  const filtered = ncs.filter((nc) => {
    if (filter === "majeures") return nc.gravite === "majeure" && nc.statut !== "levee";
    if (filter === "mineures") return nc.gravite === "mineure" && nc.statut !== "levee";
    if (filter === "levees") return nc.statut === "levee";
    return true; // toutes
  });

  const counts: Record<Filter, number> = {
    toutes: ncs.length,
    majeures: ncs.filter((nc) => nc.gravite === "majeure" && nc.statut !== "levee").length,
    mineures: ncs.filter((nc) => nc.gravite === "mineure" && nc.statut !== "levee").length,
    levees: ncs.filter((nc) => nc.statut === "levee").length,
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "toutes", label: "Toutes" },
    { key: "majeures", label: "Majeures" },
    { key: "mineures", label: "Mineures" },
    { key: "levees", label: "Levées" },
  ];

  return (
    <div style={{ backgroundColor: "#F5F5F7", minHeight: "100vh", paddingBottom: 90 }}>

      {/* Header */}
      <div style={{ backgroundColor: "#FFFFFF", padding: "16px 16px 12px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 4px" }}>Non-conformités</h1>
        <p style={{ fontSize: 14, color: "#8E8E93", margin: 0 }}>
          Suivi des écarts et actions correctives
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, padding: "16px 16px 0" }}>
        <KpiCard label="Ouvertes" value={kpis.ouvertesTotal} color="#1D1D1F" />
        <KpiCard label="Majeures" value={kpis.majeuresOuvertes} color="#FF3B30" sub="non levées" />
        <KpiCard label="Levées" value={kpis.leevesCeMois} color="#34C759" sub="ce mois" />
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, padding: "16px 16px 0", overflowX: "auto" }}>
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
              fontSize: 14,
              fontWeight: filter === key ? 700 : 400,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {label}
            <span style={{
              backgroundColor: filter === key ? "rgba(255,255,255,0.3)" : "#F5F5F7",
              color: filter === key ? "#FFFFFF" : "#8E8E93",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
              padding: "1px 6px",
            }}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
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
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: "#2563EB", color: "#FFFFFF",
          fontSize: 28, border: "none", cursor: "pointer",
          boxShadow: "0 4px 16px rgba(37,99,235,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100,
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
          users={users}
          controles={controles}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadAll(); }}
        />
      )}
    </div>
  );
}
