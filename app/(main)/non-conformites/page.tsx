"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, X, AlertTriangle, CheckCircle2, Search, FileDown, Pencil, Trash2 } from "lucide-react";
import {
  createNC,
  deleteNC,
  fetchNCEvolution,
  fetchNCKPIs,
  fetchNonConformites,
  fetchSetControlesList,
  updateNC,
  updateNCStatut,
  type NCEvolutionItem,
  type NCKPIs,
  type NCRecord,
  type SetControleItem,
} from "@/lib/supabase";
import Header from "@/components/layout/Header";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function fmtCost(v: number | null): string | null {
  if (!v || v === 0) return null;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

// ─── Style constants ───────────────────────────────────────────────────────────

const inputSt: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.10)", fontSize: 14,
  backgroundColor: "#F5F5F7", outline: "none", boxSizing: "border-box",
  fontFamily: "var(--font-inter, system-ui, sans-serif)", color: "#1D1D1F",
};

const labelSt: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#6E6E73",
  letterSpacing: "0.3px", marginBottom: 6,
};

// ─── Badges ────────────────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: NCRecord["statut"] }) {
  const cfg = statut === "levee"
    ? { bg: "#34C75918", color: "#34C759", label: "Levée" }
    : { bg: "#FF3B3015", color: "#FF3B30", label: "Ouverte" };
  return (
    <span style={{ backgroundColor: cfg.bg, color: cfg.color, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 12, textTransform: "uppercase" as const, letterSpacing: 0.4, whiteSpace: "nowrap" as const }}>
      {cfg.label}
    </span>
  );
}

function GraviteBadge({ gravite }: { gravite: NCRecord["gravite"] }) {
  const cfg = gravite === "majeure"
    ? { bg: "#FF3B3015", color: "#FF3B30", label: "Maj." }
    : { bg: "#FF950015", color: "#FF9500", label: "Min." };
  return (
    <span style={{ backgroundColor: cfg.bg, color: cfg.color, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 12, textTransform: "uppercase" as const, letterSpacing: 0.4, whiteSpace: "nowrap" as const }}>
      {cfg.label}
    </span>
  );
}

// ─── Groupe accordéon par contrôle ────────────────────────────────────────────

