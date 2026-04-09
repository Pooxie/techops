"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, Clock, CheckCircle, AlertTriangle, ChevronRight } from "lucide-react";
import {
  fetchInterventionsByChambre,
  fetchUsers,
  createIntervention,
  type InterventionRecord,
  type UserRecord,
} from "@/lib/supabase";

// ── Helpers ───────────────────────────────────────────────────────────────────

type Aile = "Ajaccio" | "Piscine" | "Thalasso";

function getAile(numero: string): Aile {
  const n = Number(numero);
  const cent = n % 100;
  if (cent >= 1 && cent <= 55) {
    if (cent <= 19) return "Ajaccio";
    if (cent <= 38) return "Piscine";
    return "Thalasso";
  }
  return "Ajaccio";
}

function getEtage(numero: string): number {
  return Math.floor(Number(numero) / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Badges ────────────────────────────────────────────────────────────────────

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

function PrioriteBadge({ priorite }: { priorite: "normale" | "urgente" }) {
  if (priorite === "normale") return null;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.5px",
      padding: "2px 8px", borderRadius: 16,
      color: "#FF3B30", backgroundColor: "#FFF1F0",
      textTransform: "uppercase",
    }}>
      URGENT
    </span>
  );
}

// ── Formulaire de création ────────────────────────────────────────────────────

