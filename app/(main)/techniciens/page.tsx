"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, UserCheck, UserX, Users, Wrench, Moon } from "lucide-react";
import Header from "@/components/layout/Header";
import {
  getCurrentUserProfile,
  fetchTechniciens,
  toggleTechnicienActif,
  fetchTechKPIs,
  type UserRecord,
  type TechKPIs,
} from "@/lib/supabase";
import { createClient } from "@/lib/supabase";

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ prenom, nom, role, size = 48 }: { prenom: string; nom: string; role: "technicien" | "dt"; size?: number }) {
  const initiales = `${prenom[0] ?? ""}${nom[0] ?? ""}`.toUpperCase();
  const gradient = role === "dt"
    ? "linear-gradient(135deg, #2563EB 0%, #5856D6 100%)"
    : "linear-gradient(135deg, #8E8E93 0%, #6E6E73 100%)";

  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: gradient,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <span style={{ fontSize: size * 0.35, fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.5px" }}>
        {initiales}
      </span>
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div style={{
      flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16,
      border: "1px solid rgba(0,0,0,0.06)", padding: "14px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <p style={{ fontSize: 24, fontWeight: 700, color: "#1D1D1F", margin: 0, lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: 11, color: "#8E8E93", margin: 0, lineHeight: 1.3 }}>{label}</p>
    </div>
  );
}

// ── Carte technicien ──────────────────────────────────────────────────────────

function TechCard({
  user,
  onToggle,
  saving,
}: {
  user: UserRecord;
  onToggle: (id: string, actif: boolean) => void;
  saving: string | null;
}) {
  const roleLabel = user.role === "dt" ? "Directeur Technique" : "Technicien";

  return (
    <div style={{
      backgroundColor: user.actif ? "#FFFFFF" : "#F9F9F9",
      borderRadius: 16,
      border: `1px solid ${user.actif ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.05)"}`,
      padding: "16px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      opacity: user.actif ? 1 : 0.75,
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <Avatar prenom={user.prenom} nom={user.nom} role={user.role} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>
            {user.prenom} {user.nom}
          </p>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 16,
            color: user.actif ? "#34C759" : "#8E8E93",
            backgroundColor: user.actif ? "#F0FDF4" : "#F5F5F7",
          }}>
            {user.actif ? "Actif" : "Inactif"}
          </span>
        </div>
        <p style={{ fontSize: 13, color: "#8E8E93", margin: "0 0 2px" }}>{roleLabel}</p>
        {user.email && (
          <p style={{ fontSize: 12, color: "#AEAEB2", margin: 0 }}>{user.email}</p>
        )}
      </div>

      <button
        onClick={() => onToggle(user.id, !user.actif)}
        disabled={saving === user.id}
        style={{
          flexShrink: 0,
          padding: "8px 14px",
          borderRadius: 10,
          border: `1.5px solid ${user.actif ? "rgba(255,59,48,0.3)" : "rgba(52,199,89,0.3)"}`,
          backgroundColor: user.actif ? "#FFF1F0" : "#F0FDF4",
          color: user.actif ? "#FF3B30" : "#34C759",
          fontSize: 13, fontWeight: 600, cursor: saving === user.id ? "not-allowed" : "pointer",
          opacity: saving === user.id ? 0.6 : 1,
          display: "flex", alignItems: "center", gap: 5,
          whiteSpace: "nowrap",
        }}
      >
        {saving === user.id ? "…" : user.actif ? (
          <><UserX size={14} /> Désactiver</>
        ) : (
          <><UserCheck size={14} /> Réactiver</>
        )}
      </button>
    </div>
  );
}

// ── Formulaire d'ajout ────────────────────────────────────────────────────────

function AddTechSheet({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"technicien" | "dt">("technicien");
  const [password, setPassword] = useState("TechOps2026!");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!prenom.trim() || !nom.trim() || !email.trim()) {
      setError("Prénom, nom et email sont obligatoires.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prenom: prenom.trim(), nom: nom.trim(), email: email.trim(), role, password }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur création");

      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.1)", fontSize: 14, backgroundColor: "#F5F5F7",
    outline: "none", boxSizing: "border-box", color: "#1D1D1F",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
    }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "relative", backgroundColor: "#FFFFFF", borderRadius: "24px 24px 0 0",
        padding: "20px 20px 40px", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.12)",
      }}>
        <div style={{ width: 36, height: 4, backgroundColor: "#C7C7CC", borderRadius: 2, margin: "0 auto 18px" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>
            Ajouter un technicien
          </p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={20} color="#8E8E93" />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8E8E93", letterSpacing: "0.3px", display: "block", marginBottom: 6 }}>PRÉNOM *</label>
              <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Cyrille" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8E8E93", letterSpacing: "0.3px", display: "block", marginBottom: 6 }}>NOM *</label>
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Buresi" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#8E8E93", letterSpacing: "0.3px", display: "block", marginBottom: 6 }}>EMAIL *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="c.buresi@sofitel.com" style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#8E8E93", letterSpacing: "0.3px", display: "block", marginBottom: 8 }}>RÔLE</label>
            <div style={{ display: "flex", gap: 10 }}>
              {(["technicien", "dt"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  style={{
                    flex: 1, padding: "11px", borderRadius: 12, cursor: "pointer",
                    border: `2px solid ${role === r ? (r === "dt" ? "#5856D6" : "#2563EB") : "rgba(0,0,0,0.1)"}`,
                    backgroundColor: role === r ? (r === "dt" ? "#F0EFFF" : "#EFF6FF") : "#FFFFFF",
                    color: role === r ? (r === "dt" ? "#5856D6" : "#2563EB") : "#8E8E93",
                    fontSize: 14, fontWeight: 600,
                  }}
                >
                  {r === "dt" ? "Directeur Technique" : "Technicien"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#8E8E93", letterSpacing: "0.3px", display: "block", marginBottom: 6 }}>MOT DE PASSE TEMPORAIRE</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
          </div>

          {error && <p style={{ fontSize: 13, color: "#FF3B30", margin: 0 }}>{error}</p>}

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
            {saving ? "Création…" : "Créer le compte"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function TechniciensPage() {
  const router = useRouter();
  const [techniciens, setTechniciens] = useState<UserRecord[]>([]);
  const [kpi, setKpi] = useState<TechKPIs>({ actifs: 0, interventionsMois: 0, rondesMois: 0 });
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    const [profile, techs, kpis] = await Promise.all([
      getCurrentUserProfile(),
      fetchTechniciens(),
      fetchTechKPIs(),
    ]);

    // Redirection si pas DT
    if (!profile || profile.role !== "dt") {
      router.replace("/dashboard");
      return;
    }

    setTechniciens(techs);
    setKpi(kpis);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(id: string, newActif: boolean) {
    setSavingId(id);
    try {
      await toggleTechnicienActif(id, newActif);
      setTechniciens((prev) => prev.map((t) => t.id === id ? { ...t, actif: newActif } : t));
    } finally {
      setSavingId(null);
    }
  }

  // Pendant le chargement (évite le flash de contenu pour les techniciens)
  if (loading) {
    return (
      <div>
        <Header title="Techniciens" />
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#AEAEB2" }}>Chargement…</p>
        </div>
      </div>
    );
  }

  const actifs = techniciens.filter((t) => t.actif);
  const inactifs = techniciens.filter((t) => !t.actif);

  return (
    <div>
      <Header title="Techniciens" />

      <div style={{ padding: "24px" }} className="max-md:px-4">
        {/* KPIs */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <KpiCard
            label="Techniciens actifs"
            value={kpi.actifs}
            icon={<Users size={18} color="#2563EB" />}
            color="#2563EB"
          />
          <KpiCard
            label="Interventions ce mois"
            value={kpi.interventionsMois}
            icon={<Wrench size={18} color="#FF9500" />}
            color="#FF9500"
          />
          <KpiCard
            label="Rondes ce mois"
            value={kpi.rondesMois}
            icon={<Moon size={18} color="#5856D6" />}
            color="#5856D6"
          />
        </div>

        {/* Header liste + bouton */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#AEAEB2", letterSpacing: "0.7px", textTransform: "uppercase", margin: 0 }}>
            Équipe ({actifs.length} actif{actifs.length > 1 ? "s" : ""})
          </p>
          <button
            onClick={() => setAddOpen(true)}
            style={{
              padding: "8px 14px", borderRadius: 12, border: "none",
              backgroundColor: "#2563EB", color: "#FFFFFF",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
              boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
            }}
          >
            <Plus size={16} />
            Ajouter
          </button>
        </div>

        {/* Actifs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {actifs.map((t) => (
            <TechCard key={t.id} user={t} onToggle={handleToggle} saving={savingId} />
          ))}
          {actifs.length === 0 && (
            <p style={{ fontSize: 14, color: "#AEAEB2", textAlign: "center", padding: "20px 0" }}>
              Aucun technicien actif
            </p>
          )}
        </div>

        {/* Inactifs */}
        {inactifs.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#AEAEB2", letterSpacing: "0.7px", textTransform: "uppercase", margin: "0 0 12px" }}>
              Inactifs ({inactifs.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {inactifs.map((t) => (
                <TechCard key={t.id} user={t} onToggle={handleToggle} saving={savingId} />
              ))}
            </div>
          </>
        )}
      </div>

      {addOpen && (
        <AddTechSheet
          onClose={() => setAddOpen(false)}
          onAdded={() => {
            fetchTechniciens().then(setTechniciens);
            fetchTechKPIs().then(setKpi);
          }}
        />
      )}
    </div>
  );
}
