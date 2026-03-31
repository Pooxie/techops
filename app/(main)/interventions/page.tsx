"use client";

import { useEffect, useState, useRef } from "react";
import { AlertTriangle, Clock, CheckCircle, Plus, X, RotateCcw, ChevronRight, User } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import Header from "@/components/layout/Header";
import {
  fetchInterventions,
  fetchUsers,
  fetchEquipements,
  createIntervention,
  prendreEnChargeIntervention,
  cloturerIntervention,
  type InterventionRecord,
  type UserRecord,
  type EquipementRecord,
} from "@/lib/supabase";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function sortInterventions(list: InterventionRecord[]) {
  return [...list].sort((a, b) => {
    if (a.priorite === "urgente" && b.priorite !== "urgente") return -1;
    if (b.priorite === "urgente" && a.priorite !== "urgente") return 1;
    return b.created_at.localeCompare(a.created_at);
  });
}

// ── Badges ────────────────────────────────────────────────────────────────────

function PrioriteBadge({ priorite }: { priorite: "normale" | "urgente" }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.5px",
      padding: "2px 8px", borderRadius: 16,
      color: priorite === "urgente" ? "#FF3B30" : "#8E8E93",
      backgroundColor: priorite === "urgente" ? "#FFF1F0" : "#F5F5F7",
      textTransform: "uppercase",
    }}>
      {priorite === "urgente" ? "URGENT" : "NORMALE"}
    </span>
  );
}

function StatutBadge({ statut }: { statut: "a_traiter" | "en_cours" | "cloturee" }) {
  const map = {
    a_traiter: { label: "À traiter", color: "#FF9500", bg: "#FFF5E6" },
    en_cours: { label: "En cours", color: "#2563EB", bg: "#EFF6FF" },
    cloturee: { label: "Clôturée", color: "#34C759", bg: "#F0FDF4" },
  };
  const s = map[statut];
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 16,
      color: s.color, backgroundColor: s.bg,
    }}>
      {s.label}
    </span>
  );
}

// ── Carte intervention ────────────────────────────────────────────────────────

function InterventionCard({
  item,
  onClick,
}: {
  item: InterventionRecord;
  onClick: () => void;
}) {
  const urgent = item.priorite === "urgente";
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: urgent ? "#FFF8F7" : "#FFFFFF",
        borderRadius: 14,
        border: `1px solid ${urgent ? "rgba(255,59,48,0.15)" : "rgba(0,0,0,0.06)"}`,
        padding: "14px 16px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        cursor: "pointer",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Ligne 1: priorité + statut */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
          <PrioriteBadge priorite={item.priorite} />
          <StatutBadge statut={item.statut} />
        </div>
        {/* Titre */}
        <p style={{ fontSize: 15, fontWeight: 600, color: "#1D1D1F", margin: "0 0 4px", lineHeight: 1.3 }}>
          {item.titre}
        </p>
        {/* Zone / équipement */}
        {(item.zone || item.equipement) && (
          <p style={{ fontSize: 12, color: "#8E8E93", margin: "0 0 6px" }}>
            {[item.zone, item.equipement].filter(Boolean).join(" · ")}
          </p>
        )}
        {/* Assigné + date */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {item.assigne_prenom && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <User size={11} color="#AEAEB2" />
              <span style={{ fontSize: 12, color: "#8E8E93" }}>{item.assigne_prenom}</span>
            </div>
          )}
          <span style={{ fontSize: 12, color: "#AEAEB2" }}>{formatDate(item.created_at)}</span>
        </div>
      </div>
      <ChevronRight size={16} color="#C7C7CC" style={{ flexShrink: 0, marginTop: 2 }} />
    </div>
  );
}

// ── Formulaire de création ────────────────────────────────────────────────────

