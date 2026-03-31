"use client";

import { useEffect, useState, useMemo } from "react";
import { FileText, Image as ImageIcon, File as FileIcon, Download, Trash2, Plus } from "lucide-react";
import Header from "@/components/layout/Header";
import Badge from "@/components/ui/Badge";
import UploadDocumentModal from "@/components/ui/UploadDocumentModal";
import {
  fetchDocuments,
  getDocumentSignedUrl,
  deleteDocument,
  type DocType,
  type DocumentRecord,
} from "@/lib/supabase";

// ─── Types / helpers ──────────────────────────────────────────────────────────

type Filtre = "tous" | DocType;

const FILTRES: { key: Filtre; label: string }[] = [
  { key: "tous",         label: "Tous" },
  { key: "rapport",      label: "Rapports" },
  { key: "attestation",  label: "Attestations" },
  { key: "registre",     label: "Registres" },
  { key: "photo",        label: "Photos" },
  { key: "autre",        label: "Autres" },
];

const TYPE_LABELS: Record<DocType, string> = {
  rapport:     "Rapport",
  attestation: "Attestation",
  registre:    "Registre",
  photo:       "Photo",
  autre:       "Autre",
};

const TYPE_BADGE_VARIANT: Record<DocType, "danger" | "info" | "warning" | "success" | "default"> = {
  rapport:     "danger",
  attestation: "success",
  registre:    "warning",
  photo:       "info",
  autre:       "default",
};

