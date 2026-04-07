"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  MoreHorizontal,
  Flame,
  Droplets,
  Zap,
  Wind,
  ArrowUpDown,
  ShieldAlert,
  Waves,
  UtensilsCrossed,
  Wrench,
  Camera,
  Thermometer,
  Refrigerator,
  Paperclip,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";
import UploadDocumentModal from "@/components/ui/UploadDocumentModal";
import {
  fetchEquipements,
  fetchEquipementInterventions,
  fetchNCByEquipement,
  createEquipement,
  updateEquipement,
  updateEquipementStatut,
  deleteEquipement,
  type EquipementRecord,
  type EquipementStatut,
} from "@/lib/supabase";

// ─── Category ordering & icons ────────────────────────────────────────────────

const CATEGORY_ORDER = [
  "Incendie",
  "CVC",
  "Plomberie",
  "Électricité",
  "Ascenseurs",
  "Sécurité",
  "Piscine",
  "Restauration",
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Incendie:    <Flame       size={14} color="#FF3B30" />,
  Plomberie:   <Droplets    size={14} color="#2563EB" />,
  Électricité: <Zap         size={14} color="#FF9500" />,
  CVC:         <Wind        size={14} color="#5856D6" />,
  Ascenseurs:  <ArrowUpDown size={14} color="#34C759" />,
  Sécurité:    <ShieldAlert size={14} color="#FF2D55" />,
  Piscine:     <Waves       size={14} color="#32ADE6" />,
  Restauration:<UtensilsCrossed size={14} color="#AF52DE" />,
  Thermique:   <Thermometer size={14} color="#FF6B35" />,
  Froid:       <Refrigerator size={14} color="#00C7BE" />,
};

function catIcon(cat: string) {
  return CATEGORY_ICONS[cat] ?? <Wrench size={14} color="#8E8E93" />;
}

function sortCategories(cats: string[]): string[] {
  return [...cats].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, "fr");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUT_CFG: Record<EquipementStatut, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  ok:        { label: "Opérationnel", variant: "success" },
  surveiller:{ label: "À surveiller", variant: "warning" },
  critique:  { label: "Critique",     variant: "danger"  },
  inactif:   { label: "Inactif",      variant: "default" },
};

