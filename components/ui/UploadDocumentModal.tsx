"use client";

import { useEffect, useRef, useState } from "react";
import { X, Upload, FileText } from "lucide-react";
import {
  fetchSetControlesList,
  fetchEquipements,
  uploadDocument,
  type DocType,
  type SetControleItem,
  type EquipementRecord,
} from "@/lib/supabase";

const DOC_TYPES: { key: DocType; label: string }[] = [
  { key: "rapport",      label: "Rapport" },
  { key: "attestation",  label: "Attestation" },
  { key: "registre",     label: "Registre" },
  { key: "photo",        label: "Photo" },
  { key: "autre",        label: "Autre" },
];

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.10)",
  backgroundColor: "#F5F5F7",
  fontSize: 14,
  color: "#1D1D1F",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "var(--font-dm-sans)",
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

export default function UploadDocumentModal({
  onClose,
  onUploaded,
  initialSetControleId,
  initialEquipementId,
}: {
  onClose: () => void;
  onUploaded: () => void;
  initialSetControleId?: string | null;
  initialEquipementId?: string | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [nom, setNom] = useState("");
  const [type, setType] = useState<DocType>("rapport");
  const [zone, setZone] = useState("");
  const [setControleId, setSetControleId] = useState(initialSetControleId ?? "");
  const [equipementId, setEquipementId] = useState(initialEquipementId ?? "");
  const [setControles, setSetControles] = useState<SetControleItem[]>([]);
  const [equipements, setEquipements] = useState<EquipementRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSetControlesList().then(setSetControles).catch(() => {});
    fetchEquipements().then(setEquipements).catch(() => {});
  }, []);

  function handleFileSelected(f: File) {
    if (!ACCEPTED_MIME.includes(f.type)) {
      setError("Format non supporté. Accepté : PDF, JPG, PNG, WEBP");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("Fichier trop volumineux (max 10 Mo)");
      return;
    }
    setError("");
    setFile(f);
    if (!nom) setNom(f.name.replace(/\.[^/.]+$/, ""));
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelected(f);
  }

  async function handleSubmit() {
    if (!file) { setError("Sélectionne un fichier."); return; }
    if (!nom.trim()) { setError("Le nom est requis."); return; }
    setSaving(true);
    setError("");
    try {
      await uploadDocument(file, {
        nom: nom.trim(),
        type,
        zone: zone.trim() || null,
        set_controle_id: setControleId || null,
        equipement_id: equipementId || null,
      });
      onUploaded();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? "Erreur lors de l'upload");
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div
        style={{
          position: "relative",
          background: "#F5F5F7",
          borderRadius: "20px 20px 0 0",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "0 20px 48px",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#C7C7CC" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#1D1D1F" }}>Ajouter un document</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={22} color="#8E8E93" />
          </button>
        </div>

        {error && (
          <div style={{ background: "#FFF1F0", color: "#FF3B30", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? "#2563EB" : file ? "#34C759" : "rgba(0,0,0,0.15)"}`,
            borderRadius: 16,
            backgroundColor: dragging ? "#EFF6FF" : file ? "#F0FDF4" : "#FFFFFF",
            padding: "28px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            marginBottom: 20,
            transition: "all 0.15s",
          }}
        >
          {file ? (
            file.type.startsWith("image/") && preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" style={{ maxHeight: 120, borderRadius: 8, objectFit: "cover" }} />
            ) : (
              <FileText size={40} color="#FF3B30" />
            )
          ) : (
            <Upload size={32} color="#8E8E93" />
          )}
          <span style={{ fontSize: 14, color: file ? "#34C759" : "#6E6E73", fontWeight: file ? 600 : 400, textAlign: "center" }}>
            {file ? file.name : "Glisse un fichier ici ou clique pour choisir"}
          </span>
          {!file && (
            <span style={{ fontSize: 12, color: "#AEAEB2" }}>PDF, JPG, PNG, WEBP — max 10 Mo</span>
          )}
          {file && (
            <span style={{ fontSize: 12, color: "#8E8E93" }}>
              {file.size < 1024 * 1024
                ? `${Math.round(file.size / 1024)} Ko`
                : `${(file.size / (1024 * 1024)).toFixed(1)} Mo`}
            </span>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Nom du document *</label>
            <input style={fieldStyle} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Rapport vérification incendie" />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select style={fieldStyle} value={type} onChange={(e) => setType(e.target.value as DocType)}>
              {DOC_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Zone</label>
            <input style={fieldStyle} value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ex : Local technique RDC" />
          </div>
          <div>
            <label style={labelStyle}>Contrôle SET associé</label>
            <select style={fieldStyle} value={setControleId} onChange={(e) => setSetControleId(e.target.value)}>
              <option value="">— Aucun —</option>
              {setControles.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Équipement associé</label>
            <select style={fieldStyle} value={equipementId} onChange={(e) => setEquipementId(e.target.value)}>
              <option value="">— Aucun —</option>
              {equipements.map((eq) => <option key={eq.id} value={eq.id}>{eq.nom}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            marginTop: 24,
            width: "100%",
            height: 44,
            borderRadius: 12,
            border: "none",
            backgroundColor: saving ? "#C7C7CC" : "#2563EB",
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow: saving ? "none" : "0 1px 4px rgba(37,99,235,0.3)",
          }}
        >
          {saving ? "Upload en cours…" : "Téléverser le document"}
        </button>
      </div>
    </div>
  );
}
