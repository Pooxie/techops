"use client";

import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  ChevronDown, ChevronRight, FileDown, Plus, X, CheckCircle, Paperclip,
  Shield, Flame, Zap, ArrowUpDown, Thermometer, UtensilsCrossed, Wind,
  GraduationCap, FileText, Droplets, AlertTriangle, Wrench, HardHat,
  Building, Anchor, Leaf, Search, ClipboardCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";
import UploadDocumentModal from "@/components/ui/UploadDocumentModal";
import {
  fetchSetCategories,
  updateSetControle,
  createSetControle,
  fetchSetVisites,
  saveSetVisite,
  type SetCategorie,
  type SetControle,
  type SetVisite,
} from "@/lib/supabase";

// ─── Export PDF ────────────────────────────────────────────────────────────────

async function exportPDF(categories: SetCategorie[], title?: string) {
  const [{ pdf }, { RegistreSETPdf }, React] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/pdf/RegistreSETPdf"),
    import("react"),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = React.createElement(RegistreSETPdf, { categories, title }) as any;
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `Registre_SET_Sofitel_${dateStr}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Filtre = "tous" | "retard" | "alerte" | "ok";
type DomainFiltre = "tous" | "Safety" | "Environment" | "Technical";

const STATUT_FILTRES: { key: Filtre; label: string }[] = [
  { key: "tous",   label: "Tous" },
  { key: "retard", label: "En retard" },
  { key: "alerte", label: "Alerte" },
  { key: "ok",     label: "À jour" },
];

// ─── Domaines S/E/T ───────────────────────────────────────────────────────────

type DomainCfg = {
  theme: string;
  label: string;
  color: string;
  bg: string;
  pill: string;
  emoji: string;
};

const DOMAINS: DomainCfg[] = [
  { theme: "Safety",      label: "Sécurité",      color: "#FF3B30", bg: "#FFF1F0", pill: "#FF3B3018", emoji: "🔴" },
  { theme: "Environment", label: "Environnement",  color: "#FF9500", bg: "#FFFBEB", pill: "#FF950018", emoji: "🟡" },
  { theme: "Technical",   label: "Technique",      color: "#007AFF", bg: "#EFF6FF", pill: "#007AFF18", emoji: "🔵" },
];

function getDomain(theme: string | null | undefined): DomainCfg {
  return DOMAINS.find((d) => d.theme === theme) ?? DOMAINS[2];
}

/**
 * Normalise la valeur theme_name issue de Supabase :
 * - Trim les espaces éventuels
 * - Accepte uniquement les valeurs exactes 'Safety' | 'Environment' | 'Technical'
 * - Tout le reste (NULL, vide, casse différente) → "Technical"
 */
function normalizeTheme(theme_name: string | null | undefined): "Safety" | "Environment" | "Technical" {
  const v = typeof theme_name === "string" ? theme_name.trim() : null;
  if (v === "Safety" || v === "Environment" || v === "Technical") return v;
  return "Technical";
}

// ─── Icônes & couleurs par catégorie ─────────────────────────────────────────

const CATEGORIE_ICONS: Record<string, LucideIcon> = {
  "Commission de Sécurité":     Shield,
  "Sécurité Incendie":          Flame,
  "Installations Electriques":  Zap,
  "Appareils de Levage":        ArrowUpDown,
  "Chaufferie":                 Thermometer,
  "Installations Thermiques":   Thermometer,
  "Installations de Gaz":       Flame,
  "Appareils de Cuisson":       UtensilsCrossed,
  "Aération / CTA":             Wind,
  "Formation":                  GraduationCap,
  "Documents réglementaires":   FileText,
  "Hygiène de l'eau":           Droplets,
  "Amiante":                    AlertTriangle,
  "Maintenance & Administratif":Wrench,
  "Equipements de Protection":  HardHat,
  "Bâtiment":                   Building,
  "Eau / Domaine Maritime":     Anchor,
  "Environnement":              Leaf,
};

const CATEGORIE_COLORS: Record<string, string> = {
  "Commission de Sécurité":     "#FF3B30",
  "Sécurité Incendie":          "#FF3B30",
  "Amiante":                    "#FF3B30",
  "Installations Electriques":  "#FF9500",
  "Appareils de Levage":        "#FF9500",
  "Chaufferie":                 "#FFCC00",
  "Installations Thermiques":   "#FFCC00",
  "Installations de Gaz":       "#FFCC00",
  "Appareils de Cuisson":       "#FFCC00",
  "Hygiène de l'eau":           "#007AFF",
  "Eau / Domaine Maritime":     "#007AFF",
  "Aération / CTA":             "#007AFF",
  "Environnement":              "#34C759",
  "Bâtiment":                   "#34C759",
  "Documents réglementaires":   "#8E8E93",
  "Maintenance & Administratif":"#8E8E93",
  "Formation":                  "#8E8E93",
};

function getCategorieIcon(nom: string): LucideIcon { return CATEGORIE_ICONS[nom] ?? FileText; }
function getCategorieColor(nom: string): string    { return CATEGORIE_COLORS[nom] ?? "#8E8E93"; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function todayISO() { return new Date().toISOString().split("T")[0]; }

function statutBadge(s: "ok" | "alerte" | "retard") {
  if (s === "retard") return <Badge variant="danger">En retard</Badge>;
  if (s === "alerte") return <Badge variant="warning">Alerte</Badge>;
  return <Badge variant="success">À jour</Badge>;
}

const fieldStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.10)", backgroundColor: "#F5F5F7",
  fontSize: 14, color: "#1D1D1F", outline: "none",
  fontFamily: "var(--font-inter, system-ui, sans-serif)",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 500, color: "#AEAEB2",
  textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6,
};

// ─── Mini-modale Visite Rapide (Évol 5) ──────────────────────────────────────

function QuickVisiteModal({
  controle,
  onClose,
  onSaved,
}: {
  controle: SetControle;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(controle.date_derniere_visite ?? todayISO());
  const [nc, setNc] = useState(controle.non_conformites);
  const [ncRest, setNcRest] = useState(controle.non_conformites_restantes);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await Promise.all([
        updateSetControle({
          id: controle.id,
          date_derniere_visite: date,
          non_conformites: nc,
          non_conformites_restantes: ncRest,
          notes: notes || controle.notes || "",
          periodicite_mois: controle.periodicite_mois,
        }),
        saveSetVisite({
          controle_id: controle.id,
          date_visite: date,
          prestataire: controle.prestataire ?? "",
          non_conformites: nc,
          non_conformites_restantes: ncRest,
          notes,
        }),
      ]);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde.");
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "relative", backgroundColor: "#FFFFFF", borderRadius: 20,
        padding: "24px", width: "100%", maxWidth: 420,
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
              <ClipboardCheck size={16} color="#2563EB" />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#2563EB" }}>Enregistrer une visite</span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#1D1D1F", margin: 0, lineHeight: 1.3 }}>{controle.nom}</p>
            <p style={{ fontSize: 12, color: "#AEAEB2", margin: "2px 0 0" }}>{controle.categorie_nom}</p>
          </div>
          <button onClick={onClose} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", backgroundColor: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={13} color="#6E6E73" />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Date de visite</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={fieldStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={labelStyle}>NC total</label>
              <input type="number" min={0} value={nc} onChange={(e) => setNc(parseInt(e.target.value) || 0)} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>NC restantes</label>
              <input type="number" min={0} value={ncRest} onChange={(e) => setNcRest(parseInt(e.target.value) || 0)} style={fieldStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notes (optionnel)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Observations…" style={{ ...fieldStyle, resize: "none", lineHeight: 1.5 }} />
          </div>

          {error && <p style={{ fontSize: 12, color: "#FF3B30", backgroundColor: "#FFF1F0", padding: "8px 12px", borderRadius: 8, margin: 0, border: "1px solid rgba(255,59,48,0.15)" }}>{error}</p>}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, height: 40, borderRadius: 10, border: "1px solid rgba(0,0,0,0.10)", backgroundColor: "#F5F5F7", fontSize: 14, fontWeight: 500, color: "#6E6E73", cursor: "pointer" }}>
              Annuler
            </button>
            <button type="submit" disabled={saving} style={{ flex: 2, height: 40, borderRadius: 10, border: "none", backgroundColor: saving ? "#C7C7CC" : "#2563EB", color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 1px 4px rgba(37,99,235,0.3)" }}>
              {saving ? "Enregistrement…" : "✓ Enregistrer la visite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Historique des visites (Évol 6) ─────────────────────────────────────────

function VisiteHistorique({ controleId }: { controleId: string }) {
  const [visites, setVisites] = useState<SetVisite[] | null>(null);

  useEffect(() => {
    fetchSetVisites(controleId)
      .then(setVisites)
      .catch(() => setVisites([]));
  }, [controleId]);

  return (
    <div style={{ padding: "20px 24px" }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 14px" }}>
        Historique des visites
      </p>

      {visites === null ? (
        <p style={{ fontSize: 13, color: "#AEAEB2" }}>Chargement…</p>
      ) : visites.length === 0 ? (
        <p style={{ fontSize: 13, color: "#AEAEB2" }}>Aucune visite enregistrée dans TechOps</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Date", "Prestataire", "NC total", "NC rest.", "Notes"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", backgroundColor: "#F5F5F7", fontSize: 10, fontWeight: 600, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.4px", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visites.map((v, i) => (
                <tr key={v.id} style={{ borderTop: i > 0 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <td style={{ padding: "8px 8px", color: "#1D1D1F", fontWeight: 500, whiteSpace: "nowrap" }}>{formatDate(v.date_visite)}</td>
                  <td style={{ padding: "8px 8px", color: "#6E6E73" }}>{v.prestataire || "—"}</td>
                  <td style={{ padding: "8px 8px", color: "#6E6E73", textAlign: "center" }}>{v.non_conformites}</td>
                  <td style={{ padding: "8px 8px", textAlign: "center", color: v.non_conformites_restantes > 0 ? "#FF3B30" : "#AEAEB2", fontWeight: v.non_conformites_restantes > 0 ? 600 : 400 }}>
                    {v.non_conformites_restantes > 0 ? v.non_conformites_restantes : "—"}
                  </td>
                  <td style={{ padding: "8px 8px", color: "#6E6E73", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Drawer détail ────────────────────────────────────────────────────────────

function DetailDrawer({
  controle,
  onClose,
  onUpdated,
  onAddDocument,
}: {
  controle: SetControle;
  onClose: () => void;
  onUpdated: () => void;
  onAddDocument: (controleId: string) => void;
}) {
  const [dateVisite, setDateVisite] = useState(controle.date_derniere_visite ?? todayISO());
  const [nc, setNc] = useState(controle.non_conformites);
  const [ncRest, setNcRest] = useState(controle.non_conformites_restantes);
  const [notes, setNotes] = useState(controle.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const domain = getDomain(controle.theme_name);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      await Promise.all([
        updateSetControle({
          id: controle.id,
          date_derniere_visite: dateVisite,
          non_conformites: nc,
          non_conformites_restantes: ncRest,
          notes,
          periodicite_mois: controle.periodicite_mois,
        }),
        saveSetVisite({
          controle_id: controle.id,
          date_visite: dateVisite,
          prestataire: controle.prestataire ?? "",
          non_conformites: nc,
          non_conformites_restantes: ncRest,
          notes,
        }),
      ]);
      setSaveSuccess(true);
      onUpdated();
      setTimeout(onClose, 800);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde. Réessaie.");
      setSaving(false);
    }
  }

  const dateProchainePreview = (() => {
    if (!dateVisite) return null;
    const d = new Date(dateVisite);
    d.setMonth(d.getMonth() + controle.periodicite_mois);
    return d.toISOString().split("T")[0];
  })();

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.30)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 49 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, backgroundColor: "#FFFFFF", zIndex: 50, display: "flex", flexDirection: "column", boxShadow: "-24px 0 64px rgba(0,0,0,0.12)", overflowY: "auto" }}>

        {/* En-tête */}
        <div style={{ padding: "20px 24px 18px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: domain.color, backgroundColor: domain.bg, padding: "2px 8px", borderRadius: 12, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                {domain.emoji} {domain.label}
              </span>
              <span style={{ fontSize: 11, color: "#AEAEB2" }}>{controle.categorie_nom}</span>
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: "#1D1D1F", margin: "0 0 10px", lineHeight: 1.35 }}>{controle.nom}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {statutBadge(controle.statut)}
              {controle.non_conformites_restantes > 0 && (
                <span style={{ fontSize: 12, fontWeight: 600, color: "#FF3B30", backgroundColor: "#FFF1F0", padding: "3px 10px", borderRadius: 16 }}>
                  {controle.non_conformites_restantes} NC ouverte{controle.non_conformites_restantes > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)", backgroundColor: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={15} color="#6E6E73" />
          </button>
        </div>

        {/* Informations */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 14px" }}>Informations</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
            {[
              { label: "Type", value: controle.type_intervenant || "—" },
              { label: "Périodicité", value: controle.periodicite_mois ? `${controle.periodicite_mois} mois` : "—" },
              { label: "Prestataire", value: controle.prestataire || "—" },
              { label: "Dernière visite", value: formatDate(controle.date_derniere_visite) },
              {
                label: "Prochaine échéance",
                value: formatDate(controle.date_prochaine),
                valueStyle: controle.statut === "retard" ? { color: "#FF3B30", fontWeight: 600 } : controle.statut === "alerte" ? { color: "#FF9500", fontWeight: 600 } : undefined,
              },
              { label: "NC total / restantes", value: `${controle.non_conformites} / ${controle.non_conformites_restantes}` },
            ].map(({ label, value, valueStyle }) => (
              <div key={label}>
                <p style={labelStyle}>{label}</p>
                <p style={{ fontSize: 14, color: "#1D1D1F", margin: 0, ...valueStyle }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Formulaire mise à jour */}
        <form onSubmit={handleSave} style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 16px" }}>Mettre à jour après visite</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Date de visite</label>
              <input type="date" value={dateVisite} onChange={(e) => setDateVisite(e.target.value)} required style={fieldStyle} />
              {dateProchainePreview && (
                <p style={{ fontSize: 12, color: "#6E6E73", margin: "5px 0 0" }}>
                  Prochaine échéance calculée : <strong>{formatDate(dateProchainePreview)}</strong>
                </p>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Non-conformités (total)</label>
                <input type="number" min={0} value={nc} onChange={(e) => setNc(parseInt(e.target.value) || 0)} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>NC restantes</label>
                <input type="number" min={0} value={ncRest} onChange={(e) => setNcRest(parseInt(e.target.value) || 0)} style={fieldStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Observations, remarques…" style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5 }} />
            </div>
            {saveError && <p style={{ fontSize: 13, color: "#FF3B30", backgroundColor: "#FFF1F0", padding: "10px 12px", borderRadius: 10, margin: 0, border: "1px solid rgba(255,59,48,0.15)" }}>{saveError}</p>}
            {saveSuccess && <p style={{ fontSize: 13, color: "#34C759", backgroundColor: "#F0FDF4", padding: "10px 12px", borderRadius: 10, margin: 0, border: "1px solid rgba(52,199,89,0.2)" }}>Mis à jour avec succès ✓</p>}
            <button type="submit" disabled={saving || saveSuccess} style={{ height: 40, padding: "0 20px", borderRadius: 10, border: "none", backgroundColor: saveSuccess ? "#34C759" : "#2563EB", color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: saving || saveSuccess ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: saveSuccess ? "0 1px 4px rgba(52,199,89,0.3)" : "0 1px 4px rgba(37,99,235,0.3)", transition: "background-color 0.2s" }}>
              {saving ? "Enregistrement…" : saveSuccess ? "Enregistré ✓" : "Enregistrer la mise à jour"}
            </button>
          </div>
        </form>

        {/* Documents joints */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 14px" }}>Documents joints</p>
          <p style={{ fontSize: 13, color: "#AEAEB2", margin: "0 0 14px" }}>Aucun document pour ce contrôle.</p>
          <button onClick={() => onAddDocument(controle.id)} style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.10)", backgroundColor: "#F5F5F7", fontSize: 13, fontWeight: 500, color: "#6E6E73", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Paperclip size={14} strokeWidth={2} />
            Ajouter un document
          </button>
        </div>

        {/* Historique des visites (Évol 6) */}
        <div style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <VisiteHistorique controleId={controle.id} />
        </div>

      </div>
    </>
  );
}

// ─── Accordéon catégorie ──────────────────────────────────────────────────────

const COL = "1fr 64px 80px 1fr 100px 100px 90px 40px 88px";
const COL_HDRS = ["Contrôle", "Type", "Périodicité", "Prestataire", "Dernière visite", "Prochaine éch.", "Statut", "NC", "Action"];

function CategorieAccordeon({
  categorie,
  onSelect,
  selectedId,
  onQuickVisite,
}: {
  categorie: SetCategorie;
  onSelect: (c: SetControle) => void;
  selectedId: string | null;
  onQuickVisite: (c: SetControle) => void;
}) {
  const [open, setOpen] = useState(true);
  const retard = categorie.controles.filter((c) => c.statut === "retard").length;
  const alerte = categorie.controles.filter((c) => c.statut === "alerte").length;
  const Icon = getCategorieIcon(categorie.nom);
  const color = getCategorieColor(categorie.nom);

  return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)", overflow: "hidden" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", backgroundColor: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          {open ? <ChevronDown size={15} color="#AEAEB2" /> : <ChevronRight size={15} color="#AEAEB2" />}
          <span style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: `${color}18`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={13} color={color} strokeWidth={2} />
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1D1D1F" }}>{categorie.nom}</span>
          <span style={{ fontSize: 12, color: "#AEAEB2" }}>({categorie.controles.length})</span>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {retard > 0 && <Badge variant="danger">{retard} retard{retard > 1 ? "s" : ""}</Badge>}
          {alerte > 0 && <Badge variant="warning">{alerte} alerte{alerte > 1 ? "s" : ""}</Badge>}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          {/* En-tête colonnes */}
          <div className="set-table-header" style={{ display: "grid", gridTemplateColumns: COL, gap: 8, padding: "7px 18px", backgroundColor: "#F5F5F7" }}>
            {COL_HDRS.map((h) => (
              <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</span>
            ))}
          </div>

          {categorie.controles.map((controle, i) => (
            <React.Fragment key={controle.id}>
              {/* Desktop row */}
              <div
                className="set-table-row"
                style={{
                  display: "grid", gridTemplateColumns: COL, gap: 8, padding: "10px 18px",
                  backgroundColor: selectedId === controle.id ? "#EFF6FF" : "transparent",
                  borderTop: i > 0 ? "1px solid rgba(0,0,0,0.04)" : "none",
                  alignItems: "center", cursor: "pointer",
                  transition: "background-color 0.1s",
                }}
                onClick={() => onSelect(controle)}
                onMouseEnter={(e) => { if (selectedId !== controle.id) (e.currentTarget as HTMLElement).style.backgroundColor = "#F5F5F7"; }}
                onMouseLeave={(e) => { if (selectedId !== controle.id) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 500, color: "#1D1D1F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{controle.nom}</span>
                <span>
                  {controle.type_intervenant && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6E6E73", backgroundColor: "#F5F5F7", padding: "2px 8px", borderRadius: 16 }}>{controle.type_intervenant}</span>
                  )}
                </span>
                <span style={{ fontSize: 12.5, color: "#6E6E73" }}>{controle.periodicite_mois ? `${controle.periodicite_mois} mois` : "—"}</span>
                <span style={{ fontSize: 12.5, color: "#6E6E73", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{controle.prestataire || "—"}</span>
                <span style={{ fontSize: 12.5, color: "#6E6E73" }}>{formatDate(controle.date_derniere_visite)}</span>
                <span style={{ fontSize: 12.5, color: controle.statut === "retard" ? "#FF3B30" : controle.statut === "alerte" ? "#FF9500" : "#6E6E73", fontWeight: controle.statut !== "ok" ? 500 : 400 }}>{formatDate(controle.date_prochaine)}</span>
                <span>{statutBadge(controle.statut)}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: controle.non_conformites_restantes > 0 ? "#FF3B30" : "#AEAEB2" }}>
                  {controle.non_conformites_restantes > 0 ? controle.non_conformites_restantes : "—"}
                </span>
                {/* Bouton ✓ Visite (Évol 5) */}
                <button
                  onClick={(e) => { e.stopPropagation(); onQuickVisite(controle); }}
                  style={{
                    height: 28, padding: "0 10px", borderRadius: 7,
                    border: "1px solid rgba(37,99,235,0.20)", backgroundColor: "#EFF6FF",
                    color: "#2563EB", fontSize: 11, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
                    transition: "background-color 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#DBEAFE")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#EFF6FF")}
                >
                  <ClipboardCheck size={11} /> Visite
                </button>
              </div>

              {/* Mobile card */}
              <button
                className="set-mobile-card"
                onClick={() => onSelect(controle)}
                style={{ width: "100%", padding: "12px 16px", backgroundColor: selectedId === controle.id ? "#EFF6FF" : "transparent", border: "none", borderTop: i > 0 ? "1px solid rgba(0,0,0,0.04)" : "none", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: "#1D1D1F", flex: 1, lineHeight: 1.35 }}>{controle.nom}</span>
                  {statutBadge(controle.statut)}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#6E6E73" }}>
                    Éch. <span style={{ fontWeight: controle.statut !== "ok" ? 600 : 400, color: controle.statut === "retard" ? "#FF3B30" : controle.statut === "alerte" ? "#FF9500" : "#6E6E73" }}>
                      {formatDate(controle.date_prochaine)}
                    </span>
                  </span>
                  {controle.prestataire && <span style={{ fontSize: 12, color: "#6E6E73" }}>{controle.prestataire}</span>}
                  {controle.non_conformites_restantes > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: "#FF3B30" }}>{controle.non_conformites_restantes} NC</span>}
                  <button
                    onClick={(e) => { e.stopPropagation(); onQuickVisite(controle); }}
                    style={{ height: 26, padding: "0 10px", borderRadius: 7, border: "1px solid rgba(37,99,235,0.20)", backgroundColor: "#EFF6FF", color: "#2563EB", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    ✓ Visite
                  </button>
                </div>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Bloc domaine (Évol 1) ────────────────────────────────────────────────────

function DomainBlock({
  domain,
  categories,
  onSelect,
  selectedId,
  onQuickVisite,
}: {
  domain: DomainCfg;
  categories: SetCategorie[];
  onSelect: (c: SetControle) => void;
  selectedId: string | null;
  onQuickVisite: (c: SetControle) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const totalControles = categories.reduce((s, c) => s + c.controles.length, 0);
  const retardCount = categories.flatMap((c) => c.controles).filter((c) => c.statut === "retard").length;
  const alerteCount = categories.flatMap((c) => c.controles).filter((c) => c.statut === "alerte").length;

  return (
    <div>
      {/* En-tête domaine */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 18px", borderRadius: collapsed ? 12 : "12px 12px 0 0",
          backgroundColor: domain.bg, border: `1px solid ${domain.color}22`,
          borderBottom: collapsed ? `1px solid ${domain.color}22` : "none",
          cursor: "pointer", textAlign: "left",
          marginBottom: collapsed ? 0 : 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>{domain.emoji}</span>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: domain.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {domain.label}
            </span>
            <span style={{ fontSize: 12, color: domain.color, opacity: 0.7, marginLeft: 8 }}>
              {totalControles} contrôle{totalControles > 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {retardCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#FF3B30", backgroundColor: "#FFF1F0", border: "1px solid rgba(255,59,48,0.2)", padding: "2px 9px", borderRadius: 99 }}>
              {retardCount} retard{retardCount > 1 ? "s" : ""}
            </span>
          )}
          {alerteCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#FF9500", backgroundColor: "#FFFBEB", border: "1px solid rgba(255,149,0,0.2)", padding: "2px 9px", borderRadius: 99 }}>
              {alerteCount} alerte{alerteCount > 1 ? "s" : ""}
            </span>
          )}
          <ChevronDown
            size={15}
            color={domain.color}
            style={{ opacity: 0.7, transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }}
          />
        </div>
      </button>

      {/* Catégories du domaine */}
      {!collapsed && (
        <div style={{
          borderLeft: `2px solid ${domain.color}22`,
          borderRight: `2px solid ${domain.color}22`,
          borderBottom: `2px solid ${domain.color}22`,
          borderRadius: "0 0 12px 12px",
          padding: "8px 8px 8px",
          display: "flex", flexDirection: "column", gap: 4,
          backgroundColor: "#FAFAFA",
        }}>
          {categories.map((cat) => (
            <CategorieAccordeon
              key={cat.id}
              categorie={cat}
              onSelect={onSelect}
              selectedId={selectedId}
              onQuickVisite={onQuickVisite}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Formulaire nouveau contrôle ─────────────────────────────────────────────

function NewControleSheet({ categories, onClose, onCreated }: { categories: SetCategorie[]; onClose: () => void; onCreated: () => void }) {
  const [nom, setNom] = useState("");
  const [categorieId, setCategorieId] = useState(categories[0]?.id ?? "");
  const [type, setType] = useState<"BC" | "SA" | "INT">("BC");
  const [periodicite, setPeriodicite] = useState("12");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputSt: React.CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.10)", fontSize: 14, backgroundColor: "#F5F5F7", outline: "none", boxSizing: "border-box", fontFamily: "var(--font-inter, system-ui, sans-serif)", color: "#1D1D1F" };
  const labelSt: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#6E6E73", letterSpacing: "0.3px", marginBottom: 6 };

  async function handleSubmit() {
    if (!nom.trim()) { setError("Le nom est obligatoire."); return; }
    if (!categorieId) { setError("Choisissez une catégorie."); return; }
    const mois = parseInt(periodicite, 10);
    if (!mois || mois < 1) { setError("Périodicité invalide."); return; }
    setSaving(true); setError("");
    try {
      await createSetControle({ nom: nom.trim(), categorie_id: categorieId, type_intervenant: type, periodicite_mois: mois, notes: notes.trim() || null });
      onCreated();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? "Erreur lors de la création.");
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", backgroundColor: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: "20px 20px 44px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,0.14)" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#C7C7CC", margin: "0 auto 18px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>Nouveau contrôle</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={20} color="#8E8E93" /></button>
        </div>
        {error && <div style={{ backgroundColor: "#FFF1F0", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#FF3B30", fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={labelSt}>NOM DU CONTRÔLE *</label><input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Vérification alarme incendie" style={inputSt} /></div>
          <div>
            <label style={labelSt}>CATÉGORIE *</label>
            <select value={categorieId} onChange={(e) => setCategorieId(e.target.value)} style={{ ...inputSt, appearance: "none" }}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSt}>TYPE</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["BC", "SA", "INT"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)} style={{ flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, border: `2px solid ${type === t ? "#2563EB" : "rgba(0,0,0,0.10)"}`, backgroundColor: type === t ? "#EFF6FF" : "#FFFFFF", color: type === t ? "#2563EB" : "#6E6E73" }}>{t}</button>
              ))}
            </div>
          </div>
          <div><label style={labelSt}>PÉRIODICITÉ (MOIS) *</label><input type="number" min="1" max="120" value={periodicite} onChange={(e) => setPeriodicite(e.target.value)} placeholder="12" style={inputSt} /></div>
          <div><label style={labelSt}>NOTES</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Observations, références réglementaires…" style={{ ...inputSt, resize: "vertical" as const }} /></div>
          <button onClick={handleSubmit} disabled={saving} style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", backgroundColor: saving ? "#C7C7CC" : "#2563EB", color: "#FFFFFF", fontSize: 16, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", marginTop: 4, boxShadow: "0 2px 10px rgba(37,99,235,0.3)" }}>
            {saving ? "Création…" : "Créer le contrôle"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function SetPage() {
  const [categories, setCategories] = useState<SetCategorie[] | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [domainFiltre, setDomainFiltre] = useState<DomainFiltre>("tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<SetControle | null>(null);
  const [quickVisite, setQuickVisite] = useState<SetControle | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [uploadDocControleId, setUploadDocControleId] = useState<string | null>(null);
  const [showNewControle, setShowNewControle] = useState(false);

  function load() { fetchSetCategories().then(setCategories); }
  useEffect(() => { load(); }, []);

  // Fermer le menu export au clic extérieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleExportPDF(theme: string | null = null) {
    if (!categories) return;
    setExportMenuOpen(false);
    setExporting(true);
    try {
      let filteredCats: SetCategorie[];
      let pdfTitle: string;
      if (theme) {
        filteredCats = categories
          .map((cat) => ({ ...cat, controles: cat.controles.filter((c) => normalizeTheme(c.theme_name) === theme) }))
          .filter((cat) => cat.controles.length > 0);
        pdfTitle = `Registre Réglementaire — ${getDomain(theme).label}`;
      } else {
        filteredCats = categories;
        pdfTitle = "Registre Réglementaire — Tous les contrôles";
      }
      await exportPDF(filteredCats, pdfTitle);
    } finally {
      setExporting(false);
    }
  }

  function handleUpdated() { setSelected(null); load(); }

  // ── Groupes domaines calculés ─────────────────────────────────────────────
  const domainGroups = useMemo(() => {
    if (!categories) return null;
    const sq = searchQuery.toLowerCase().trim();

    return DOMAINS
      .filter((d) => domainFiltre === "tous" || d.theme === domainFiltre)
      .map((d) => {
        const domainCats = categories
          .map((cat) => ({
            ...cat,
            controles: cat.controles.filter((c) => {
              const matchDomain = normalizeTheme(c.theme_name) === d.theme;
              const matchStatus = filtre === "tous" || c.statut === filtre;
              const matchSearch = !sq
                || c.nom.toLowerCase().includes(sq)
                || c.prestataire?.toLowerCase().includes(sq)
                || c.categorie_nom?.toLowerCase().includes(sq);
              return matchDomain && matchStatus && matchSearch;
            }),
          }))
          .filter((cat) => cat.controles.length > 0);

        return { domain: d, categories: domainCats };
      })
      .filter(({ categories: cats }) => cats.length > 0);
  }, [categories, filtre, domainFiltre, searchQuery]);

  // ── Counts globaux ────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    if (!categories) return { retard: 0, alerte: 0, ok: 0 };
    const all = categories.flatMap((c) => c.controles);
    return { retard: all.filter((c) => c.statut === "retard").length, alerte: all.filter((c) => c.statut === "alerte").length, ok: all.filter((c) => c.statut === "ok").length };
  }, [categories]);

  const totalControles = categories?.reduce((s, c) => s + c.controles.length, 0) ?? 0;

  // ── Counts par domaine (pour stats cards Évol 4) ──────────────────────────
  const domainStats = useMemo(() => {
    if (!categories) return DOMAINS.map((d) => ({ ...d, total: 0, retard: 0, alerte: 0 }));
    const allControles = categories.flatMap((c) => c.controles);
    return DOMAINS.map((d) => {
      const all = allControles.filter((c) => normalizeTheme(c.theme_name) === d.theme);
      return {
        ...d,
        total: all.length,
        retard: all.filter((c) => c.statut === "retard").length,
        alerte: all.filter((c) => c.statut === "alerte").length,
      };
    });
  }, [categories]);

  const searchResultCount = domainGroups?.reduce((s, g) => s + g.categories.reduce((s2, c) => s2 + c.controles.length, 0), 0) ?? 0;

  return (
    <>
      <Header title="Contrôles SET" subtitle="Sofitel Ajaccio" />

      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* ── Titre + Actions ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1D1D1F", margin: 0, letterSpacing: "-0.5px" }}>Registre réglementaire</h1>
            {categories !== null && (
              <p style={{ fontSize: 13, color: "#AEAEB2", margin: "4px 0 0" }}>
                {totalControles} contrôle{totalControles > 1 ? "s" : ""} · {categories.length} catégorie{categories.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {/* Export PDF avec dropdown (Évol 7) */}
            <div ref={exportMenuRef} style={{ position: "relative" }}>
              <button
                onClick={() => setExportMenuOpen((v) => !v)}
                disabled={exporting || !categories}
                style={{ height: 36, padding: "0 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.10)", backgroundColor: "#FFFFFF", fontSize: 13, fontWeight: 500, color: exporting ? "#AEAEB2" : "#6E6E73", cursor: exporting || !categories ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", opacity: exporting ? 0.7 : 1 }}
              >
                <FileDown size={15} strokeWidth={2} />
                {exporting ? "Génération…" : "Export PDF"}
                <ChevronDown size={12} style={{ transform: exportMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
              </button>

              {exportMenuOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 30, backgroundColor: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden", minWidth: 220 }}>
                  {[
                    { label: "Tous les contrôles", theme: null },
                    ...DOMAINS.map((d) => ({ label: `${d.emoji} ${d.label} uniquement`, theme: d.theme })),
                  ].map(({ label, theme }) => (
                    <button
                      key={label}
                      onClick={() => void handleExportPDF(theme)}
                      style={{ width: "100%", padding: "10px 16px", background: "none", border: "none", borderBottom: "1px solid rgba(0,0,0,0.05)", textAlign: "left", fontSize: 13, color: "#1D1D1F", cursor: "pointer", fontFamily: "inherit" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5F5F7")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowNewControle(true)}
              disabled={!categories}
              style={{ height: 36, padding: "0 16px", borderRadius: 10, border: "none", backgroundColor: "#2563EB", fontSize: 13, fontWeight: 500, color: "#FFFFFF", cursor: categories ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 4px rgba(37,99,235,0.3)", opacity: categories ? 1 : 0.5 }}
            >
              <Plus size={15} strokeWidth={2.5} />
              Nouveau contrôle
            </button>
          </div>
        </div>

        {/* ── Stats cards domaines (Évol 4) ── */}
        {categories !== null && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {domainStats.map((d) => (
              <button
                key={d.theme}
                onClick={() => setDomainFiltre(domainFiltre === d.theme ? "tous" : d.theme as DomainFiltre)}
                style={{
                  padding: "12px 16px", borderRadius: 12, textAlign: "left", cursor: "pointer",
                  backgroundColor: domainFiltre === d.theme ? d.bg : "#FFFFFF",
                  border: `1.5px solid ${domainFiltre === d.theme ? d.color + "44" : "rgba(0,0,0,0.06)"}`,
                  boxShadow: domainFiltre === d.theme ? `0 0 0 2px ${d.color}22` : "0 1px 4px rgba(0,0,0,0.05)",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>{d.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: d.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{d.label}</span>
                </div>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1D1D1F", lineHeight: 1 }}>{d.total}</p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#AEAEB2" }}>
                  {d.retard > 0 ? <span style={{ color: "#FF3B30", fontWeight: 600 }}>{d.retard} retard{d.retard > 1 ? "s" : ""}</span> : null}
                  {d.retard > 0 && d.alerte > 0 ? " · " : null}
                  {d.alerte > 0 ? <span style={{ color: "#FF9500", fontWeight: 600 }}>{d.alerte} alerte{d.alerte > 1 ? "s" : ""}</span> : null}
                  {d.retard === 0 && d.alerte === 0 ? <span style={{ color: "#34C759" }}>Tout à jour ✓</span> : null}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* ── Barre de recherche (Évol 2) ── */}
        <div style={{ position: "relative" }}>
          <Search size={15} color="#AEAEB2" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un contrôle, un prestataire, une catégorie…"
            style={{
              width: "100%", height: 38, padding: "0 36px 0 36px",
              borderRadius: 10, border: "1px solid rgba(0,0,0,0.10)",
              backgroundColor: "#FFFFFF", fontSize: 13.5, color: "#1D1D1F",
              outline: "none", boxSizing: "border-box",
              fontFamily: "var(--font-inter, system-ui, sans-serif)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", backgroundColor: "#AEAEB2" }}
            >
              <X size={11} color="#FFFFFF" />
            </button>
          )}
        </div>

        {/* Indicateur résultats recherche */}
        {searchQuery.trim() && categories !== null && (
          <p style={{ margin: 0, fontSize: 13, color: "#6E6E73" }}>
            <strong style={{ color: "#1D1D1F" }}>{searchResultCount}</strong> résultat{searchResultCount > 1 ? "s" : ""} pour &ldquo;{searchQuery.trim()}&rdquo;
          </p>
        )}

        {/* ── Pills filtre statut + domaine (Évol 3) ── */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {/* Statut pills */}
          {STATUT_FILTRES.map(({ key, label }) => {
            const active = filtre === key;
            const count = key === "tous" ? totalControles : counts[key as keyof typeof counts];
            return (
              <button
                key={key}
                onClick={() => setFiltre(key)}
                style={{ height: 32, padding: "0 14px", borderRadius: 99, border: active ? "none" : "1px solid rgba(0,0,0,0.10)", backgroundColor: active ? "#2563EB" : "#FFFFFF", color: active ? "#FFFFFF" : "#6E6E73", fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: active ? "0 1px 4px rgba(37,99,235,0.25)" : "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                {label}
                {categories !== null && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 99, backgroundColor: active ? "rgba(255,255,255,0.25)" : "#F5F5F7", color: active ? "#FFFFFF" : "#AEAEB2", minWidth: 20, textAlign: "center" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Séparateur visuel */}
          <div style={{ width: 1, height: 20, backgroundColor: "rgba(0,0,0,0.10)", margin: "0 2px" }} />

          {/* Domain pills (Évol 3) */}
          {DOMAINS.map((d) => {
            const active = domainFiltre === d.theme;
            return (
              <button
                key={d.theme}
                onClick={() => setDomainFiltre(active ? "tous" : d.theme as DomainFiltre)}
                style={{
                  height: 32, padding: "0 14px", borderRadius: 99,
                  border: active ? "none" : "1px solid rgba(0,0,0,0.10)",
                  backgroundColor: active ? d.color : "#FFFFFF",
                  color: active ? "#FFFFFF" : "#6E6E73",
                  fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                  boxShadow: active ? `0 1px 4px ${d.color}44` : "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                {d.emoji} {d.label}
              </button>
            );
          })}
        </div>

        {/* ── Contenu principal ── */}
        {categories === null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[180, 220, 160].map((h, i) => (
              <div key={i} style={{ height: h, borderRadius: 16, backgroundColor: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)" }} />
            ))}
          </div>
        ) : !domainGroups || domainGroups.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 24px", gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle size={26} color="#2563EB" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>
              {searchQuery.trim() ? `Aucun résultat pour "${searchQuery.trim()}"` : filtre !== "tous" ? "Aucun contrôle dans ce statut" : "Aucun contrôle SET configuré"}
            </p>
            {searchQuery.trim() && (
              <button onClick={() => setSearchQuery("")} style={{ height: 34, padding: "0 16px", borderRadius: 9, border: "none", backgroundColor: "#2563EB", color: "#FFFFFF", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {domainGroups.map(({ domain, categories: domainCats }) => (
              <DomainBlock
                key={domain.theme}
                domain={domain}
                categories={domainCats}
                onSelect={setSelected}
                selectedId={selected?.id ?? null}
                onQuickVisite={setQuickVisite}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drawer détail */}
      {selected && (
        <DetailDrawer
          controle={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onAddDocument={(id) => setUploadDocControleId(id)}
        />
      )}

      {/* Modal visite rapide (Évol 5) */}
      {quickVisite && (
        <QuickVisiteModal
          controle={quickVisite}
          onClose={() => setQuickVisite(null)}
          onSaved={() => { setQuickVisite(null); load(); }}
        />
      )}

      {/* Modal upload document */}
      {uploadDocControleId && (
        <UploadDocumentModal
          initialSetControleId={uploadDocControleId}
          onClose={() => setUploadDocControleId(null)}
          onUploaded={() => setUploadDocControleId(null)}
        />
      )}

      {/* Nouveau contrôle */}
      {showNewControle && categories && (
        <NewControleSheet
          categories={categories}
          onClose={() => setShowNewControle(false)}
          onCreated={() => { setShowNewControle(false); load(); }}
        />
      )}
    </>
  );
}