function CreateSheet({
  users,
  equipements,
  onClose,
  onCreated,
}: {
  users: UserRecord[];
  equipements: EquipementRecord[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [zone, setZone] = useState("");
  // equipement_id = "" → not selected, "__autre__" → free text
  const [equipementId, setEquipementId] = useState<string>("");
  const [equipementLibre, setEquipementLibre] = useState("");
  const [categorieFiltre, setCategorieFiltre] = useState<string>("");
  const [priorite, setPriorite] = useState<"normale" | "urgente">("normale");
  const [origine, setOrigine] = useState<"terrain" | "reception" | "preventif" | "dt">("terrain");
  const [assigneId, setAssigneId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unique sorted categories from equipements
  const categories = Array.from(new Set(equipements.map((e) => e.categorie))).sort((a, b) => a.localeCompare(b, "fr"));

  // Filtered + sorted equipements for select
  const equipementsFiltres = equipements
    .filter((e) => !categorieFiltre || e.categorie === categorieFiltre)
    .sort((a, b) => a.categorie.localeCompare(b.categorie, "fr") || a.nom.localeCompare(b.nom, "fr"));

  function handleEquipementChange(val: string) {
    setEquipementId(val);
    if (val && val !== "__autre__") {
      const eq = equipements.find((e) => e.id === val);
      if (eq?.zone) setZone(eq.zone);
    }
  }

  async function handleSubmit() {
    if (!titre.trim()) { setError("Le titre est requis."); return; }
    setSaving(true);
    setError(null);
    const isAutre = equipementId === "__autre__";
    const linkedEq = (!isAutre && equipementId) ? equipements.find((e) => e.id === equipementId) : null;
    const equipementText = isAutre
      ? equipementLibre
      : linkedEq?.nom ?? "";
    try {
      await createIntervention({
        titre: titre.trim(),
        description,
        zone,
        equipement: equipementText,
        priorite,
        origine,
        assigne_id: assigneId || null,
      });
      onCreated();
      onClose();
    } catch (e) {
      console.error("createIntervention error:", JSON.stringify(e, null, 2), e);
      setError((e as { message?: string })?.message ?? "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.10)", fontSize: 14, backgroundColor: "#F5F5F7",
    outline: "none", boxSizing: "border-box", color: "#1D1D1F",
    fontFamily: "var(--font-inter, system-ui, sans-serif)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "#8E8E93",
    letterSpacing: "0.3px", display: "block", marginBottom: 6,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
      />
      {/* Sheet */}
      <div style={{
        position: "relative", backgroundColor: "#FFFFFF", borderRadius: "24px 24px 0 0",
        padding: "20px 20px 40px", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.14)",
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, backgroundColor: "#C7C7CC", borderRadius: 2, margin: "0 auto 18px" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>
            Nouvelle intervention
          </p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={20} color="#8E8E93" />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Titre */}
          <div>
            <label style={labelStyle}>TITRE *</label>
            <input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex: Fuite canalisation piscine"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>DESCRIPTION</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Décris le problème..."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Équipement — filtre catégorie + select */}
          <div>
            <label style={labelStyle}>ÉQUIPEMENT</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Filtre par catégorie */}
              <select
                value={categorieFiltre}
                onChange={(e) => { setCategorieFiltre(e.target.value); setEquipementId(""); }}
                style={{ ...inputStyle, fontSize: 13, color: categorieFiltre ? "#1D1D1F" : "#AEAEB2" }}
              >
                <option value="">Toutes les catégories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Sélecteur équipement */}
              <select
                value={equipementId}
                onChange={(e) => handleEquipementChange(e.target.value)}
                style={{ ...inputStyle, color: equipementId ? "#1D1D1F" : "#AEAEB2" }}
              >
                <option value="">— Sélectionner un équipement —</option>
                {equipementsFiltres.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.nom}{eq.zone ? ` (${eq.zone})` : ""}
                  </option>
                ))}
                <option value="__autre__">Autre / Non listé</option>
              </select>

              {/* Champ libre si "Autre" */}
              {equipementId === "__autre__" && (
                <input
                  value={equipementLibre}
                  onChange={(e) => setEquipementLibre(e.target.value)}
                  placeholder="Nom de l'équipement"
                  style={inputStyle}
                />
              )}
            </div>
          </div>

          {/* Zone */}
          <div>
            <label style={labelStyle}>ZONE</label>
            <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ex: Spa" style={inputStyle} />
          </div>

          {/* Priorité */}
          <div>
            <label style={labelStyle}>PRIORITÉ</label>
            <div style={{ display: "flex", gap: 10 }}>
              {(["normale", "urgente"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriorite(p)}
                  style={{
                    flex: 1, padding: "11px", borderRadius: 12, cursor: "pointer",
                    border: `2px solid ${priorite === p ? (p === "urgente" ? "#FF3B30" : "#2563EB") : "rgba(0,0,0,0.1)"}`,
                    backgroundColor: priorite === p ? (p === "urgente" ? "#FFF1F0" : "#E8F4FF") : "#FFFFFF",
                    color: priorite === p ? (p === "urgente" ? "#FF3B30" : "#2563EB") : "#8E8E93",
                    fontSize: 14, fontWeight: 600, textTransform: "capitalize",
                  }}
                >
                  {p === "urgente" ? "🔴 Urgente" : "⚪ Normale"}
                </button>
              ))}
            </div>
          </div>

          {/* Origine */}
          <div>
            <label style={labelStyle}>ORIGINE</label>
            <select
              value={origine}
              onChange={(e) => setOrigine(e.target.value as typeof origine)}
              style={{ ...inputStyle, appearance: "none" }}
            >
              <option value="terrain">Terrain</option>
              <option value="reception">Réception</option>
              <option value="preventif">Préventif</option>
              <option value="dt">Direction Technique</option>
            </select>
          </div>

          {/* Assigné à */}
          <div>
            <label style={labelStyle}>ASSIGNÉ À</label>
            <select
              value={assigneId}
              onChange={(e) => setAssigneId(e.target.value)}
              style={{ ...inputStyle, appearance: "none" }}
            >
              <option value="">Non assigné</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>
              ))}
            </select>
          </div>

          {error && (
            <p style={{ fontSize: 13, color: "#FF3B30", margin: 0 }}>{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              width: "100%", padding: "15px", borderRadius: 14, border: "none",
              backgroundColor: "#2563EB", color: "#FFFFFF", fontSize: 16, fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
              marginTop: 4, boxShadow: "0 2px 10px rgba(37,99,235,0.3)",
            }}
          >
            {saving ? "Création…" : "Créer l'intervention"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Formulaire de clôture ─────────────────────────────────────────────────────

function ClotureForme({
  interventionId,
  onCloturee,
  onCancel,
}: {
  interventionId: string;
  onCloturee: () => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sigRef = useRef<SignatureCanvas | null>(null);
  const sigContainerRef = useRef<HTMLDivElement>(null);
  const [sigWidth, setSigWidth] = useState(300);

  useEffect(() => {
    if (sigContainerRef.current) {
      setSigWidth(sigContainerRef.current.offsetWidth);
    }
  }, []);

  async function handleValider() {
    if (!description.trim()) { setError("La description est requise."); return; }
    setSaving(true);
    setError(null);
    try {
      const signature = sigRef.current?.isEmpty() ? "" : (sigRef.current?.toDataURL() ?? "");
      await cloturerIntervention(interventionId, {
        description_cloture: description.trim(),
        signature_cloture: signature,
      });
      onCloturee();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la clôture.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>
          Clôturer l'intervention
        </p>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <X size={18} color="#8E8E93" />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Description clôture */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#8E8E93", letterSpacing: "0.3px", display: "block", marginBottom: 6 }}>
            CE QUI A ÉTÉ FAIT *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Décris les actions réalisées…"
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.10)", fontSize: 14, backgroundColor: "#F5F5F7",
              outline: "none", boxSizing: "border-box", color: "#1D1D1F", resize: "vertical",
              fontFamily: "var(--font-inter, system-ui, sans-serif)",
            }}
          />
        </div>

        {/* Signature */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#8E8E93", letterSpacing: "0.3px", display: "block", marginBottom: 6 }}>
            SIGNATURE
          </label>
          <div
            ref={sigContainerRef}
            style={{
              borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)",
              overflow: "hidden", backgroundColor: "#FFFFFF",
            }}
          >
            <SignatureCanvas
              ref={sigRef}
              penColor="#1D1D1F"
              canvasProps={{ width: sigWidth, height: 120, style: { display: "block" } }}
            />
          </div>
          <button
            type="button"
            onClick={() => sigRef.current?.clear()}
            style={{
              display: "flex", alignItems: "center", gap: 5, marginTop: 6,
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: "#8E8E93", padding: 0,
            }}
          >
            <RotateCcw size={12} />
            Effacer
          </button>
        </div>

        {error && <p style={{ fontSize: 13, color: "#FF3B30", margin: 0 }}>{error}</p>}

        <button
          onClick={handleValider}
          disabled={saving}
          style={{
            width: "100%", padding: "14px", borderRadius: 14, border: "none",
            backgroundColor: "#34C759", color: "#FFFFFF", fontSize: 15, fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
            boxShadow: "0 2px 8px rgba(52,199,89,0.3)",
          }}
        >
          {saving ? "Clôture en cours…" : "Valider la clôture"}
        </button>
      </div>
    </div>
  );
}

// ── Drawer détail ─────────────────────────────────────────────────────────────

function DetailDrawer({
  item,
  onClose,
  onUpdated,
}: {
  item: InterventionRecord;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [showCloture, setShowCloture] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);

  async function handlePrendreEnCharge() {
    setActionSaving(true);
    try {
      await prendreEnChargeIntervention(item.id);
      onUpdated();
      onClose();
    } finally {
      setActionSaving(false);
    }
  }

  function handleCloturee() {
    onUpdated();
    onClose();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
      />
      {/* Drawer */}
      <div style={{
        position: "relative", backgroundColor: "#FFFFFF", borderRadius: "24px 24px 0 0",
        padding: "20px 20px 40px", maxHeight: "85vh", overflowY: "auto",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.14)",
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, backgroundColor: "#C7C7CC", borderRadius: 2, margin: "0 auto 18px" }} />

        {showCloture ? (
          <ClotureForme
            interventionId={item.id}
            onCloturee={handleCloturee}
            onCancel={() => setShowCloture(false)}
          />
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ flex: 1, paddingRight: 12 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                  <PrioriteBadge priorite={item.priorite} />
                  <StatutBadge statut={item.statut} />
                </div>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: "0 0 4px", lineHeight: 1.3 }}>
                  {item.titre}
                </p>
                <p style={{ fontSize: 13, color: "#8E8E93", margin: 0 }}>
                  {formatDate(item.created_at)}
                  {item.createur_prenom ? ` · Par ${item.createur_prenom}` : ""}
                </p>
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}>
                <X size={20} color="#8E8E93" />
              </button>
            </div>

            {/* Infos */}
            <div style={{ backgroundColor: "#FFFFFF", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", padding: "4px 16px 8px", marginBottom: 12 }}>
              {item.zone && (
                <InfoRow label="Zone" value={item.zone} />
              )}
              {item.equipement && (
                <InfoRow label="Équipement" value={item.equipement} />
              )}
              {item.origine && (
                <InfoRow label="Origine" value={item.origine} />
              )}
              {item.assigne_prenom && (
                <InfoRow label="Assigné à" value={item.assigne_prenom} />
              )}
            </div>

            {item.description && (
              <div style={{ backgroundColor: "#FFFFFF", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", padding: "14px 16px", marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#AEAEB2", letterSpacing: "0.5px", textTransform: "uppercase", margin: "0 0 6px" }}>
                  Description
                </p>
                <p style={{ fontSize: 14, color: "#1D1D1F", margin: 0, lineHeight: 1.5 }}>
                  {item.description}
                </p>
              </div>
            )}

            {item.statut === "cloturee" && item.description_cloture && (
              <div style={{ backgroundColor: "#F0FDF4", borderRadius: 14, border: "1px solid rgba(52,199,89,0.2)", padding: "14px 16px", marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#34C759", letterSpacing: "0.5px", textTransform: "uppercase", margin: "0 0 6px" }}>
                  Clôture — ce qui a été fait
                </p>
                <p style={{ fontSize: 14, color: "#1D1D1F", margin: 0, lineHeight: 1.5 }}>
                  {item.description_cloture}
                </p>
                {item.cloturee_le && (
                  <p style={{ fontSize: 12, color: "#8E8E93", margin: "6px 0 0" }}>
                    Le {formatDate(item.cloturee_le)}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              {item.statut === "a_traiter" && (
                <button
                  onClick={handlePrendreEnCharge}
                  disabled={actionSaving}
                  style={{
                    width: "100%", padding: "14px", borderRadius: 14, border: "none",
                    backgroundColor: "#2563EB", color: "#FFFFFF", fontSize: 15, fontWeight: 700,
                    cursor: actionSaving ? "not-allowed" : "pointer", opacity: actionSaving ? 0.7 : 1,
                    boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                  }}
                >
                  Prendre en charge
                </button>
              )}
              {item.statut !== "cloturee" && (
                <button
                  onClick={() => setShowCloture(true)}
                  style={{
                    width: "100%", padding: "14px", borderRadius: 14,
                    border: "2px solid #34C759",
                    backgroundColor: "#FFFFFF", color: "#34C759", fontSize: 15, fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Clôturer l'intervention
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
      <span style={{ fontSize: 13, color: "#8E8E93" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: "#1D1D1F", textAlign: "right", maxWidth: "60%", textTransform: "capitalize" }}>
        {value}
      </span>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

type Filter = "toutes" | "urgentes" | "en_cours" | "cloturees";

export default function InterventionsPage() {
  const [interventions, setInterventions] = useState<InterventionRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [equipements, setEquipements] = useState<EquipementRecord[]>([]);
  const [filter, setFilter] = useState<Filter>("toutes");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InterventionRecord | null>(null);

  async function load() {
    const [items, userList, eqList] = await Promise.all([fetchInterventions(), fetchUsers(), fetchEquipements()]);
    setInterventions(items);
    setUsers(userList);
    setEquipements(eqList);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function refresh() {
    fetchInterventions().then(setInterventions);
  }

  const counts = {
    toutes: interventions.length,
    urgentes: interventions.filter((i) => i.priorite === "urgente" && i.statut !== "cloturee").length,
    en_cours: interventions.filter((i) => i.statut === "en_cours").length,
    cloturees: interventions.filter((i) => i.statut === "cloturee").length,
  };

  const filtered = sortInterventions(
    filter === "toutes" ? interventions
    : filter === "urgentes" ? interventions.filter((i) => i.priorite === "urgente" && i.statut !== "cloturee")
    : filter === "en_cours" ? interventions.filter((i) => i.statut === "en_cours")
    : interventions.filter((i) => i.statut === "cloturee")
  );

  const filterLabels: { key: Filter; label: string }[] = [
    { key: "toutes", label: "Toutes" },
    { key: "urgentes", label: "Urgentes" },
    { key: "en_cours", label: "En cours" },
    { key: "cloturees", label: "Clôturées" },
  ];

  return (
    <div>
      <Header title="Interventions" />

      <div style={{ padding: "24px" }} className="max-md:px-4">
        {/* Bouton nouvelle + filtres */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, flex: 1 }}>
            {filterLabels.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  flexShrink: 0, padding: "6px 14px", borderRadius: 16, cursor: "pointer",
                  border: `1.5px solid ${filter === key ? "#2563EB" : "rgba(0,0,0,0.1)"}`,
                  backgroundColor: filter === key ? "#2563EB" : "#FFFFFF",
                  color: filter === key ? "#FFFFFF" : "#1D1D1F",
                  fontSize: 13, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                {label}
                {counts[key] > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    backgroundColor: filter === key ? "rgba(255,255,255,0.3)" : "#F5F5F7",
                    color: filter === key ? "#FFFFFF" : "#8E8E93",
                    padding: "1px 6px", borderRadius: 16,
                  }}>
                    {counts[key]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            style={{
              flexShrink: 0, marginLeft: 12, padding: "8px 14px", borderRadius: 12,
              border: "none", backgroundColor: "#2563EB", color: "#FFFFFF",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
              boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
            }}
          >
            <Plus size={16} />
            Nouveau
          </button>
        </div>

        {/* Liste */}
        {loading ? (
          <p style={{ fontSize: 14, color: "#AEAEB2", textAlign: "center", marginTop: 40 }}>Chargement…</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 60 }}>
            <CheckCircle size={40} color="#C7C7CC" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 15, color: "#AEAEB2", fontWeight: 500 }}>
              {filter === "toutes" ? "Aucune intervention" : "Aucun résultat pour ce filtre"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((item) => (
              <InterventionCard
                key={item.id}
                item={item}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sheet création */}
      {createOpen && (
        <CreateSheet
          users={users}
          equipements={equipements}
          onClose={() => setCreateOpen(false)}
          onCreated={refresh}
        />
      )}

      {/* Drawer détail */}
      {selectedItem && (
        <DetailDrawer
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdated={() => {
            refresh();
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
}
