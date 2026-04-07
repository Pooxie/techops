"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  ChevronDown, ChevronRight, FileDown, Plus, X, CheckCircle, Paperclip,
  Shield, Flame, Zap, ArrowUpDown, Thermometer, UtensilsCrossed, Wind,
  GraduationCap, FileText, Droplets, AlertTriangle, Wrench, HardHat,
  Building, Anchor, Leaf,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";
import UploadDocumentModal from "@/components/ui/UploadDocumentModal";
import {
  fetchSetCategories,
  updateSetControle,
  createSetControle,
  type SetCategorie,
  type SetControle,
} from "@/lib/supabase";

async function exportPDF(categories: SetCategorie[]) {
  const [{ pdf }, { RegistreSETPdf }, React] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/pdf/RegistreSETPdf"),
    import("react"),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = React.createElement(RegistreSETPdf, { categories }) as any;
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

const filtres: { key: Filtre; label: string }[] = [
  { key: "tous", label: "Tous" },
  { key: "retard", label: "En retard" },
  { key: "alerte", label: "Alerte" },
  { key: "ok", label: "À jour" },
];

// ─── Icônes & couleurs par catégorie ─────────────────────────────────────────

const CATEGORIE_ICONS: Record<string, LucideIcon> = {
  "Commission de Sécurité": Shield,
  "Sécurité Incendie": Flame,
  "Installations Electriques": Zap,
  "Appareils de Levage": ArrowUpDown,
  "Chaufferie": Thermometer,
  "Installations Thermiques": Thermometer,
  "Installations de Gaz": Flame,
  "Appareils de Cuisson": UtensilsCrossed,
  "Aération / CTA": Wind,
  "Formation": GraduationCap,
  "Documents réglementaires": FileText,
  "Hygiène de l'eau": Droplets,
  "Amiante": AlertTriangle,
  "Maintenance & Administratif": Wrench,
  "Equipements de Protection": HardHat,
  "Bâtiment": Building,
  "Eau / Domaine Maritime": Anchor,
  "Environnement": Leaf,
};

const CATEGORIE_COLORS: Record<string, string> = {
  "Commission de Sécurité": "#FF3B30",
  "Sécurité Incendie": "#FF3B30",
  "Amiante": "#FF3B30",
  "Installations Electriques": "#FF9500",
  "Appareils de Levage": "#FF9500",
  "Chaufferie": "#FFCC00",
  "Installations Thermiques": "#FFCC00",
  "Installations de Gaz": "#FFCC00",
  "Appareils de Cuisson": "#FFCC00",
  "Hygiène de l'eau": "#007AFF",
  "Eau / Domaine Maritime": "#007AFF",
  "Aération / CTA": "#007AFF",
  "Environnement": "#34C759",
  "Bâtiment": "#34C759",
  "Documents réglementaires": "#8E8E93",
  "Maintenance & Administratif": "#8E8E93",
  "Formation": "#8E8E93",
};

function getCategorieIcon(nom: string): LucideIcon {
  return CATEGORIE_ICONS[nom] ?? FileText;
}

function getCategorieColor(nom: string): string {
  return CATEGORIE_COLORS[nom] ?? "#8E8E93";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function statutBadge(s: "ok" | "alerte" | "retard") {
  if (s === "retard") return <Badge variant="danger">En retard</Badge>;
  if (s === "alerte") return <Badge variant="warning">Alerte</Badge>;
  return <Badge variant="success">À jour</Badge>;
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.10)",
  backgroundColor: "#F5F5F7",
  fontSize: 14,
  color: "#1D1D1F",
  outline: "none",
  fontFamily: "var(--font-inter, system-ui, sans-serif)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  color: "#AEAEB2",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 6,
};

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await updateSetControle({
        id: controle.id,
        date_derniere_visite: dateVisite,
        non_conformites: nc,
        non_conformites_restantes: ncRest,
        notes,
        periodicite_mois: controle.periodicite_mois,
      });
      setSaveSuccess(true);
      onUpdated();
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      console.error("[SET] updateSetControle error:", err);
      setSaveError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde. Réessaie.");
      setSaving(false);
    }
  }

  // Date prochaine calculée en temps réel pour affichage
  const dateProchainePreview = (() => {
    if (!dateVisite) return null;
    const d = new Date(dateVisite);
    d.setMonth(d.getMonth() + controle.periodicite_mois);
    return d.toISOString().split("T")[0];
  })();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.30)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 49 }}
      />

      {/* Drawer */}
      <div className="drawer" style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 480,
        backgroundColor: "#FFFFFF",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        boxShadow: "-24px 0 64px rgba(0,0,0,0.12)",
        overflowY: "auto",
      }}>

        {/* ── En-tête ── */}
        <div style={{ padding: "20px 24px 18px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" }}>
              {controle.categorie_nom}
            </p>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: "#1D1D1F", margin: "0 0 10px", lineHeight: 1.35 }}>
              {controle.nom}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {statutBadge(controle.statut)}
              {controle.non_conformites_restantes > 0 && (
                <span style={{ fontSize: 12, fontWeight: 600, color: "#FF3B30", backgroundColor: "#FFF1F0", padding: "3px 10px", borderRadius: 16 }}>
                  {controle.non_conformites_restantes} NC ouverte{controle.non_conformites_restantes > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)", backgroundColor: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <X size={15} color="#6E6E73" />
          </button>
        </div>

        {/* ── Informations ── */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 14px" }}>
            Informations
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
            {[
              { label: "Type", value: controle.type_intervenant || "—" },
              { label: "Périodicité", value: controle.periodicite_mois ? `${controle.periodicite_mois} mois` : "—" },
              { label: "Prestataire", value: controle.prestataire || "—" },
              { label: "Dernière visite", value: formatDate(controle.date_derniere_visite) },
              {
                label: "Prochaine échéance",
                value: formatDate(controle.date_prochaine),
                valueStyle: controle.statut === "retard"
                  ? { color: "#FF3B30", fontWeight: 600 }
                  : controle.statut === "alerte"
                  ? { color: "#FF9500", fontWeight: 600 }
                  : undefined,
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

        {/* ── Formulaire mise à jour ── */}
        <form onSubmit={handleSave} style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 16px" }}>
            Mettre à jour après visite
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Date de visite */}
            <div>
              <label style={labelStyle}>Date de visite</label>
              <input
                type="date"
                value={dateVisite}
                onChange={(e) => setDateVisite(e.target.value)}
                required
                style={fieldStyle}
              />
              {dateProchainePreview && (
                <p style={{ fontSize: 12, color: "#6E6E73", margin: "5px 0 0" }}>
                  Prochaine échéance calculée : <strong>{formatDate(dateProchainePreview)}</strong>
                </p>
              )}
            </div>

            {/* NC */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Non-conformités (total)</label>
                <input
                  type="number"
                  min={0}
                  value={nc}
                  onChange={(e) => setNc(parseInt(e.target.value) || 0)}
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>NC restantes</label>
                <input
                  type="number"
                  min={0}
                  value={ncRest}
                  onChange={(e) => setNcRest(parseInt(e.target.value) || 0)}
                  style={fieldStyle}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Observations, remarques…"
                style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5 }}
              />
            </div>

            {/* Feedback */}
            {saveError && (
              <p style={{ fontSize: 13, color: "#FF3B30", backgroundColor: "#FFF1F0", padding: "10px 12px", borderRadius: 10, margin: 0, border: "1px solid rgba(255,59,48,0.15)" }}>
                {saveError}
              </p>
            )}
            {saveSuccess && (
              <p style={{ fontSize: 13, color: "#34C759", backgroundColor: "#F0FDF4", padding: "10px 12px", borderRadius: 10, margin: 0, border: "1px solid rgba(52,199,89,0.2)" }}>
                Mis à jour avec succès ✓
              </p>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={saving || saveSuccess}
              style={{
                height: 40,
                padding: "0 20px",
                borderRadius: 10,
                border: "none",
                backgroundColor: saveSuccess ? "#34C759" : "#2563EB",
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 600,
                cursor: saving || saveSuccess ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
                boxShadow: saveSuccess ? "0 1px 4px rgba(52,199,89,0.3)" : "0 1px 4px rgba(37,99,235,0.3)",
                transition: "background-color 0.2s",
              }}
            >
              {saving ? "Enregistrement…" : saveSuccess ? "Enregistré ✓" : "Enregistrer la mise à jour"}
            </button>
          </div>
        </form>

        {/* ── Documents joints ── */}
        <div style={{ padding: "20px 24px" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 14px" }}>
            Documents joints
          </p>
          <p style={{ fontSize: 13, color: "#AEAEB2", margin: "0 0 14px" }}>
            Aucun document pour ce contrôle.
          </p>
          <button
            onClick={() => onAddDocument(controle.id)}
            style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.10)", backgroundColor: "#F5F5F7", fontSize: 13, fontWeight: 500, color: "#6E6E73", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <Paperclip size={14} strokeWidth={2} />
            Ajouter un document
          </button>
        </div>

      </div>
    </>
  );
}

// ─── Accordéon catégorie ──────────────────────────────────────────────────────

function CategorieAccordeon({
  categorie,
  onSelect,
  selectedId,
}: {
  categorie: SetCategorie;
  onSelect: (c: SetControle) => void;
  selectedId: string | null;
}) {
  const [open, setOpen] = useState(true);

  const retard = categorie.controles.filter((c) => c.statut === "retard").length;
  const alerte = categorie.controles.filter((c) => c.statut === "alerte").length;
  const Icon = getCategorieIcon(categorie.nom);
  const color = getCategorieColor(categorie.nom);

  return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)", overflow: "hidden" }}>
      {/* En-tête catégorie */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", backgroundColor: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {open ? <ChevronDown size={16} color="#AEAEB2" /> : <ChevronRight size={16} color="#AEAEB2" />}
          <span style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${color}18`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={15} color={color} strokeWidth={2} />
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F" }}>{categorie.nom}</span>
          <span style={{ fontSize: 12, color: "#AEAEB2" }}>({categorie.controles.length})</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {retard > 0 && <Badge variant="danger">{retard} retard{retard > 1 ? "s" : ""}</Badge>}
          {alerte > 0 && <Badge variant="warning">{alerte} alerte{alerte > 1 ? "s" : ""}</Badge>}
        </div>
      </button>

      {/* Lignes contrôles */}
      {open && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          {/* En-tête colonnes — desktop only */}
          <div className="set-table-header" style={{ display: "grid", gridTemplateColumns: "1fr 64px 80px 1fr 100px 100px 90px 40px", gap: 8, padding: "8px 20px", backgroundColor: "#F5F5F7" }}>
            {["Contrôle", "Type", "Périodicité", "Prestataire", "Dernière visite", "Prochaine éch.", "Statut", "NC"].map((h) => (
              <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</span>
            ))}
          </div>

          {categorie.controles.map((controle, i) => (
            <React.Fragment key={controle.id}>
              {/* Desktop row */}
              <button
                className="set-table-row"
                onClick={() => onSelect(controle)}
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "1fr 64px 80px 1fr 100px 100px 90px 40px",
                  gap: 8,
                  padding: "11px 20px",
                  backgroundColor: selectedId === controle.id ? "#EFF6FF" : "transparent",
                  border: "none",
                  borderTop: i > 0 ? "1px solid rgba(0,0,0,0.04)" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  alignItems: "center",
                  transition: "background-color 0.1s",
                }}
                onMouseEnter={(e) => { if (selectedId !== controle.id) (e.currentTarget as HTMLElement).style.backgroundColor = "#F5F5F7"; }}
                onMouseLeave={(e) => { if (selectedId !== controle.id) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 500, color: "#1D1D1F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {controle.nom}
                </span>
                <span>
                  {controle.type_intervenant && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6E6E73", backgroundColor: "#F5F5F7", padding: "2px 8px", borderRadius: 16 }}>
                      {controle.type_intervenant}
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 12.5, color: "#6E6E73" }}>
                  {controle.periodicite_mois ? `${controle.periodicite_mois} mois` : "—"}
                </span>
                <span style={{ fontSize: 12.5, color: "#6E6E73", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {controle.prestataire || "—"}
                </span>
                <span style={{ fontSize: 12.5, color: "#6E6E73" }}>
                  {formatDate(controle.date_derniere_visite)}
                </span>
                <span style={{ fontSize: 12.5, color: controle.statut === "retard" ? "#FF3B30" : controle.statut === "alerte" ? "#FF9500" : "#6E6E73", fontWeight: controle.statut !== "ok" ? 500 : 400 }}>
                  {formatDate(controle.date_prochaine)}
                </span>
                <span>{statutBadge(controle.statut)}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: controle.non_conformites_restantes > 0 ? "#FF3B30" : "#AEAEB2" }}>
                  {controle.non_conformites_restantes > 0 ? controle.non_conformites_restantes : "—"}
                </span>
              </button>

              {/* Mobile card */}
              <button
                className="set-mobile-card"
                onClick={() => onSelect(controle)}
                style={{
                  width: "100%", padding: "12px 16px", backgroundColor: selectedId === controle.id ? "#EFF6FF" : "transparent",
                  border: "none", borderTop: i > 0 ? "1px solid rgba(0,0,0,0.04)" : "none",
                  cursor: "pointer", textAlign: "left",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: "#1D1D1F", flex: 1, lineHeight: 1.35 }}>{controle.nom}</span>
                  {statutBadge(controle.statut)}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "#6E6E73" }}>Éch. <span style={{ fontWeight: controle.statut !== "ok" ? 600 : 400, color: controle.statut === "retard" ? "#FF3B30" : controle.statut === "alerte" ? "#FF9500" : "#6E6E73" }}>{formatDate(controle.date_prochaine)}</span></span>
                  {controle.prestataire && <span style={{ fontSize: 12, color: "#6E6E73" }}>{controle.prestataire}</span>}
                  {controle.non_conformites_restantes > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#FF3B30" }}>{controle.non_conformites_restantes} NC</span>
                  )}
                </div>
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Formulaire nouveau contrôle ─────────────────────────────────────────────

function NewControleSheet({
  categories,
  onClose,
  onCreated,
}: {
  categories: SetCategorie[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [nom, setNom] = useState("");
  const [categorieId, setCategorieId] = useState(categories[0]?.id ?? "");
  const [type, setType] = useState<"BC" | "SA" | "INT">("BC");
  const [periodicite, setPeriodicite] = useState("12");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.10)", fontSize: 14,
    backgroundColor: "#F5F5F7", outline: "none", boxSizing: "border-box",
    fontFamily: "var(--font-inter, system-ui, sans-serif)", color: "#1D1D1F",
  };
  const labelSt: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, color: "#6E6E73",
    letterSpacing: "0.3px", marginBottom: 6,
  };

  async function handleSubmit() {
    if (!nom.trim()) { setError("Le nom est obligatoire."); return; }
    if (!categorieId) { setError("Choisissez une catégorie."); return; }
    const mois = parseInt(periodicite, 10);
    if (!mois || mois < 1) { setError("Périodicité invalide."); return; }
    setSaving(true); setError("");
    try {
      await createSetControle({
        nom: nom.trim(),
        categorie_id: categorieId,
        type_intervenant: type,
        periodicite_mois: mois,
        notes: notes.trim() || null,
      });
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
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={20} color="#8E8E93" />
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: "#FFF1F0", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#FF3B30", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelSt}>NOM DU CONTRÔLE *</label>
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Vérification alarme incendie" style={inputSt} />
          </div>

          <div>
            <label style={labelSt}>CATÉGORIE *</label>
            <select value={categorieId} onChange={(e) => setCategorieId(e.target.value)} style={{ ...inputSt, appearance: "none" }}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelSt}>TYPE</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["BC", "SA", "INT"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600,
                    border: `2px solid ${type === t ? "#2563EB" : "rgba(0,0,0,0.10)"}`,
                    backgroundColor: type === t ? "#EFF6FF" : "#FFFFFF",
                    color: type === t ? "#2563EB" : "#6E6E73",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelSt}>PÉRIODICITÉ (MOIS) *</label>
            <input
              type="number" min="1" max="120"
              value={periodicite}
              onChange={(e) => setPeriodicite(e.target.value)}
              placeholder="12"
              style={inputSt}
            />
          </div>

          <div>
            <label style={labelSt}>NOTES</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Observations, références réglementaires…" style={{ ...inputSt, resize: "vertical" as const }} />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{ width: "100%", padding: "15px", borderRadius: 14, border: "none", backgroundColor: saving ? "#C7C7CC" : "#2563EB", color: "#FFFFFF", fontSize: 16, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", marginTop: 4, boxShadow: "0 2px 10px rgba(37,99,235,0.3)" }}
          >
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
  const [selected, setSelected] = useState<SetControle | null>(null);
  const [exporting, setExporting] = useState(false);
  const [uploadDocControleId, setUploadDocControleId] = useState<string | null>(null);
  const [showNewControle, setShowNewControle] = useState(false);

  async function handleExportPDF() {
    if (!categories) return;
    setExporting(true);
    try {
      await exportPDF(categories);
    } finally {
      setExporting(false);
    }
  }

  function load() {
    fetchSetCategories().then(setCategories);
  }

  useEffect(() => { load(); }, []);

  function handleUpdated() {
    setSelected(null);
    load();
  }

  const categoriesFiltrees = useMemo(() => {
    if (!categories) return null;
    if (filtre === "tous") return categories;
    return categories
      .map((cat) => ({ ...cat, controles: cat.controles.filter((c) => c.statut === filtre) }))
      .filter((cat) => cat.controles.length > 0);
  }, [categories, filtre]);

  const totalControles = categories?.reduce((s, c) => s + c.controles.length, 0) ?? 0;

  const counts = useMemo(() => {
    if (!categories) return { retard: 0, alerte: 0, ok: 0 };
    const all = categories.flatMap((c) => c.controles);
    return {
      retard: all.filter((c) => c.statut === "retard").length,
      alerte: all.filter((c) => c.statut === "alerte").length,
      ok: all.filter((c) => c.statut === "ok").length,
    };
  }, [categories]);

  return (
    <>
      <Header title="Contrôles SET" subtitle="Sofitel Ajaccio" />

      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Titre + Actions */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", margin: 0, lineHeight: 1.2, letterSpacing: "-0.5px" }}>
              Registre réglementaire
            </h1>
            {categories !== null && (
              <p style={{ fontSize: 13, color: "#AEAEB2", margin: "4px 0 0" }}>
                {totalControles} contrôle{totalControles > 1 ? "s" : ""} · {categories.length} catégorie{categories.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleExportPDF}
              disabled={exporting || !categories}
              style={{ height: 36, padding: "0 16px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.10)", backgroundColor: "#FFFFFF", fontSize: 13, fontWeight: 500, color: exporting ? "#AEAEB2" : "#6E6E73", cursor: exporting || !categories ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", opacity: exporting ? 0.7 : 1 }}
            >
              <FileDown size={15} strokeWidth={2} />
              {exporting ? "Génération…" : "Export PDF"}
            </button>
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

        {/* Filtre pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {filtres.map(({ key, label }) => {
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
        </div>

        {/* Contenu */}
        {categories === null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[180, 220, 160].map((h, i) => (
              <div key={i} style={{ height: h, borderRadius: 16, backgroundColor: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)" }} />
            ))}
          </div>
        ) : categoriesFiltrees!.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle size={28} color="#2563EB" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>
              {filtre === "tous" ? "Aucun contrôle SET configuré" : "Aucun contrôle dans ce statut"}
            </p>
            <p style={{ fontSize: 14, color: "#AEAEB2", margin: 0, textAlign: "center" }}>
              {filtre === "tous" ? "Importez les données réglementaires de l'hôtel pour commencer." : "Tous les contrôles sont dans un autre état."}
            </p>
            {filtre === "tous" && (
              <button style={{ marginTop: 4, height: 38, padding: "0 20px", borderRadius: 10, border: "none", backgroundColor: "#2563EB", color: "#FFFFFF", fontSize: 13.5, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 4px rgba(37,99,235,0.3)" }}>
                + Importer les données H0587
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {categoriesFiltrees!.map((cat) => (
              <CategorieAccordeon
                key={cat.id}
                categorie={cat}
                onSelect={setSelected}
                selectedId={selected?.id ?? null}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      {selected && (
        <DetailDrawer
          controle={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onAddDocument={(id) => setUploadDocControleId(id)}
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
