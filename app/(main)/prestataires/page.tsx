"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  X, ExternalLink, AlertTriangle, Clock, CheckCircle,
  Building2, Plus, Pencil, Trash2, PhoneCall, Mail, ChevronDown,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";
import {
  fetchPrestatairesTable,
  createPrestataire,
  updatePrestataire,
  deletePrestataire,
  countSetControlesForPrestataire,
  type Prestataire,
  type SetControle,
  type CreatePrestatairePayload,
} from "@/lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

const PREDEFINED_DOMAINS = [
  "Électricité", "Ascenseurs", "Gaz", "Incendie", "SSI",
  "Portes automatiques", "Chaufferie", "Froid", "Cuisine",
  "Hottes cuisine", "Formation sécurité", "Plomberie", "Piscine", "Toiture",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function avatarColor(name: string): { bg: string; color: string } {
  const colors = [
    { bg: "#EFF6FF", color: "#2563EB" },
    { bg: "#F0FDF4", color: "#34C759" },
    { bg: "#FFF5E6", color: "#FF9500" },
    { bg: "#F3EEFF", color: "#AF52DE" },
    { bg: "#FFF1F0", color: "#FF3B30" },
    { bg: "#E6F9FF", color: "#32ADE6" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

type VisiteStatut = "ok" | "alerte" | "retard";

function prochaineVisiteStatut(date: string | null): VisiteStatut {
  if (!date) return "ok";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const in30 = new Date(today); in30.setDate(today.getDate() + 30);
  const d = new Date(date);
  if (d < today) return "retard";
  if (d < in30) return "alerte";
  return "ok";
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function isThisWeek(iso: string | null): boolean {
  if (!iso) return false;
  const days = daysUntil(iso);
  return days !== null && days >= 0 && days <= 7;
}

const STATUT_VISITE: Record<VisiteStatut, { label: string; color: string; bg: string }> = {
  ok:     { label: "À jour",    color: "#34C759", bg: "#F0FDF4" },
  alerte: { label: "Bientôt",   color: "#FF9500", bg: "#FFF5E6" },
  retard: { label: "En retard", color: "#FF3B30", bg: "#FFF1F0" },
};

const STATUT_CONTROLE_CFG: Record<SetControle["statut"], { icon: React.ReactNode; color: string }> = {
  ok:     { icon: <CheckCircle size={13} />, color: "#34C759" },
  alerte: { icon: <Clock size={13} />,       color: "#FF9500" },
  retard: { icon: <AlertTriangle size={13} />, color: "#FF3B30" },
};

// ─── Domain Selector ──────────────────────────────────────────────────────────

function DomainSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (domains: string[]) => void;
}) {
  const [custom, setCustom] = useState("");

  function toggle(d: string) {
    onChange(selected.includes(d) ? selected.filter((x) => x !== d) : [...selected, d]);
  }

  function addCustom() {
    const trimmed = custom.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
    }
    setCustom("");
  }

  const customDomains = selected.filter((d) => !PREDEFINED_DOMAINS.includes(d));

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {PREDEFINED_DOMAINS.map((d) => {
          const active = selected.includes(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggle(d)}
              style={{
                fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 8,
                border: active ? "1.5px solid #2563EB" : "1.5px solid #E5E5EA",
                backgroundColor: active ? "#EFF6FF" : "#FFFFFF",
                color: active ? "#2563EB" : "#6E6E73",
                cursor: "pointer", transition: "all 0.12s",
              }}
            >
              {d}
            </button>
          );
        })}
        {customDomains.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            style={{
              fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 8,
              border: "1.5px solid #2563EB", backgroundColor: "#EFF6FF",
              color: "#2563EB", cursor: "pointer",
            }}
          >
            {d} ×
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          placeholder="Ajouter un domaine personnalisé…"
          style={{
            flex: 1, height: 34, borderRadius: 8, border: "1.5px solid #E5E5EA",
            padding: "0 10px", fontSize: 13, color: "#1D1D1F", outline: "none",
          }}
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          style={{
            height: 34, padding: "0 12px", borderRadius: 8, border: "none",
            backgroundColor: custom.trim() ? "#2563EB" : "#E5E5EA",
            color: custom.trim() ? "#FFFFFF" : "#AEAEB2",
            fontSize: 13, fontWeight: 600, cursor: custom.trim() ? "pointer" : "default",
          }}
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

type FormData = {
  nom: string;
  contact_nom: string;
  contact_tel: string;
  contact_email: string;
  domaines: string[];
  notes: string;
  actif: boolean;
};

const EMPTY_FORM: FormData = {
  nom: "", contact_nom: "", contact_tel: "",
  contact_email: "", domaines: [], notes: "", actif: true,
};

function PrestataireModal({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  initial?: Prestataire;
  onClose: () => void;
  onSaved: (p: Prestataire) => void;
}) {
  const [form, setForm] = useState<FormData>(() =>
    initial
      ? {
          nom: initial.nom,
          contact_nom: initial.contact_nom ?? "",
          contact_tel: initial.contact_tel ?? "",
          contact_email: initial.contact_email ?? "",
          domaines: initial.domaines,
          notes: initial.notes ?? "",
          actif: initial.actif,
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) { setError("Le nom est obligatoire."); return; }
    setSaving(true);
    setError(null);

    const payload: CreatePrestatairePayload = {
      nom: form.nom.trim(),
      contact_nom: form.contact_nom.trim() || null,
      contact_tel: form.contact_tel.trim() || null,
      contact_email: form.contact_email.trim() || null,
      domaines: form.domaines,
      notes: form.notes.trim() || null,
      actif: form.actif,
    };

    try {
      if (mode === "create") {
        const created = await createPrestataire(payload);
        onSaved(created);
      } else if (initial) {
        await updatePrestataire(initial.id, payload);
        onSaved({ ...initial, ...payload, domaines: form.domaines });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 38, borderRadius: 8, border: "1.5px solid #E5E5EA",
    padding: "0 10px", fontSize: 13, color: "#1D1D1F", outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "#6E6E73",
    textTransform: "uppercase", letterSpacing: "0.4px",
    display: "block", marginBottom: 5,
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.3)" }} />
      <div
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(520px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 64px)",
          zIndex: 50, backgroundColor: "#FFFFFF",
          borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>
            {mode === "create" ? "Ajouter un prestataire" : "Modifier le prestataire"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={20} color="#8E8E93" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: "auto", flex: 1 }}>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Nom */}
            <div>
              <label style={labelStyle}>Nom <span style={{ color: "#FF3B30" }}>*</span></label>
              <input
                value={form.nom}
                onChange={(e) => set("nom", e.target.value)}
                placeholder="Ex : APAVE Ajaccio"
                style={inputStyle}
                autoFocus
              />
            </div>

            {/* Contact */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Nom du contact</label>
                <input
                  value={form.contact_nom}
                  onChange={(e) => set("contact_nom", e.target.value)}
                  placeholder="Jean Dupont"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Téléphone</label>
                <input
                  value={form.contact_tel}
                  onChange={(e) => set("contact_tel", e.target.value)}
                  placeholder="04 95 XX XX XX"
                  style={inputStyle}
                  type="tel"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email</label>
              <input
                value={form.contact_email}
                onChange={(e) => set("contact_email", e.target.value)}
                placeholder="contact@prestataire.fr"
                style={inputStyle}
                type="email"
              />
            </div>

            {/* Domaines */}
            <div>
              <label style={labelStyle}>Domaines d&apos;intervention</label>
              <DomainSelector selected={form.domaines} onChange={(d) => set("domaines", d)} />
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Informations complémentaires…"
                rows={3}
                style={{ ...inputStyle, height: "auto", padding: "8px 10px", resize: "vertical", fontFamily: "inherit" }}
              />
            </div>

            {/* Statut */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", backgroundColor: "#F5F5F7", borderRadius: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#1D1D1F" }}>Prestataire actif</span>
              <button
                type="button"
                onClick={() => set("actif", !form.actif)}
                style={{
                  width: 44, height: 26, borderRadius: 13, border: "none",
                  backgroundColor: form.actif ? "#34C759" : "#D1D1D6",
                  cursor: "pointer", position: "relative", transition: "background 0.2s",
                }}
              >
                <span
                  style={{
                    position: "absolute", top: 3, width: 20, height: 20, borderRadius: "50%",
                    backgroundColor: "#FFFFFF", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                    transition: "left 0.2s", left: form.actif ? 21 : 3,
                  }}
                />
              </button>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: "#FF3B30", margin: 0, padding: "8px 12px", backgroundColor: "#FFF1F0", borderRadius: 8 }}>
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "16px 24px 24px", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, height: 40, borderRadius: 10, border: "1.5px solid #E5E5EA", backgroundColor: "#FFFFFF", color: "#1D1D1F", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !form.nom.trim()}
              style={{
                flex: 2, height: 40, borderRadius: 10, border: "none",
                backgroundColor: saving || !form.nom.trim() ? "#D1D1D6" : "#2563EB",
                color: "#FFFFFF", fontSize: 14, fontWeight: 600,
                cursor: saving || !form.nom.trim() ? "default" : "pointer",
              }}
            >
              {saving ? "Enregistrement…" : mode === "create" ? "Ajouter" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Confirm Delete Dialog ─────────────────────────────────────────────────────

function ConfirmDeleteDialog({
  prestataire,
  linkedCount,
  onCancel,
  onConfirmDelete,
  onConfirmDeactivate,
  deleting,
}: {
  prestataire: Prestataire;
  linkedCount: number;
  onCancel: () => void;
  onConfirmDelete: () => void;
  onConfirmDeactivate: () => void;
  deleting: boolean;
}) {
  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.4)" }} />
      <div
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(400px, calc(100vw - 32px))",
          zIndex: 70, backgroundColor: "#FFFFFF",
          borderRadius: 16, boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
          padding: "24px",
        }}
      >
        <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "#FFF1F0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Trash2 size={22} color="#FF3B30" />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1D1D1F", margin: "0 0 8px" }}>
          Supprimer « {prestataire.nom} » ?
        </h3>
        {linkedCount > 0 ? (
          <p style={{ fontSize: 14, color: "#6E6E73", margin: "0 0 20px", lineHeight: 1.5 }}>
            Ce prestataire est lié à <strong>{linkedCount} contrôle{linkedCount > 1 ? "s" : ""} SET</strong>.
            Il est conseillé de le <strong>désactiver</strong> plutôt que de le supprimer pour conserver l&apos;historique.
          </p>
        ) : (
          <p style={{ fontSize: 14, color: "#6E6E73", margin: "0 0 20px", lineHeight: 1.5 }}>
            Cette action est irréversible. Le prestataire sera définitivement supprimé.
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {linkedCount > 0 && (
            <button
              onClick={onConfirmDeactivate}
              disabled={deleting}
              style={{ width: "100%", height: 40, borderRadius: 10, border: "none", backgroundColor: "#FF9500", color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Désactiver à la place
            </button>
          )}
          <button
            onClick={onConfirmDelete}
            disabled={deleting}
            style={{ width: "100%", height: 40, borderRadius: 10, border: "none", backgroundColor: "#FF3B30", color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: deleting ? "default" : "pointer" }}
          >
            {deleting ? "Suppression…" : "Supprimer définitivement"}
          </button>
          <button
            onClick={onCancel}
            style={{ width: "100%", height: 40, borderRadius: 10, border: "1.5px solid #E5E5EA", backgroundColor: "#FFFFFF", color: "#1D1D1F", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Annuler
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Detail Drawer ─────────────────────────────────────────────────────────────

function DetailDrawer({
  prestataire,
  onClose,
  onEdit,
  onDelete,
}: {
  prestataire: Prestataire;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const av = avatarColor(prestataire.nom);

  const controlesTries = [...prestataire.controles].sort((a, b) => {
    const order = { retard: 0, alerte: 1, ok: 2 };
    return order[a.statut] - order[b.statut];
  });

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.25)" }} />
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: 480, zIndex: 50, backgroundColor: "#F5F5F7",
          boxShadow: "-24px 0 64px rgba(0,0,0,0.12)",
          overflowY: "auto", display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", backgroundColor: "#FFFFFF", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: av.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: av.color }}>{initials(prestataire.nom)}</span>
            {!prestataire.actif && (
              <span style={{ position: "absolute", bottom: -4, right: -4, fontSize: 10, fontWeight: 700, color: "#FFFFFF", backgroundColor: "#8E8E93", padding: "1px 5px", borderRadius: 6, whiteSpace: "nowrap" }}>
                Inactif
              </span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#1D1D1F", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {prestataire.nom}
            </p>
            <p style={{ fontSize: 13, color: "#AEAEB2", margin: "2px 0 0" }}>
              {prestataire.nb_controles} contrôle{prestataire.nb_controles !== 1 ? "s" : ""} SET associé{prestataire.nb_controles !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={20} color="#8E8E93" />
          </button>
        </div>

        {/* Actions */}
        <div style={{ padding: "12px 24px", backgroundColor: "#FFFFFF", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", gap: 8 }}>
          <button
            onClick={onEdit}
            style={{ display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px", borderRadius: 9, border: "1.5px solid #E5E5EA", backgroundColor: "#FFFFFF", color: "#1D1D1F", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <Pencil size={13} />
            Modifier
          </button>
          <button
            onClick={onDelete}
            style={{ display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px", borderRadius: 9, border: "1.5px solid #FFD0CE", backgroundColor: "#FFF1F0", color: "#FF3B30", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <Trash2 size={13} />
            Supprimer
          </button>
        </div>

        {/* Contact */}
        {(prestataire.contact_nom || prestataire.contact_tel || prestataire.contact_email) && (
          <div style={{ padding: "16px 24px", backgroundColor: "#FFFFFF", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 10px" }}>Contact</p>
            {prestataire.contact_nom && (
              <p style={{ fontSize: 14, fontWeight: 500, color: "#1D1D1F", margin: "0 0 8px" }}>{prestataire.contact_nom}</p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {prestataire.contact_tel && (
                <a
                  href={`tel:${prestataire.contact_tel}`}
                  style={{ display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px", borderRadius: 9, backgroundColor: "#F0FDF4", color: "#34C759", textDecoration: "none", fontSize: 13, fontWeight: 600 }}
                >
                  <PhoneCall size={13} />
                  {prestataire.contact_tel}
                </a>
              )}
              {prestataire.contact_email && (
                <a
                  href={`mailto:${prestataire.contact_email}`}
                  style={{ display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px", borderRadius: 9, backgroundColor: "#EFF6FF", color: "#2563EB", textDecoration: "none", fontSize: 13, fontWeight: 600 }}
                >
                  <Mail size={13} />
                  {prestataire.contact_email}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Domaines */}
        {prestataire.domaines.length > 0 && (
          <div style={{ padding: "16px 24px", backgroundColor: "#FFFFFF", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 10px" }}>Domaines</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {prestataire.domaines.sort().map((d) => (
                <Badge key={d} variant="info">{d}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Stats rapides */}
        <div style={{ padding: "16px 24px", backgroundColor: "#FFFFFF", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", gap: 12 }}>
          <div style={{ flex: 1, borderRadius: 12, backgroundColor: "#F0FDF4", padding: "12px 14px" }}>
            <p style={{ fontSize: 11, color: "#34C759", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 4px" }}>Prochaine visite</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>{formatDate(prestataire.prochaine_visite)}</p>
          </div>
          {prestataire.nb_retards > 0 && (
            <div style={{ flex: 1, borderRadius: 12, backgroundColor: "#FFF1F0", padding: "12px 14px" }}>
              <p style={{ fontSize: 11, color: "#FF3B30", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 4px" }}>En retard</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>{prestataire.nb_retards} contrôle{prestataire.nb_retards > 1 ? "s" : ""}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        {prestataire.notes && (
          <div style={{ padding: "16px 24px", backgroundColor: "#FFFFFF", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px" }}>Notes</p>
            <p style={{ fontSize: 13, color: "#3A3A3C", margin: 0, lineHeight: 1.5 }}>{prestataire.notes}</p>
          </div>
        )}

        {/* Contrôles SET */}
        <div style={{ padding: "20px 24px", flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 14px" }}>
            Contrôles SET associés
          </p>
          {controlesTries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", backgroundColor: "#FFFFFF", borderRadius: 12 }}>
              <p style={{ fontSize: 13, color: "#AEAEB2", margin: 0 }}>Aucun contrôle lié via prestataire_id</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {controlesTries.map((c) => {
                const cfg = STATUT_CONTROLE_CFG[c.statut];
                return (
                  <div
                    key={c.id}
                    style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.04)" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#1D1D1F", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.nom}
                      </p>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "#AEAEB2" }}>{c.categorie_nom}</span>
                        {c.date_derniere_visite && (
                          <span style={{ fontSize: 12, color: "#8E8E93" }}>Dernière : {formatDate(c.date_derniere_visite)}</span>
                        )}
                      </div>
                      {c.date_prochaine && (
                        <p style={{ fontSize: 12, color: "#6E6E73", margin: "4px 0 0" }}>
                          Prochaine : {formatDate(c.date_prochaine)}
                        </p>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: cfg.color, flexShrink: 0, marginTop: 2 }}>
                      {cfg.icon}
                      <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>
                        {c.statut === "ok" ? "À jour" : c.statut === "alerte" ? "Alerte" : "Retard"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA */}
        <div style={{ padding: "16px 24px 32px", backgroundColor: "#FFFFFF", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <button
            onClick={() => router.push("/set")}
            style={{ width: "100%", height: 40, borderRadius: 10, border: "none", backgroundColor: "#2563EB", color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 1px 4px rgba(37,99,235,0.3)" }}
          >
            Voir dans SET
            <ExternalLink size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PrestatairesPage() {
  const [prestataires, setPrestataires] = useState<Prestataire[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Prestataire | null>(null);
  const [showInactifs, setShowInactifs] = useState(false);

  // Modal
  const [modal, setModal] = useState<{ open: boolean; mode: "create" | "edit"; data?: Prestataire }>({
    open: false, mode: "create",
  });

  // Delete confirm
  const [deleteState, setDeleteState] = useState<{
    prestataire: Prestataire;
    linkedCount: number;
    deleting: boolean;
  } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchPrestatairesTable().then(setPrestataires).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => showInactifs ? prestataires : prestataires.filter((p) => p.actif),
    [prestataires, showInactifs]
  );

  const kpis = useMemo(() => ({
    total: prestataires.filter((p) => p.actif).length,
    visiteSemaine: prestataires.filter((p) => p.actif && isThisWeek(p.prochaine_visite)).length,
    avecRetard: prestataires.filter((p) => p.actif && p.nb_retards > 0).length,
  }), [prestataires]);

  function handleSaved(p: Prestataire) {
    setPrestataires((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...p };
        return next;
      }
      return [...prev, p].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    });
    setModal({ open: false, mode: "create" });
    if (selected?.id === p.id) setSelected(p);
  }

  async function handleDeleteClick(p: Prestataire) {
    const count = await countSetControlesForPrestataire(p.id);
    setDeleteState({ prestataire: p, linkedCount: count, deleting: false });
  }

  async function handleConfirmDelete() {
    if (!deleteState) return;
    setDeleteState((s) => s ? { ...s, deleting: true } : null);
    try {
      await deletePrestataire(deleteState.prestataire.id);
      setPrestataires((prev) => prev.filter((x) => x.id !== deleteState.prestataire.id));
      if (selected?.id === deleteState.prestataire.id) setSelected(null);
      setDeleteState(null);
    } catch (err) {
      console.error(err);
      setDeleteState((s) => s ? { ...s, deleting: false } : null);
    }
  }

  async function handleConfirmDeactivate() {
    if (!deleteState) return;
    setDeleteState((s) => s ? { ...s, deleting: true } : null);
    try {
      await updatePrestataire(deleteState.prestataire.id, { actif: false });
      setPrestataires((prev) =>
        prev.map((x) => x.id === deleteState.prestataire.id ? { ...x, actif: false } : x)
      );
      if (selected?.id === deleteState.prestataire.id) setSelected((s) => s ? { ...s, actif: false } : null);
      setDeleteState(null);
    } catch (err) {
      console.error(err);
      setDeleteState((s) => s ? { ...s, deleting: false } : null);
    }
  }

  return (
    <>
      <Header title="Prestataires" subtitle="Sofitel Ajaccio" />

      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Titre + bouton */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-dm-serif)", fontSize: 30, fontWeight: 400, color: "#1D1D1F", margin: 0, lineHeight: 1.2 }}>
              Prestataires
            </h1>
            <p style={{ fontSize: 13, color: "#AEAEB2", margin: "4px 0 0" }}>
              {kpis.total} prestataire{kpis.total !== 1 ? "s" : ""} actif{kpis.total !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setModal({ open: true, mode: "create" })}
            style={{ display: "flex", alignItems: "center", gap: 6, height: 38, padding: "0 16px", borderRadius: 10, border: "none", backgroundColor: "#2563EB", color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: "pointer", flexShrink: 0, boxShadow: "0 1px 4px rgba(37,99,235,0.3)" }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Ajouter
          </button>
        </div>

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Actifs",                value: kpis.total,         color: "#2563EB", bg: "#EFF6FF", icon: <Building2 size={18} color="#2563EB" /> },
            { label: "Visites cette semaine", value: kpis.visiteSemaine, color: "#34C759", bg: "#F0FDF4", icon: <Clock size={18} color="#34C759" /> },
            { label: "Avec retard",           value: kpis.avecRetard,    color: "#FF3B30", bg: "#FFF1F0", icon: <AlertTriangle size={18} color="#FF3B30" /> },
          ].map(({ label, value, color, bg, icon }) => (
            <div key={label} style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)" }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 10px" }}>{label}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {icon}
                </div>
                <span style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F" }}>{value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Toggle inactifs */}
        {prestataires.some((p) => !p.actif) && (
          <button
            onClick={() => setShowInactifs((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 6, alignSelf: "flex-start", height: 30, padding: "0 12px", borderRadius: 8, border: "1.5px solid #E5E5EA", backgroundColor: "#FFFFFF", color: "#6E6E73", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
          >
            <ChevronDown size={13} style={{ transform: showInactifs ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            {showInactifs ? "Masquer les inactifs" : "Afficher les inactifs"}
          </button>
        )}

        {/* Grille */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: 160, borderRadius: 16, backgroundColor: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={28} color="#2563EB" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>Aucun prestataire</p>
            <p style={{ fontSize: 14, color: "#AEAEB2", margin: 0, textAlign: "center" }}>
              Cliquez sur « Ajouter » pour référencer votre premier prestataire.
            </p>
            <button
              onClick={() => setModal({ open: true, mode: "create" })}
              style={{ display: "flex", alignItems: "center", gap: 6, height: 38, padding: "0 18px", borderRadius: 10, border: "none", backgroundColor: "#2563EB", color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              <Plus size={15} />
              Ajouter un prestataire
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
            {filtered.map((p) => {
              const av = avatarColor(p.nom);
              const visiteSt = prochaineVisiteStatut(p.prochaine_visite);
              const visiteCfg = STATUT_VISITE[visiteSt];
              const days = daysUntil(p.prochaine_visite);

              return (
                <div
                  key={p.id}
                  onClick={() => setSelected(p)}
                  style={{
                    backgroundColor: "#FFFFFF", borderRadius: 16, padding: "18px 20px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)",
                    cursor: "pointer", display: "flex", flexDirection: "column", gap: 14,
                    opacity: p.actif ? 1 : 0.5, transition: "box-shadow 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 6px 28px rgba(0,0,0,0.10)")}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)")}
                >
                  {/* Avatar + nom */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: av.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: av.color }}>{initials(p.nom)}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.nom}
                      </p>
                      <p style={{ fontSize: 12, color: "#AEAEB2", margin: "2px 0 0" }}>
                        {p.nb_controles > 0 ? `${p.nb_controles} contrôle${p.nb_controles > 1 ? "s" : ""}` : "Aucun contrôle lié"}
                        {p.contact_tel && <span style={{ color: "#34C759", marginLeft: 6 }}>· <PhoneCall size={10} style={{ verticalAlign: "middle" }} /></span>}
                      </p>
                    </div>
                    {p.nb_retards > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#FF3B30", backgroundColor: "#FFF1F0", padding: "3px 8px", borderRadius: 8, flexShrink: 0 }}>
                        {p.nb_retards} retard{p.nb_retards > 1 ? "s" : ""}
                      </span>
                    )}
                    {!p.actif && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#8E8E93", backgroundColor: "#F5F5F7", padding: "3px 8px", borderRadius: 8, flexShrink: 0 }}>
                        Inactif
                      </span>
                    )}
                  </div>

                  {/* Domaines */}
                  {p.domaines.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {p.domaines.sort().map((d) => (
                        <Badge key={d} variant="info">{d}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Prochaine visite */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <div>
                      <p style={{ fontSize: 11, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.4px", fontWeight: 500, margin: "0 0 3px" }}>
                        Prochaine visite
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>
                        {formatDate(p.prochaine_visite)}
                        {days !== null && days >= 0 && (
                          <span style={{ fontSize: 12, fontWeight: 400, color: "#8E8E93", marginLeft: 5 }}>
                            ({days === 0 ? "aujourd'hui" : days === 1 ? "demain" : `dans ${days}j`})
                          </span>
                        )}
                      </p>
                    </div>
                    {p.nb_controles > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: visiteCfg.color, backgroundColor: visiteCfg.bg, padding: "4px 10px", borderRadius: 8 }}>
                        {visiteCfg.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawer détail */}
      {selected && (
        <DetailDrawer
          prestataire={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setModal({ open: true, mode: "edit", data: selected });
            setSelected(null);
          }}
          onDelete={() => {
            const p = selected;
            setSelected(null);
            handleDeleteClick(p);
          }}
        />
      )}

      {/* Modal ajout / édition */}
      {modal.open && (
        <PrestataireModal
          mode={modal.mode}
          initial={modal.data}
          onClose={() => setModal({ open: false, mode: "create" })}
          onSaved={handleSaved}
        />
      )}

      {/* Confirmation suppression */}
      {deleteState && (
        <ConfirmDeleteDialog
          prestataire={deleteState.prestataire}
          linkedCount={deleteState.linkedCount}
          onCancel={() => setDeleteState(null)}
          onConfirmDelete={handleConfirmDelete}
          onConfirmDeactivate={handleConfirmDeactivate}
          deleting={deleteState.deleting}
        />
      )}
    </>
  );
}