function DocIcon({ type, fichierNom }: { type: DocType; fichierNom: string | null }) {
  const ext = (fichierNom ?? "").split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["jpg", "jpeg", "png", "webp"].includes(ext) || type === "photo";
  if (isImage) return <ImageIcon size={16} color="#2563EB" />;
  return <FileText size={16} color="#FF3B30" />;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function formatTaille(ko: number | null) {
  if (ko === null) return "—";
  if (ko < 1024) return `${ko} Ko`;
  return `${(ko / 1024).toFixed(1)} Mo`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [showUpload, setShowUpload] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DocumentRecord | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchDocuments();
      setDocuments(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDownload(doc: DocumentRecord) {
    setDownloading(doc.id);
    try {
      const url = await getDocumentSignedUrl(doc.fichier_url);
      window.open(url, "_blank");
    } catch (e) {
      console.error("Download error:", e);
    } finally {
      setDownloading(null);
    }
  }

  async function handleDelete(doc: DocumentRecord) {
    setDeleting(doc.id);
    try {
      await deleteDocument(doc.id, doc.fichier_url);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (e) {
      console.error("Delete error:", e);
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  const filtered = useMemo(() => {
    if (filtre === "tous") return documents;
    return documents.filter((d) => d.type === filtre);
  }, [documents, filtre]);

  // KPIs
  const total = documents.length;
  const rapports = documents.filter((d) => d.type === "rapport").length;
  const attestations = documents.filter((d) => d.type === "attestation").length;

  const countByType = useMemo(() => {
    const counts: Partial<Record<Filtre, number>> = { tous: total };
    for (const key of ["rapport", "attestation", "registre", "photo", "autre"] as DocType[]) {
      counts[key] = documents.filter((d) => d.type === key).length;
    }
    return counts;
  }, [documents, total]);

  return (
    <>
      <Header title="Documents" subtitle="Sofitel Ajaccio" />

      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Titre + Actions */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F", margin: 0, lineHeight: 1.2 }}>
              Documents
            </h1>
            <p style={{ fontSize: 13, color: "#AEAEB2", margin: "4px 0 0" }}>
              {total} document{total > 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            style={{ height: 36, padding: "0 16px", borderRadius: 10, border: "none", backgroundColor: "#2563EB", fontSize: 13, fontWeight: 500, color: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 4px rgba(37,99,235,0.3)" }}
          >
            <Plus size={15} strokeWidth={2.5} />
            Ajouter un document
          </button>
        </div>

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Total", value: total,        color: "#2563EB", bg: "#EFF6FF" },
            { label: "Rapports", value: rapports,      color: "#FF3B30", bg: "#FFF1F0" },
            { label: "Attestations", value: attestations, color: "#34C759", bg: "#F0FDF4" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)" }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px" }}>{label}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color }}>{value}</span>
                </div>
                <span style={{ fontSize: 28, fontWeight: 700, color: "#1D1D1F" }}>{value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Filtre pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTRES.map(({ key, label }) => {
            const active = filtre === key;
            const count = countByType[key] ?? 0;
            return (
              <button
                key={key}
                onClick={() => setFiltre(key)}
                style={{ height: 32, padding: "0 14px", borderRadius: 99, border: active ? "none" : "1px solid rgba(0,0,0,0.10)", backgroundColor: active ? "#2563EB" : "#FFFFFF", color: active ? "#FFFFFF" : "#6E6E73", fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: active ? "0 1px 4px rgba(37,99,235,0.25)" : "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                {label}
                <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 99, backgroundColor: active ? "rgba(255,255,255,0.25)" : "#F5F5F7", color: active ? "#FFFFFF" : "#AEAEB2", minWidth: 20, textAlign: "center" }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Liste */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 52, borderRadius: 12, backgroundColor: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileIcon size={28} color="#2563EB" strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1D1D1F", margin: 0 }}>
              {filtre === "tous" ? "Aucun document" : "Aucun document dans cette catégorie"}
            </p>
            <p style={{ fontSize: 14, color: "#AEAEB2", margin: 0, textAlign: "center" }}>
              Utilisez le bouton + pour ajouter votre premier document.
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.04)", overflow: "hidden" }}>
            {/* En-tête tableau */}
            <div style={{ display: "grid", gridTemplateColumns: "32px 2fr 110px 160px 160px 100px 110px 90px 72px", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)", backgroundColor: "#F5F5F7" }}>
              {["", "Document", "Type", "Contrôle SET", "Équipement", "Zone", "Date", "Taille", ""].map((h, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 600, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</span>
              ))}
            </div>

            {filtered.map((doc, idx) => (
              <div
                key={doc.id}
                style={{ display: "grid", gridTemplateColumns: "32px 2fr 110px 160px 160px 100px 110px 90px 72px", alignItems: "center", padding: "12px 16px", borderTop: idx > 0 ? "1px solid rgba(0,0,0,0.05)" : "none", backgroundColor: "#FFFFFF" }}
              >
                {/* Icône */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <DocIcon type={doc.type} fichierNom={doc.fichier_nom} />
                </div>

                {/* Nom */}
                <div style={{ minWidth: 0, paddingRight: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#1D1D1F", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {doc.nom}
                  </p>
                  {doc.fichier_nom && doc.fichier_nom !== doc.nom && (
                    <p style={{ fontSize: 11, color: "#AEAEB2", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {doc.fichier_nom}
                    </p>
                  )}
                </div>

                {/* Type badge */}
                <div>
                  <Badge variant={TYPE_BADGE_VARIANT[doc.type]}>
                    {TYPE_LABELS[doc.type]}
                  </Badge>
                </div>

                {/* SET */}
                <span style={{ fontSize: 13, color: doc.set_controle_nom ? "#1D1D1F" : "#AEAEB2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.set_controle_nom ?? "—"}
                </span>

                {/* Équipement */}
                <span style={{ fontSize: 13, color: doc.equipement_nom ? "#1D1D1F" : "#AEAEB2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.equipement_nom ?? "—"}
                </span>

                {/* Zone */}
                <span style={{ fontSize: 13, color: doc.zone ? "#1D1D1F" : "#AEAEB2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.zone ?? "—"}
                </span>

                {/* Date */}
                <span style={{ fontSize: 12, color: "#6E6E73" }}>
                  {formatDate(doc.created_at)}
                </span>

                {/* Taille */}
                <span style={{ fontSize: 12, color: "#6E6E73" }}>
                  {formatTaille(doc.taille_ko)}
                </span>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={downloading === doc.id}
                    title="Télécharger"
                    style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", backgroundColor: "#F5F5F7", display: "flex", alignItems: "center", justifyContent: "center", cursor: downloading === doc.id ? "wait" : "pointer", opacity: downloading === doc.id ? 0.6 : 1 }}
                  >
                    <Download size={14} color="#2563EB" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(doc)}
                    disabled={deleting === doc.id}
                    title="Supprimer"
                    style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", backgroundColor: "#FFF1F0", display: "flex", alignItems: "center", justifyContent: "center", cursor: deleting === doc.id ? "wait" : "pointer", opacity: deleting === doc.id ? 0.6 : 1 }}
                  >
                    <Trash2 size={14} color="#FF3B30" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal upload */}
      {showUpload && (
        <UploadDocumentModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); load(); }}
        />
      )}

      {/* Confirmation suppression */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={() => setConfirmDelete(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", background: "#FFFFFF", borderRadius: 16, padding: "28px 28px 24px", maxWidth: 380, width: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.15)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1D1D1F", margin: "0 0 8px" }}>Supprimer le document</h3>
            <p style={{ fontSize: 14, color: "#6E6E73", margin: "0 0 24px", lineHeight: 1.5 }}>
              «&nbsp;{confirmDelete.nom}&nbsp;» sera définitivement supprimé. Cette action est irréversible.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, height: 42, borderRadius: 12, border: "1px solid rgba(0,0,0,0.10)", backgroundColor: "#F5F5F7", color: "#6E6E73", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting === confirmDelete.id}
                style={{ flex: 1, height: 42, borderRadius: 12, border: "none", backgroundColor: deleting ? "#C7C7CC" : "#FF3B30", color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer" }}
              >
                {deleting === confirmDelete.id ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