function CreateSheet({
  numeroChambre,
  users,
  onClose,
  onCreated,
}: {
  numeroChambre: string;
  users: UserRecord[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [priorite, setPriorite] = useState<"normale" | "urgente">("normale");
  const [assigneId, setAssigneId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSubmit() {
    if (!titre.trim()) { setError("Le titre est requis."); return; }
    setSaving(true);
    setError(null);
    try {
      await createIntervention({
        titre: titre.trim(),
        description,
        zone: "",
        equipement: "",
        priorite,
        origine: "terrain",
        assigne_id: assigneId || null,
        numero_chambre: numeroChambre,
      });
      onCreated();
      onClose();
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }} />
      <div style={{
        position: "relative", backgroundColor: "#FFFFFF", borderRadius: "24px 24px 0 0",
        padding: "20px 20px 40px", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.14)",
      }}>
        <div style={{ width: 36, height: 4, backgroundColor: "#C7C7CC", borderRadius: 2, margin: "0 auto 18px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>Nouvelle intervention</p>
            <p style={{ fontSize: 12, color: "#8E8E93", margin: "2px 0 0" }}>Chambre {numeroChambre}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={20} color="#8E8E93" />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>TITRE *</label>
            <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex: Fuite robinet" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>DESCRIPTION</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Décris le problème…" style={{ ...inputStyle, resize: "vertical" }} />
          </div>
          <div>
            <label style={labelStyle}>PRIORITÉ</label>
            <div style={{ display: "flex", gap: 10 }}>
              {(["normale", "urgente"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPriorite(p)} style={{
                  flex: 1, padding: "11px", borderRadius: 12, cursor: "pointer",
                  border: `2px solid ${priorite === p ? (p === "urgente" ? "#FF3B30" : "#2563EB") : "rgba(0,0,0,0.1)"}`,
                  backgroundColor: priorite === p ? (p === "urgente" ? "#FFF1F0" : "#E8F4FF") : "#FFFFFF",
                  color: priorite === p ? (p === "urgente" ? "#FF3B30" : "#2563EB") : "#8E8E93",
                  fontSize: 14, fontWeight: 600,
                }}>
                  {p === "urgente" ? "🔴 Urgente" : "⚪ Normale"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>ASSIGNÉ À</label>
            <select value={assigneId} onChange={(e) => setAssigneId(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
              <option value="">Non assigné</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
            </select>
          </div>

          {error && <p style={{ fontSize: 13, color: "#FF3B30", margin: 0 }}>{error}</p>}

          <button onClick={handleSubmit} disabled={saving} style={{
            width: "100%", padding: "15px", borderRadius: 14, border: "none",
            backgroundColor: "#2563EB", color: "#FFFFFF", fontSize: 16, fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
            marginTop: 4, boxShadow: "0 2px 10px rgba(37,99,235,0.3)",
          }}>
            {saving ? "Création…" : "Créer l'intervention"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page détail ───────────────────────────────────────────────────────────────

export default function ChambreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const numero = String(params.numero ?? "");

  const aile = getAile(numero);
  const etage = getEtage(numero);

  const [interventions, setInterventions] = useState<InterventionRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const countMois = interventions.filter((i) => i.created_at >= startOfMonth).length;

  async function load() {
    const [ivs, us] = await Promise.all([
      fetchInterventionsByChambre(numero),
      fetchUsers(),
    ]);
    setInterventions(ivs);
    setUsers(us);
    setLoading(false);
  }

  useEffect(() => { load(); }, [numero]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F5F7" }}>
      {/* En-tête */}
      <div style={{
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        padding: "0 24px",
        height: 56,
        display: "flex",
        alignItems: "center",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 4 }}
        >
          <ArrowLeft size={20} color="#6E6E73" />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1D1D1F", lineHeight: 1 }}>
            Chambre {numero}
          </p>
          <p style={{ margin: "1px 0 0", fontSize: 12, color: "#8E8E93" }}>
            Aile {aile} · Étage {etage}
          </p>
        </div>
        <span style={{
          fontSize: 12, fontWeight: 700,
          color: "#2563EB", backgroundColor: "#EFF6FF",
          padding: "4px 12px", borderRadius: 20,
        }}>
          {interventions.length} intervention{interventions.length !== 1 ? "s" : ""}
        </span>
      </div>

      <main style={{ padding: "24px" }} className="max-md:px-4">
        {/* Bouton + Nouvelle intervention */}
        <div style={{ marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 12,
              border: "none",
              backgroundColor: "#2563EB",
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
            }}
          >
            <Plus size={16} />
            Nouvelle intervention
          </button>
        </div>

        {/* Statistiques rapides */}
        {!loading && interventions.length > 0 && (
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{
              backgroundColor: "#FFFFFF", borderRadius: 16, padding: "14px 18px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)",
              flex: "1 1 120px",
            }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total</p>
              <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: "#1D1D1F" }}>{interventions.length}</p>
            </div>
            <div style={{
              backgroundColor: "#FFFFFF", borderRadius: 16, padding: "14px 18px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)",
              flex: "1 1 120px",
            }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ce mois</p>
              <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: countMois > 0 ? "#2563EB" : "#1D1D1F" }}>{countMois}</p>
            </div>
            <div style={{
              backgroundColor: "#FFFFFF", borderRadius: 16, padding: "14px 18px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.05)",
              flex: "1 1 120px",
            }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px" }}>En cours</p>
              <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: "#FF9500" }}>
                {interventions.filter((i) => i.statut === "en_cours").length}
              </p>
            </div>
          </div>
        )}

        {/* Liste interventions */}
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}>
          {loading ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "#AEAEB2", fontSize: 14 }}>
              Chargement…
            </div>
          ) : interventions.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "#AEAEB2", margin: 0 }}>
                Aucune intervention pour cette chambre
              </p>
            </div>
          ) : (
            interventions.map((iv, idx) => (
              <div
                key={iv.id}
                style={{
                  padding: "16px 20px",
                  borderBottom: idx < interventions.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  cursor: "pointer",
                }}
                onClick={() => router.push("/interventions")}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#F9F9FB"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F" }}>{iv.titre}</span>
                    <PrioriteBadge priorite={iv.priorite} />
                  </div>
                  {iv.description && (
                    <p style={{ margin: "0 0 6px", fontSize: 13, color: "#6E6E73", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {iv.description}
                    </p>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <StatutBadge statut={iv.statut} />
                    <span style={{ fontSize: 12, color: "#AEAEB2" }}>{formatDate(iv.created_at)}</span>
                    {iv.assigne_prenom && (
                      <span style={{ fontSize: 12, color: "#8E8E93" }}>· {iv.assigne_prenom}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: "#2563EB", fontWeight: 600 }}>Voir</span>
                  <ChevronRight size={14} color="#2563EB" />
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {showCreate && (
        <CreateSheet
          numeroChambre={numero}
          users={users}
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}