function statutBadge(s: EquipementStatut) {
  const cfg = STATUT_CFG[s];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
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
  boxSizing: "border-box",
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Filtre = "tous" | "critique" | "surveiller" | "ok";

const FILTRES: { key: Filtre; label: string }[] = [
  { key: "tous",       label: "Tous"          },
  { key: "critique",   label: "Critique"      },
  { key: "surveiller", label: "À surveiller"  },
  { key: "ok",         label: "Opérationnel"  },
];

// ─── Detail Drawer ────────────────────────────────────────────────────────────

type Intervention = { id: string; titre: string; statut: string; created_at: string };

function DetailDrawer({
  eq,
  onClose,
  onStatutChange,
  onAddDocument,
  onEdited,
  onDeleted,
}: {
  eq: EquipementRecord;
  onClose: () => void;
  onStatutChange: (id: string, s: EquipementStatut) => void;
  onAddDocument: (equipementId: string) => void;
  onEdited: () => void;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loadingInt, setLoadingInt] = useState(true);
  const [ncs, setNcs] = useState<{ id: string; description: string; gravite: "majeure" | "mineure"; statut: "ouverte" | "levee"; date_cible: string | null; controle_nom: string | null }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchEquipementInterventions(eq.id)
      .then(setInterventions)
      .catch(() => {})
      .finally(() => setLoadingInt(false));
    fetchNCByEquipement(eq.id).then(setNcs).catch(() => {});
  }, [eq.id]);

  async function handleStatut(s: EquipementStatut) {
    if (s === eq.statut) return;
    setSaving(true);
    try {
      await updateEquipementStatut(eq.id, s);
      onStatutChange(eq.id, s);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1800);
    } finally {
      setSaving(false);
    }
  }

  const STATUTS: EquipementStatut[] = ["ok", "surveiller", "critique", "inactif"];

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.30)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 49 }}
      />
      <div
        style={{
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
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 18px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" }}>
              {eq.categorie}{eq.sous_categorie ? ` · ${eq.sous_categorie}` : ""}
            </p>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: "#1D1D1F", margin: "0 0 10px", lineHeight: 1.35 }}>
              {eq.nom}
            </h2>
            {statutBadge(eq.statut)}
          </div>
          <button
            onClick={onClose}
            style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)", backgroundColor: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <X size={15} color="#6E6E73" />
          </button>
        </div>

        {/* Informations */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 14px" }}>
            Informations
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
            {[
              { label: "Zone",             value: eq.zone             || "—" },
              { label: "Marque",           value: eq.marque           || "—" },
              { label: "Modèle",           value: eq.modele           || "—" },
              { label: "N° série",         value: eq.numero_serie     || "—" },
              { label: "Date installation",value: eq.date_installation || "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={labelStyle}>{label}</p>
                <p style={{ fontSize: 14, color: "#1D1D1F", margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
          {eq.notes && (
            <div style={{ marginTop: 14 }}>
              <p style={labelStyle}>Notes</p>
              <p style={{ fontSize: 14, color: "#6E6E73", margin: 0, lineHeight: 1.5 }}>{eq.notes}</p>
            </div>
          )}
        </div>

        {/* Modifier statut */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 14px" }}>
            Modifier le statut
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {STATUTS.map((s) => {
              const cfg = STATUT_CFG[s];
              const active = eq.statut === s;
              const variantColors: Record<string, { bg: string; color: string; border: string }> = {
                success: { bg: "#F0FDF4", color: "#34C759", border: "rgba(52,199,89,0.4)"  },
                warning: { bg: "#FFF5E6", color: "#FF9500", border: "rgba(255,149,0,0.4)"  },
                danger:  { bg: "#FFF1F0", color: "#FF3B30", border: "rgba(255,59,48,0.4)"  },
                default: { bg: "#F5F5F7", color: "#8E8E93", border: "rgba(0,0,0,0.12)"      },
              };
              const vc = variantColors[cfg.variant];
              return (
                <button
                  key={s}
                  disabled={saving || active}
                  onClick={() => handleStatut(s)}
                  style={{
                    height: 32,
                    padding: "0 14px",
                    borderRadius: 99,
                    border: active ? `1.5px solid ${vc.border}` : "1px solid rgba(0,0,0,0.10)",
                    backgroundColor: active ? vc.bg : "#FFFFFF",
                    color: active ? vc.color : "#6E6E73",
                    fontWeight: active ? 600 : 400,
                    fontSize: 13,
                    cursor: active ? "default" : "pointer",
                    opacity: saving ? 0.6 : 1,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
          {saveSuccess && (
            <p style={{ fontSize: 13, color: "#34C759", backgroundColor: "#F0FDF4", padding: "8px 12px", borderRadius: 10, margin: "12px 0 0", border: "1px solid rgba(52,199,89,0.2)" }}>
              Statut mis à jour ✓
            </p>
          )}
        </div>

        {/* Dernières interventions */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 14px" }}>
            Dernières interventions
          </p>
          {loadingInt ? (
            <p style={{ fontSize: 13, color: "#AEAEB2", margin: 0 }}>Chargement…</p>
          ) : interventions.length === 0 ? (
            <p style={{ fontSize: 13, color: "#AEAEB2", margin: 0 }}>Aucune intervention enregistrée</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid rgba(0,0,0,0.06)", borderRadius: 10, overflow: "hidden" }}>
              {interventions.map((int, i) => (
                <div
                  key={int.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 14px",
                    borderTop: i > 0 ? "1px solid rgba(0,0,0,0.05)" : "none",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: "#1D1D1F" }}>{int.titre}</span>
                  <Badge variant={int.statut === "terminee" ? "success" : "warning"}>
                    {int.statut === "terminee" ? "Terminée" : "En cours"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Non-conformités liées */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", textTransform: "uppercase", letterSpacing: "0.6px", margin: 0 }}>
              Non-conformités
            </p>
            {ncs.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: ncs.some(n => n.gravite === "majeure" && n.statut === "ouverte") ? "#FF3B30" : "#6E6E73", backgroundColor: ncs.some(n => n.gravite === "majeure" && n.statut === "ouverte") ? "#FF3B3012" : "#F5F5F7", padding: "2px 8px", borderRadius: 10 }}>
                {ncs.length} NC · {ncs.filter(n => n.statut === "ouverte").length} ouverte{ncs.filter(n => n.statut === "ouverte").length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {ncs.length === 0 ? (
            <p style={{ fontSize: 13, color: "#AEAEB2", margin: 0 }}>Aucune NC liée à cet équipement</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid rgba(0,0,0,0.06)", borderRadius: 10, overflow: "hidden" }}>
              {ncs.map((nc, i) => (
                <div key={nc.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderTop: i > 0 ? "1px solid rgba(0,0,0,0.05)" : "none", backgroundColor: "#FFFFFF" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 8, backgroundColor: nc.gravite === "majeure" ? "#FF3B3015" : "#FF950015", color: nc.gravite === "majeure" ? "#FF3B30" : "#FF9500", flexShrink: 0 }}>
                    {nc.gravite === "majeure" ? "MAJ" : "MIN"}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, color: "#1D1D1F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nc.description}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 8, backgroundColor: nc.statut === "ouverte" ? "#FF3B3015" : "#34C75915", color: nc.statut === "ouverte" ? "#FF3B30" : "#34C759", flexShrink: 0 }}>
                    {nc.statut === "ouverte" ? "Ouverte" : "Levée"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents joints */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 14px" }}>
            Documents joints
          </p>
          <button
            onClick={() => onAddDocument(eq.id)}
            style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.10)", backgroundColor: "#F5F5F7", fontSize: 13, fontWeight: 500, color: "#6E6E73", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <Paperclip size={14} strokeWidth={2} />
            Ajouter un document
          </button>
        </div>

        {/* Actions */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => router.push("/interventions")}
            style={{ width: "100%", height: 40, borderRadius: 10, border: "none", backgroundColor: "#2563EB", color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 4px rgba(37,99,235,0.3)" }}
          >
            Créer une intervention
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowEdit(true)}
              style={{ flex: 1, height: 38, borderRadius: 10, border: "1px solid rgba(0,0,0,0.10)", backgroundColor: "#FFFFFF", fontSize: 13, fontWeight: 600, color: "#2563EB", cursor: "pointer" }}
            >
              Modifier
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ flex: 1, height: 38, borderRadius: 10, border: "1px solid rgba(255,59,48,0.3)", backgroundColor: "#FFF1F0", fontSize: 13, fontWeight: 600, color: "#FF3B30", cursor: "pointer" }}
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation suppression */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 28, width: 320, boxShadow: "0 24px 64px rgba(0,0,0,0.15)" }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#1D1D1F", margin: "0 0 8px" }}>Supprimer l&apos;équipement ?</p>
            <p style={{ fontSize: 14, color: "#6E6E73", margin: "0 0 24px", lineHeight: 1.5 }}>
              Cette action est irréversible. L&apos;équipement <strong>{eq.nom}</strong> sera définitivement supprimé.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ flex: 1, height: 44, borderRadius: 12, border: "1px solid rgba(0,0,0,0.10)", backgroundColor: "#FFFFFF", fontSize: 15, fontWeight: 600, cursor: "pointer", color: "#1D1D1F" }}
              >
                Annuler
              </button>
              <button
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await deleteEquipement(eq.id);
                    onDeleted();
                  } catch { setDeleting(false); }
                }}
                style={{ flex: 1, height: 44, borderRadius: 12, border: "none", backgroundColor: "#FF3B30", fontSize: 15, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer", color: "#FFFFFF", opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? "…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sheet modification */}
      {showEdit && (
        <EditSheet
          eq={eq}
          onClose={() => setShowEdit(false)}
          onUpdated={() => { setShowEdit(false); onEdited(); }}
        />
      )}
    </>
  );
}

// ─── Edit Sheet ───────────────────────────────────────────────────────────────

function EditSheet({ eq, onClose, onUpdated }: { eq: EquipementRecord; onClose: () => void; onUpdated: () => void }) {
  const [nom, setNom] = useState(eq.nom);
  const [categorie, setCategorie] = useState(eq.categorie);
  const [sousCat, setSousCat] = useState(eq.sous_categorie ?? "");
  const [zone, setZone] = useState(eq.zone ?? "");
  const [marque, setMarque] = useState(eq.marque ?? "");
  const [modele, setModele] = useState(eq.modele ?? "");
  const [serie, setSerie] = useState(eq.numero_serie ?? "");
  const [statut, setStatut] = useState<EquipementStatut>(eq.statut);
  const [notes, setNotes] = useState(eq.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!nom.trim()) { setError("Le nom est requis."); return; }
    setSaving(true); setError("");
    try {
      await updateEquipement(eq.id, {
        nom: nom.trim(), categorie, sous_categorie: sousCat.trim() || null,
        zone: zone.trim() || null, marque: marque.trim() || null,
        modele: modele.trim() || null, numero_serie: serie.trim() || null,
        statut, notes: notes.trim() || null,
      });
      onUpdated();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? "Erreur inconnue");
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: "#FFFFFF", borderRadius: "24px 24px 0 0", maxHeight: "90vh", overflowY: "auto", padding: "0 20px 48px" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#C7C7CC" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F", margin: 0 }}>Modifier l&apos;équipement</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color="#8E8E93" /></button>
        </div>
        {error && <p style={{ fontSize: 13, color: "#FF3B30", marginBottom: 12 }}>{error}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "NOM *", value: nom, set: setNom },
            { label: "ZONE", value: zone, set: setZone },
            { label: "MARQUE", value: marque, set: setMarque },
            { label: "MODÈLE", value: modele, set: setModele },
            { label: "N° SÉRIE", value: serie, set: setSerie },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label style={labelStyle}>{label}</label>
              <input value={value} onChange={(e) => set(e.target.value)} style={fieldStyle} />
            </div>
          ))}
          <div>
            <label style={labelStyle}>CATÉGORIE</label>
            <select value={categorie} onChange={(e) => setCategorie(e.target.value)} style={fieldStyle}>
              {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>SOUS-CATÉGORIE</label>
            <input value={sousCat} onChange={(e) => setSousCat(e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>STATUT</label>
            <select value={statut} onChange={(e) => setStatut(e.target.value as EquipementStatut)} style={fieldStyle}>
              <option value="ok">Opérationnel</option>
              <option value="surveiller">À surveiller</option>
              <option value="critique">Critique</option>
              <option value="inactif">Inactif</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>NOTES</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...fieldStyle, resize: "vertical" }} />
          </div>
          <button
            onClick={handleSubmit} disabled={saving}
            style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", backgroundColor: saving ? "#C7C7CC" : "#2563EB", color: "#FFFFFF", fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Sheet ────────────────────────────────────────────────────────────────

const ALL_CATEGORIES = [
  "Incendie", "Plomberie", "Électricité", "CVC",
  "Ascenseurs", "Sécurité", "Piscine", "Restauration", "Autre",
];

function AddSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState(ALL_CATEGORIES[0]);
  const [sousCat, setSousCat] = useState("");
  const [zone, setZone] = useState("");
  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [serie, setSerie] = useState("");
  const [installation, setInstallation] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    if (!nom.trim()) { setError("Le nom est requis."); return; }
    setSaving(true);
    setError("");
    try {
      await createEquipement(
        {
          nom: nom.trim(),
          categorie,
          sous_categorie: sousCat.trim() || undefined,
          zone: zone.trim() || undefined,
          marque: marque.trim() || undefined,
          modele: modele.trim() || undefined,
          numero_serie: serie.trim() || undefined,
          date_installation: installation || undefined,
          statut: "ok" as EquipementStatut,
          notes: notes.trim() || undefined,
        },
        photo ?? undefined,
      );
      onCreated();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? "Erreur inconnue");
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }} />
      <div
        style={{
          position: "relative",
          background: "#F5F5F7",
          borderRadius: "20px 20px 0 0",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "0 20px 48px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#C7C7CC" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F" }}>Nouvel équipement</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={22} color="#8E8E93" />
          </button>
        </div>

        {error && (
          <div style={{ background: "#FFF1F0", color: "#FF3B30", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Nom *</label>
            <input style={fieldStyle} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Extincteur RDC" />
          </div>
          <div>
            <label style={labelStyle}>Catégorie</label>
            <select style={fieldStyle} value={categorie} onChange={(e) => setCategorie(e.target.value)}>
              {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Sous-catégorie</label>
            <input style={fieldStyle} value={sousCat} onChange={(e) => setSousCat(e.target.value)} placeholder="Optionnel" />
          </div>
          <div>
            <label style={labelStyle}>Zone / Emplacement</label>
            <input style={fieldStyle} value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ex : Couloir RDC" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Marque</label>
              <input style={fieldStyle} value={marque} onChange={(e) => setMarque(e.target.value)} placeholder="Ex : Legrand" />
            </div>
            <div>
              <label style={labelStyle}>Modèle</label>
              <input style={fieldStyle} value={modele} onChange={(e) => setModele(e.target.value)} placeholder="Ex : XR400" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Numéro de série</label>
            <input style={fieldStyle} value={serie} onChange={(e) => setSerie(e.target.value)} placeholder="Optionnel" />
          </div>
          <div>
            <label style={labelStyle}>Date d&apos;installation</label>
            <input style={fieldStyle} type="date" value={installation} onChange={(e) => setInstallation(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...fieldStyle, minHeight: 72, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informations complémentaires…" />
          </div>
          <div>
            <label style={labelStyle}>Photo (optionnel)</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F5F5F7", borderRadius: 10, cursor: "pointer", border: "1px solid rgba(0,0,0,0.10)" }}
            >
              <Camera size={16} color="#8E8E93" />
              <span style={{ fontSize: 14, color: photo ? "#1D1D1F" : "#AEAEB2" }}>
                {photo ? photo.name : "Choisir une photo"}
              </span>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            marginTop: 24, width: "100%", height: 44, borderRadius: 12,
            border: "none", backgroundColor: saving ? "#C7C7CC" : "#2563EB",
            color: "#fff", fontWeight: 700, fontSize: 15,
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow: saving ? "none" : "0 1px 4px rgba(37,99,235,0.3)",
          }}
        >
          {saving ? "Enregistrement…" : "Ajouter l'équipement"}
        </button>
      </div>
    </div>
  );
}

// ─── Accordéon catégorie ──────────────────────────────────────────────────────

function CategorieAccordeon({
  categorie,
  equipements,
  onSelect,
  selectedId,
}: {
  categorie: string;
  equipements: EquipementRecord[];
  onSelect: (e: EquipementRecord) => void;
  selectedId: string | null;
}) {
  const [open, setOpen] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const critiques  = equipements.filter((e) => e.statut === "critique").length;
  const asurveiller = equipements.filter((e) => e.statut === "surveiller").length;

  const COLS = "minmax(180px,2fr) 120px 160px 130px 36px";

  return (
    <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)", overflow: "hidden" }}>
      {/* En-tête catégorie */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", backgroundColor: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {open
            ? <ChevronDown  size={16} color="#AEAEB2" />
            : <ChevronRight size={16} color="#AEAEB2" />
          }
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            {catIcon(categorie)}
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F" }}>{categorie}</span>
          </span>
          <span style={{ fontSize: 12, color: "#AEAEB2" }}>({equipements.length})</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {critiques   > 0 && <Badge variant="danger" >{critiques}   critique{critiques   > 1 ? "s" : ""}</Badge>}
          {asurveiller > 0 && <Badge variant="warning">{asurveiller} alerte{asurveiller > 1 ? "s" : ""}</Badge>}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          {/* Header colonnes */}
          <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "8px 20px", backgroundColor: "#F5F5F7" }}>
            {["Équipement", "Zone", "Marque / Modèle", "Statut", ""].map((h) => (
              <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</span>
            ))}
          </div>

          {equipements.map((eq, i) => (
            <div
              key={eq.id}
              style={{
                display: "grid",
                gridTemplateColumns: COLS,
                gap: 8,
                padding: "11px 20px",
                backgroundColor: selectedId === eq.id ? "#EFF6FF" : "transparent",
                borderTop: i > 0 ? "1px solid rgba(0,0,0,0.04)" : "none",
                alignItems: "center",
                cursor: "pointer",
                transition: "background-color 0.1s",
              }}
              onClick={() => { setMenuOpenId(null); onSelect(eq); }}
              onMouseEnter={(e) => { if (selectedId !== eq.id) (e.currentTarget as HTMLElement).style.backgroundColor = "#F5F5F7"; }}
              onMouseLeave={(e) => { if (selectedId !== eq.id) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            >
              {/* Nom */}
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ flexShrink: 0 }}>{catIcon(categorie)}</span>
                <span style={{ fontSize: 13.5, fontWeight: 500, color: "#1D1D1F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {eq.nom}
                </span>
              </span>

              {/* Zone */}
              <span style={{ fontSize: 12.5, color: "#6E6E73", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {eq.zone || "—"}
              </span>

              {/* Marque / Modèle */}
              <span style={{ fontSize: 12.5, color: "#6E6E73", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {[eq.marque, eq.modele].filter(Boolean).join(" · ") || "—"}
              </span>

              {/* Statut */}
              <span>{statutBadge(eq.statut)}</span>

              {/* Actions */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={(evt) => { evt.stopPropagation(); setMenuOpenId(menuOpenId === eq.id ? null : eq.id); }}
                  style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(0,0,0,0.08)", backgroundColor: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <MoreHorizontal size={14} color="#6E6E73" />
                </button>
                {menuOpenId === eq.id && (
                  <div
                    style={{ position: "absolute", right: 0, top: 32, zIndex: 10, backgroundColor: "#FFFFFF", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.14)", border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden", minWidth: 170 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {[
                      { label: "Voir le détail", action: () => { setMenuOpenId(null); onSelect(eq); } },
                      { label: "Créer une intervention", action: () => setMenuOpenId(null) },
                    ].map(({ label, action }) => (
                      <button
                        key={label}
                        onClick={action}
                        style={{ width: "100%", display: "block", padding: "10px 16px", border: "none", backgroundColor: "transparent", textAlign: "left", fontSize: 13.5, fontWeight: 400, color: "#1D1D1F", cursor: "pointer" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5F5F7")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function EquipementsPage() {
  const [equipements, setEquipements] = useState<EquipementRecord[] | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [selected, setSelected] = useState<EquipementRecord | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [uploadDocEquipementId, setUploadDocEquipementId] = useState<string | null>(null);

  async function load() {
    const data = await fetchEquipements();
    setEquipements(data);
  }

  useEffect(() => { load(); }, []);

  // KPIs
  const total       = equipements?.length ?? 0;
  const critiques   = equipements?.filter((e) => e.statut === "critique").length ?? 0;
  const asurveiller = equipements?.filter((e) => e.statut === "surveiller").length ?? 0;

  const counts = { tous: total, critique: critiques, surveiller: asurveiller, ok: (equipements?.filter((e) => e.statut === "ok").length ?? 0) };

  // Groupement par catégorie
  const grouped = useMemo(() => {
    if (!equipements) return null;
    const filtered = filtre === "tous" ? equipements : equipements.filter((e) => e.statut === filtre);
    const map = new Map<string, EquipementRecord[]>();
    for (const eq of filtered) {
      if (!map.has(eq.categorie)) map.set(eq.categorie, []);
      map.get(eq.categorie)!.push(eq);
    }
    const cats = sortCategories(Array.from(map.keys()));
    return cats.map((cat) => ({ cat, items: map.get(cat)! }));
  }, [equipements, filtre]);

  const nbCategories = grouped?.length ?? 0;

  function handleStatutChange(id: string, statut: EquipementStatut) {
    setEquipements((prev) => prev ? prev.map((e) => e.id === id ? { ...e, statut } : e) : prev);
    setSelected((prev) => prev?.id === id ? { ...prev, statut } : prev);
  }

  return (
    <>
      <Header title="Équipements" subtitle="Sofitel Ajaccio" />

      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Titre + bouton */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px", color: "#1D1D1F", margin: 0, lineHeight: 1.2 }}>
              Équipements
            </h1>
            {equipements !== null && (
              <p style={{ fontSize: 13, color: "#AEAEB2", margin: "4px 0 0" }}>
                {total} équipement{total > 1 ? "s" : ""} · {nbCategories} catégorie{nbCategories > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            style={{ height: 36, padding: "0 16px", borderRadius: 10, border: "none", backgroundColor: "#2563EB", fontSize: 13, fontWeight: 500, color: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 4px rgba(37,99,235,0.3)" }}
          >
            <Plus size={15} strokeWidth={2.5} />
            Ajouter
          </button>
        </div>

        {/* KPI */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Total équipements", value: total,       color: "#1D1D1F" },
            { label: "Critiques",         value: critiques,   color: "#FF3B30" },
            { label: "À surveiller",      value: asurveiller, color: "#FF9500" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)" }}
            >
              <p style={{ fontSize: 32, fontWeight: 700, color, margin: 0 }}>{value}</p>
              <p style={{ fontSize: 12, color: "#AEAEB2", margin: "4px 0 0" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTRES.map(({ key, label }) => {
            const active = filtre === key;
            const count = counts[key];
            return (
              <button
                key={key}
                onClick={() => setFiltre(key)}
                style={{ height: 32, padding: "0 14px", borderRadius: 99, border: active ? "none" : "1px solid rgba(0,0,0,0.10)", backgroundColor: active ? "#2563EB" : "#FFFFFF", color: active ? "#FFFFFF" : "#6E6E73", fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: active ? "0 1px 4px rgba(37,99,235,0.25)" : "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                {label}
                {equipements !== null && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 99, backgroundColor: active ? "rgba(255,255,255,0.25)" : "#F5F5F7", color: active ? "#FFFFFF" : "#AEAEB2", minWidth: 20, textAlign: "center" }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contenu */}
        {grouped === null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[200, 240, 180].map((h, i) => (
              <div key={i} style={{ height: h, borderRadius: 16, backgroundColor: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)" }} />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", gap: 16 }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>
              Aucun équipement dans ce statut
            </p>
            <p style={{ fontSize: 14, color: "#AEAEB2", margin: 0 }}>
              Sélectionnez un autre filtre ou ajoutez des équipements.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {grouped.map(({ cat, items }) => (
              <CategorieAccordeon
                key={cat}
                categorie={cat}
                equipements={items}
                onSelect={setSelected}
                selectedId={selected?.id ?? null}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drawer détail */}
      {selected && (
        <DetailDrawer
          eq={selected}
          onClose={() => setSelected(null)}
          onStatutChange={handleStatutChange}
          onAddDocument={(id) => setUploadDocEquipementId(id)}
          onEdited={() => { setSelected(null); load(); }}
          onDeleted={() => { setSelected(null); load(); }}
        />
      )}

      {/* Add sheet */}
      {showAdd && (
        <AddSheet
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); load(); }}
        />
      )}

      {/* Modal upload document */}
      {uploadDocEquipementId && (
        <UploadDocumentModal
          initialEquipementId={uploadDocEquipementId}
          onClose={() => setUploadDocEquipementId(null)}
          onUploaded={() => setUploadDocEquipementId(null)}
        />
      )}
    </>
  );
}