function GroupeControle({
  controleNom,
  ncs,
  onSelect,
  selectedId,
}: {
  controleNom: string;
  ncs: NCRecord[];
  onSelect: (nc: NCRecord) => void;
  selectedId: string | null;
}) {
  const [open, setOpen] = useState(true);

  const nbMajeures = ncs.filter(nc => nc.gravite === "majeure" && nc.statut === "ouverte").length;
  const nbOuvertes = ncs.filter(nc => nc.statut === "ouverte").length;
  const nbLevees   = ncs.filter(nc => nc.statut === "levee").length;
  const accentColor = nbMajeures > 0 ? "#FF3B30" : nbOuvertes > 0 ? "#FF9500" : "#34C759";

  return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)", overflow: "hidden" }}>
      {/* En-tête groupe */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", backgroundColor: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        {open ? <ChevronDown size={15} color="#AEAEB2" /> : <ChevronRight size={15} color="#AEAEB2" />}

        {/* Barre accent */}
        <div style={{ width: 3, height: 20, borderRadius: 99, backgroundColor: accentColor, flexShrink: 0 }} />

        <span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {controleNom || "Sans contrôle associé"}
        </span>

        {/* Compteurs */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {nbMajeures > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#FF3B30", backgroundColor: "#FF3B3012", padding: "2px 8px", borderRadius: 10 }}>
              {nbMajeures} maj.
            </span>
          )}
          {nbOuvertes > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "#6E6E73", backgroundColor: "#F5F5F7", padding: "2px 8px", borderRadius: 10 }}>
              {nbOuvertes} ouverte{nbOuvertes > 1 ? "s" : ""}
            </span>
          )}
          {nbLevees > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "#34C759", backgroundColor: "#34C75912", padding: "2px 8px", borderRadius: 10 }}>
              {nbLevees} levée{nbLevees > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </button>

      {/* Lignes NC */}
      {open && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          {ncs.map((nc, i) => (
            <button
              key={nc.id}
              onClick={() => onSelect(nc)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px",
                backgroundColor: selectedId === nc.id ? "#EFF6FF" : "transparent",
                border: "none", borderTop: i > 0 ? "1px solid rgba(0,0,0,0.04)" : "none",
                cursor: "pointer", textAlign: "left",
                transition: "background-color 0.1s",
              }}
              onMouseEnter={e => { if (selectedId !== nc.id) (e.currentTarget as HTMLElement).style.backgroundColor = "#F9F9FB"; }}
              onMouseLeave={e => { if (selectedId !== nc.id) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            >
              {/* Numéro obs */}
              {nc.source_obs_no && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#AEAEB2", width: 32, flexShrink: 0, textAlign: "right" }}>
                  #{nc.source_obs_no}
                </span>
              )}

              {/* Description */}
              <span style={{ flex: 1, fontSize: 13, color: "#1D1D1F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                {nc.description}
              </span>

              {/* Badges + date + coûts */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <GraviteBadge gravite={nc.gravite} />
                <StatutBadge statut={nc.statut} />
                {nc.date_cible && (
                  <span style={{ fontSize: 11, color: nc.statut === "ouverte" ? "#FF9500" : "#AEAEB2", whiteSpace: "nowrap" }}>
                    {fmtDate(nc.date_cible)}
                  </span>
                )}
                {fmtCost(nc.cost_expl) && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#6E6E73", backgroundColor: "#F5F5F7", padding: "1px 6px", borderRadius: 8, whiteSpace: "nowrap" }}>
                    Expl. {fmtCost(nc.cost_expl)}
                  </span>
                )}
                {fmtCost(nc.cost_iae) && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#6E6E73", backgroundColor: "#F5F5F7", padding: "1px 6px", borderRadius: 8, whiteSpace: "nowrap" }}>
                    IAE {fmtCost(nc.cost_iae)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Drawer détail ─────────────────────────────────────────────────────────────

function DetailDrawer({ nc, onClose, onUpdated, onDeleted }: { nc: NCRecord; onClose: () => void; onUpdated: () => void; onDeleted: () => void }) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Vue ──
  function ViewMode() {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);

    async function marquerLevee() {
      setSaving(true); setError("");
      try {
        await updateNCStatut(nc.id, "levee");
        setDone(true);
        setTimeout(() => { onUpdated(); }, 900);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
        setSaving(false);
      }
    }

    const coutTotal = (nc.cost_expl ?? 0) + (nc.cost_iae ?? 0);
    const hasCout = coutTotal > 0;

    return (
      <>
        {/* ── Infos clés ── */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
          {[
            { label: "Créée le",    value: fmtDate(nc.created_at) },
            { label: "Date cible",  value: fmtDate(nc.date_cible) },
            { label: "Responsable", value: nc.action_owner_name || "—" },
            { label: "Statut",      value: nc.statut === "levee" ? `Levée le ${fmtDate(nc.levee_le)}` : "Ouverte" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 3px" }}>{label}</p>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#1D1D1F", margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Solution ── */}
        {nc.solution_text && (
          <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px" }}>Solution proposée</p>
            <p style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.6, margin: 0 }}>{nc.solution_text}</p>
          </div>
        )}

        {/* ── Action corrective ── */}
        {nc.action_comment_text && (
          <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px" }}>Action corrective</p>
            <p style={{ fontSize: 13, color: "#1D1D1F", lineHeight: 1.6, margin: 0 }}>{nc.action_comment_text}</p>
          </div>
        )}

        {/* ── Coûts ── */}
        {hasCout && (
          <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 10px" }}>Coûts estimés</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {fmtCost(nc.cost_expl) && (
                <div style={{ padding: "10px 12px", backgroundColor: "#F5F5F7", borderRadius: 10 }}>
                  <p style={{ fontSize: 10, color: "#8E8E93", margin: "0 0 3px", fontWeight: 600, textTransform: "uppercase" }}>Exploitation</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>{fmtCost(nc.cost_expl)}</p>
                </div>
              )}
              {fmtCost(nc.cost_iae) && (
                <div style={{ padding: "10px 12px", backgroundColor: "#F5F5F7", borderRadius: 10 }}>
                  <p style={{ fontSize: 10, color: "#8E8E93", margin: "0 0 3px", fontWeight: 600, textTransform: "uppercase" }}>IAE</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>{fmtCost(nc.cost_iae)}</p>
                </div>
              )}
            </div>
            <p style={{ fontSize: 12, color: "#6E6E73", margin: "8px 0 0", textAlign: "right" }}>
              Total : <strong style={{ color: "#1D1D1F" }}>{fmtCost(coutTotal)}</strong>
            </p>
          </div>
        )}

        {/* ── Actions ── */}
        <div style={{ padding: "20px 24px", marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {error && (
            <p style={{ fontSize: 13, color: "#FF3B30", backgroundColor: "#FF3B3010", padding: "10px 12px", borderRadius: 10, margin: 0 }}>{error}</p>
          )}
          {nc.statut === "ouverte" && (
            <button
              onClick={marquerLevee}
              disabled={saving || done}
              style={{ width: "100%", padding: "13px", backgroundColor: done ? "#34C759" : saving ? "#C7C7CC" : "#1D1D1F", color: "#FFFFFF", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: (saving || done) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {done ? <><CheckCircle2 size={16} /> Levée !</> : saving ? "Enregistrement…" : <><CheckCircle2 size={16} /> Marquer comme levée</>}
            </button>
          )}
          {nc.statut === "levee" && (
            <div style={{ padding: "10px 14px", backgroundColor: "#F0FDF4", borderRadius: 12, border: "1px solid rgba(52,199,89,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={16} color="#34C759" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#34C759" }}>Levée le {fmtDate(nc.levee_le)}</span>
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "12px", backgroundColor: "transparent", color: "#8E8E93", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 12, fontSize: 14, cursor: "pointer" }}>
              Fermer
            </button>
            <button onClick={() => setConfirmDelete(true)} style={{ padding: "12px 16px", backgroundColor: "transparent", color: "#FF3B30", border: "1px solid rgba(255,59,48,0.25)", borderRadius: 12, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Trash2 size={14} /> Supprimer
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Édition ──
  function EditMode() {
    const [description, setDescription]     = useState(nc.description);
    const [gravite, setGravite]             = useState<"majeure" | "mineure">(nc.gravite);
    const [dateCible, setDateCible]         = useState(nc.date_cible ?? "");
    const [ownerName, setOwnerName]         = useState(nc.action_owner_name ?? "");
    const [solutionText, setSolutionText]   = useState(nc.solution_text ?? "");
    const [actionText, setActionText]       = useState(nc.action_comment_text ?? "");
    const [costExpl, setCostExpl]           = useState(nc.cost_expl != null ? String(nc.cost_expl) : "");
    const [costIae, setCostIae]             = useState(nc.cost_iae  != null ? String(nc.cost_iae)  : "");
    const [saving, setSaving]               = useState(false);
    const [error, setError]                 = useState("");

    async function handleSave() {
      if (!description.trim()) { setError("La description est obligatoire"); return; }
      setSaving(true); setError("");
      try {
        await updateNC(nc.id, {
          description: description.trim(),
          gravite,
          date_cible:          dateCible  || null,
          action_owner_name:   ownerName.trim()     || null,
          solution_text:       solutionText.trim()  || null,
          action_comment_text: actionText.trim()    || null,
          cost_expl: costExpl ? parseFloat(costExpl) : null,
          cost_iae:  costIae  ? parseFloat(costIae)  : null,
        });
        onUpdated();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
        setSaving(false);
      }
    }

    return (
      <div style={{ padding: "16px 24px 40px", display: "flex", flexDirection: "column", gap: 13, flex: 1 }}>
        {error && <div style={{ backgroundColor: "#FF3B3012", borderRadius: 10, padding: "10px 14px", color: "#FF3B30", fontSize: 13 }}>{error}</div>}

        <div>
          <label style={labelSt}>DESCRIPTION *</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputSt, resize: "vertical" as const }} />
        </div>

        <div>
          <label style={labelSt}>GRAVITÉ</label>
          <div style={{ display: "flex", gap: 8 }}>
            {(["majeure", "mineure"] as const).map(g => (
              <button key={g} type="button" onClick={() => setGravite(g)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", backgroundColor: gravite === g ? (g === "majeure" ? "#FF3B30" : "#FF9500") : "#F5F5F7", color: gravite === g ? "#FFFFFF" : "#6E6E73", fontSize: 14, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" as const }}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelSt}>DATE CIBLE</label>
          <input type="date" value={dateCible} onChange={e => setDateCible(e.target.value)} style={inputSt} />
        </div>

        <div>
          <label style={labelSt}>RESPONSABLE</label>
          <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Nom du responsable" style={inputSt} />
        </div>

        <div>
          <label style={labelSt}>SOLUTION PROPOSÉE</label>
          <textarea value={solutionText} onChange={e => setSolutionText(e.target.value)} rows={2} style={{ ...inputSt, resize: "vertical" as const }} />
        </div>

        <div>
          <label style={labelSt}>ACTION CORRECTIVE</label>
          <textarea value={actionText} onChange={e => setActionText(e.target.value)} rows={2} style={{ ...inputSt, resize: "vertical" as const }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelSt}>COÛT EXPLOITATION (€)</label>
            <input type="number" min="0" value={costExpl} onChange={e => setCostExpl(e.target.value)} placeholder="0" style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>COÛT IAE (€)</label>
            <input type="number" min="0" value={costIae} onChange={e => setCostIae(e.target.value)} placeholder="0" style={inputSt} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
          <button onClick={() => setMode("view")} style={{ flex: 1, padding: "12px", backgroundColor: "transparent", color: "#8E8E93", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 12, fontSize: 14, cursor: "pointer" }}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "12px", backgroundColor: saving ? "#C7C7CC" : "#2563EB", color: "#FFFFFF", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 200 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 500, backgroundColor: "#FFFFFF", zIndex: 201, display: "flex", flexDirection: "column", boxShadow: "-20px 0 60px rgba(0,0,0,0.10)", overflowY: "auto" }}>

        {/* ── En-tête ── */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {nc.source_obs_no && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", backgroundColor: "#F5F5F7", padding: "2px 8px", borderRadius: 10 }}>
                    Obs. #{nc.source_obs_no}
                  </span>
                )}
                <GraviteBadge gravite={nc.gravite} />
                <StatutBadge statut={nc.statut} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#1D1D1F", lineHeight: 1.5, margin: 0 }}>
                {mode === "view" ? nc.description : "Modifier la NC"}
              </p>
              {mode === "view" && nc.controle_nom && (
                <p style={{ fontSize: 12, color: "#8E8E93", margin: "8px 0 0", lineHeight: 1.4 }}>{nc.controle_nom}</p>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {mode === "view" && (
                <button
                  onClick={() => setMode("edit")}
                  style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.10)", backgroundColor: "#F5F5F7", fontSize: 12, fontWeight: 500, color: "#1D1D1F", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                >
                  <Pencil size={12} /> Modifier
                </button>
              )}
              <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", backgroundColor: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={14} color="#6E6E73" />
              </button>
            </div>
          </div>
        </div>

        {mode === "view" ? <ViewMode /> : <EditMode />}
      </div>

      {/* ── Confirmation suppression ── */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 28, width: 320, boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#1D1D1F", margin: "0 0 8px" }}>Supprimer cette NC ?</p>
            <p style={{ fontSize: 14, color: "#6E6E73", margin: "0 0 24px", lineHeight: 1.5 }}>
              Cette action est irréversible.{nc.source_obs_no ? ` L'obs. #${nc.source_obs_no} sera définitivement supprimée.` : ""}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, height: 44, borderRadius: 12, border: "1px solid rgba(0,0,0,0.10)", backgroundColor: "#FFFFFF", fontSize: 15, fontWeight: 600, cursor: "pointer", color: "#1D1D1F" }}>
                Annuler
              </button>
              <button
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try { await deleteNC(nc.id); onDeleted(); }
                  catch { setDeleting(false); setConfirmDelete(false); }
                }}
                style={{ flex: 1, height: 44, borderRadius: 12, border: "none", backgroundColor: "#FF3B30", fontSize: 15, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer", color: "#FFFFFF", opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? "…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Formulaire création ───────────────────────────────────────────────────────

function CreateSheet({ controles, onClose, onCreated }: { controles: SetControleItem[]; onClose: () => void; onCreated: () => void }) {
  const [description, setDescription] = useState("");
  const [gravite, setGravite]         = useState<"majeure" | "mineure">("mineure");
  const [controleId, setControleId]   = useState("");
  const [dateCible, setDateCible]     = useState("");
  const [ownerName, setOwnerName]     = useState("");
  const [solutionText, setSolutionText]   = useState("");
  const [actionText, setActionText]       = useState("");
  const [costExpl, setCostExpl]           = useState("");
  const [costIae, setCostIae]             = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function handleSubmit() {
    if (!description.trim()) { setError("La description est obligatoire"); return; }
    setSaving(true); setError("");
    try {
      await createNC({
        description: description.trim(),
        gravite,
        set_controle_id:     controleId || undefined,
        date_cible:          dateCible  || undefined,
        action_owner_name:   ownerName.trim()     || undefined,
        solution_text:       solutionText.trim()  || undefined,
        action_comment_text: actionText.trim()    || undefined,
        cost_expl: costExpl ? parseFloat(costExpl) : null,
        cost_iae:  costIae  ? parseFloat(costIae)  : null,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setSaving(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 200 }} />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", borderRadius: "20px 20px 0 0", padding: "20px 20px 48px", zIndex: 201, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#C7C7CC", margin: "0 auto 16px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Nouvelle non-conformité</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color="#8E8E93" /></button>
        </div>

        {error && <div style={{ backgroundColor: "#FF3B3012", borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: "#FF3B30", fontSize: 13 }}>{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div>
            <label style={labelSt}>DESCRIPTION *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Décrivez la non-conformité…" style={{ ...inputSt, resize: "vertical" as const }} />
          </div>
          <div>
            <label style={labelSt}>GRAVITÉ</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["majeure", "mineure"] as const).map(g => (
                <button key={g} type="button" onClick={() => setGravite(g)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", backgroundColor: gravite === g ? (g === "majeure" ? "#FF3B30" : "#FF9500") : "#F5F5F7", color: gravite === g ? "#FFFFFF" : "#6E6E73", fontSize: 14, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" as const }}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelSt}>CONTRÔLE SET ASSOCIÉ</label>
            <select value={controleId} onChange={e => setControleId(e.target.value)} style={{ ...inputSt, appearance: "none" as const }}>
              <option value="">— Aucun —</option>
              {controles.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSt}>DATE CIBLE</label>
            <input type="date" value={dateCible} onChange={e => setDateCible(e.target.value)} style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>RESPONSABLE</label>
            <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Nom du responsable" style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>SOLUTION PROPOSÉE</label>
            <textarea value={solutionText} onChange={e => setSolutionText(e.target.value)} rows={2} placeholder="Description de la solution…" style={{ ...inputSt, resize: "vertical" as const }} />
          </div>
          <div>
            <label style={labelSt}>ACTION CORRECTIVE</label>
            <textarea value={actionText} onChange={e => setActionText(e.target.value)} rows={2} placeholder="Action à mener…" style={{ ...inputSt, resize: "vertical" as const }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelSt}>COÛT EXPLOITATION (€)</label>
              <input type="number" min="0" value={costExpl} onChange={e => setCostExpl(e.target.value)} placeholder="0" style={inputSt} />
            </div>
            <div>
              <label style={labelSt}>COÛT IAE (€)</label>
              <input type="number" min="0" value={costIae} onChange={e => setCostIae(e.target.value)} placeholder="0" style={inputSt} />
            </div>
          </div>
          <button onClick={handleSubmit} disabled={saving} style={{ width: "100%", padding: "13px", backgroundColor: saving ? "#C7C7CC" : "#2563EB", color: "#FFFFFF", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Création…" : "Créer la NC"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type Filter = "toutes" | "ouvertes" | "majeures" | "mineures" | "levees";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "toutes",   label: "Toutes" },
  { key: "ouvertes", label: "Ouvertes" },
  { key: "majeures", label: "Majeures" },
  { key: "mineures", label: "Mineures" },
  { key: "levees",   label: "Levées" },
];

export default function NonConformitesPage() {
  const [ncs, setNcs] = useState<NCRecord[]>([]);
  const [kpis, setKpis] = useState<NCKPIs>({ ouvertesTotal: 0, majeuresOuvertes: 0, leveeTotal: 0, coutTotal: 0, coutExpl: 0, coutIae: 0 });
  const [evolution, setEvolution] = useState<NCEvolutionItem[]>([]);
  const [controles, setControles] = useState<SetControleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("toutes");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<NCRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [ncData, kpiData, controleData, evoData] = await Promise.all([
      fetchNonConformites(),
      fetchNCKPIs(),
      fetchSetControlesList(),
      fetchNCEvolution(),
    ]);
    setNcs(ncData);
    setKpis(kpiData);
    setControles(controleData);
    setEvolution(evoData);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  function handleUpdated() { setSelected(null); loadAll(); }
  function handleDeleted() { setSelected(null); loadAll(); }

  // ── Filtrage + recherche ──
  const filtered = useMemo(() => ncs.filter(nc => {
    if (filter === "ouvertes") return nc.statut === "ouverte";
    if (filter === "majeures") return nc.gravite === "majeure";
    if (filter === "mineures") return nc.gravite === "mineure";
    if (filter === "levees")   return nc.statut === "levee";
    return true;
  }), [ncs, filter]);

  const q = search.trim().toLowerCase();
  const displayed = useMemo(() => {
    if (!q) return filtered;
    return filtered.filter(nc =>
      nc.description.toLowerCase().includes(q) ||
      (nc.source_obs_no ?? "").toLowerCase().includes(q) ||
      (nc.action_owner_name ?? "").toLowerCase().includes(q)
    );
  }, [filtered, q]);

  const counts: Record<Filter, number> = useMemo(() => ({
    toutes:   ncs.length,
    ouvertes: ncs.filter(nc => nc.statut === "ouverte").length,
    majeures: ncs.filter(nc => nc.gravite === "majeure").length,
    mineures: ncs.filter(nc => nc.gravite === "mineure").length,
    levees:   ncs.filter(nc => nc.statut === "levee").length,
  }), [ncs]);

  // ── Groupement par contrôle ──
  const groupes = useMemo(() => {
    const map = new Map<string, NCRecord[]>();
    for (const nc of displayed) {
      const key = nc.controle_nom ?? "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(nc);
    }
    // Trier : groupes avec majeures ouvertes en premier
    return Array.from(map.entries()).sort(([, a], [, b]) => {
      const aMaj = a.filter(nc => nc.gravite === "majeure" && nc.statut === "ouverte").length;
      const bMaj = b.filter(nc => nc.gravite === "majeure" && nc.statut === "ouverte").length;
      return bMaj - aMaj;
    });
  }, [displayed]);

  async function exportPDF() {
    setExporting(true);
    try {
      const [{ pdf }, { RegistreNCPdf }, React] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/pdf/RegistreNCPdf"),
        import("react"),
      ]);
      const filterLabel = FILTERS.find(f => f.key === filter)?.label ?? "Toutes";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(
        React.default.createElement(RegistreNCPdf, { ncs: displayed, kpis, filterLabel }) as any
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NC_Sofitel_Ajaccio_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Header title="Non-conformités" subtitle="Sofitel Ajaccio" />

      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* ── Titre + bouton ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", margin: 0, letterSpacing: "-0.5px" }}>Non-conformités</h1>
            <p style={{ fontSize: 13, color: "#AEAEB2", margin: "4px 0 0" }}>
              {ncs.length} NC · {groupes.length} contrôle{groupes.length > 1 ? "s" : ""} concerné{groupes.length > 1 ? "s" : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={exportPDF}
              disabled={exporting}
              style={{ height: 36, padding: "0 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.10)", backgroundColor: "#FFFFFF", fontSize: 13, fontWeight: 500, color: "#6E6E73", cursor: exporting ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              <FileDown size={15} />
              {exporting ? "Export…" : "Export PDF"}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              style={{ height: 36, padding: "0 16px", borderRadius: 10, border: "none", backgroundColor: "#2563EB", fontSize: 13, fontWeight: 500, color: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 4px rgba(37,99,235,0.3)" }}
            >
              <Plus size={15} strokeWidth={2.5} />
              Nouvelle NC
            </button>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          {[
            { label: "Ouvertes",  value: `${kpis.ouvertesTotal}`,     color: kpis.ouvertesTotal > 0 ? "#FF3B30" : "#34C759", icon: <AlertTriangle size={13} /> },
            { label: "Majeures",  value: `${kpis.majeuresOuvertes}`,  color: kpis.majeuresOuvertes > 0 ? "#FF3B30" : "#34C759", sub: "ouvertes" },
            { label: "Levées",    value: `${kpis.leveeTotal}`,        color: "#34C759", icon: <CheckCircle2 size={13} /> },
            { label: "Coût Expl.", value: kpis.coutExpl > 0 ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(kpis.coutExpl) : "—", color: "#1D1D1F", sub: "exploitation" },
            { label: "Coût IAE",  value: kpis.coutIae  > 0 ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(kpis.coutIae)  : "—", color: "#1D1D1F", sub: "investissement" },
          ].map(({ label, value, color, sub, icon }) => (
            <div key={label} style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: "14px 16px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 6px", display: "flex", alignItems: "center", gap: 4 }}>
                {icon} {label}
              </p>
              <p style={{ fontSize: 20, fontWeight: 700, color, margin: 0, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</p>
              {sub && <p style={{ fontSize: 10, color: "#AEAEB2", margin: "3px 0 0" }}>{sub}</p>}
            </div>
          ))}
        </div>

        {/* ── Évolution 6 mois ── */}
        {evolution.length > 0 && (() => {
          const maxTotal = Math.max(...evolution.map(e => e.total), 1);
          const BAR_H = 80;
          return (
            <div style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>Évolution sur 6 mois</p>
                <div style={{ display: "flex", gap: 12 }}>
                  {[{ color: "#FF3B30", label: "Majeures" }, { color: "#2563EB", label: "Levées" }, { color: "#E5E7EB", label: "Total" }].map(({ color, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
                      <span style={{ fontSize: 11, color: "#AEAEB2" }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: BAR_H + 28 }}>
                {evolution.map((item) => (
                  <div key={item.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    {/* valeur */}
                    <span style={{ fontSize: 10, fontWeight: 600, color: item.total > 0 ? "#1D1D1F" : "#AEAEB2", minHeight: 14 }}>
                      {item.total > 0 ? item.total : ""}
                    </span>
                    {/* barres empilées */}
                    <div style={{ width: "100%", height: BAR_H, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 1 }}>
                      {item.total > 0 ? (
                        <>
                          <div style={{ width: "100%", height: Math.max(3, (item.levees / maxTotal) * BAR_H), backgroundColor: "#2563EB", borderRadius: "3px 3px 0 0" }} />
                          <div style={{ width: "100%", height: Math.max(item.majeures > 0 ? 3 : 0, (item.majeures / maxTotal) * BAR_H), backgroundColor: "#FF3B30" }} />
                          <div style={{ width: "100%", height: Math.max(3, ((item.total - item.majeures - item.levees) / maxTotal) * BAR_H), backgroundColor: "#E5E7EB", borderRadius: item.majeures === 0 && item.levees === 0 ? "3px 3px 0 0" : 0 }} />
                        </>
                      ) : (
                        <div style={{ width: "100%", height: 3, backgroundColor: "#F5F5F7", borderRadius: 2 }} />
                      )}
                    </div>
                    {/* label mois */}
                    <span style={{ fontSize: 10, color: "#AEAEB2", marginTop: 2 }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Filtres ── */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map(({ key, label }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{ height: 32, padding: "0 14px", borderRadius: 99, border: active ? "none" : "1px solid rgba(0,0,0,0.10)", backgroundColor: active ? "#2563EB" : "#FFFFFF", color: active ? "#FFFFFF" : "#6E6E73", fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, boxShadow: active ? "0 1px 4px rgba(37,99,235,0.25)" : "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                {label}
                <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 5px", borderRadius: 99, backgroundColor: active ? "rgba(255,255,255,0.25)" : "#F5F5F7", color: active ? "#FFFFFF" : "#AEAEB2" }}>
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Recherche ── */}
        <div style={{ position: "relative" }}>
          <Search size={15} color="#AEAEB2" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une NC (description, n° obs., responsable…)"
            style={{ ...inputSt, paddingLeft: 36, paddingRight: search ? 36 : 12 }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}
            >
              <X size={14} color="#AEAEB2" />
            </button>
          )}
        </div>
        {q && (
          <p style={{ fontSize: 12, color: "#AEAEB2", margin: "-10px 0 0" }}>
            {displayed.length} résultat{displayed.length !== 1 ? "s" : ""} pour « {search.trim()} »
          </p>
        )}

        {/* ── Liste groupée ── */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 80, borderRadius: 14, backgroundColor: "#FFFFFF", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }} />
            ))}
          </div>
        ) : groupes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", backgroundColor: "#FFFFFF", borderRadius: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <CheckCircle2 size={32} color="#34C759" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: "#1D1D1F", margin: "0 0 4px" }}>Aucune non-conformité</p>
            <p style={{ fontSize: 13, color: "#AEAEB2", margin: 0 }}>dans ce filtre</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {groupes.map(([controleNom, groupNcs]) => (
              <GroupeControle
                key={controleNom}
                controleNom={controleNom}
                ncs={groupNcs}
                onSelect={setSelected}
                selectedId={selected?.id ?? null}
              />
            ))}
          </div>
        )}
      </div>

      {selected && <DetailDrawer nc={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} onDeleted={handleDeleted} />}
      {showCreate && <CreateSheet controles={controles} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadAll(); }} />}
    </>
  );
}
