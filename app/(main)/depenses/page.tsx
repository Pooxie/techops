"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Eye, X, Loader2, Check, Camera } from "lucide-react";
import Header from "@/components/layout/Header";
import {
  fetchDepenses,
  createDepense,
  uploadDepensePhoto,
  type Depense,
  type DepenseType,
} from "@/lib/supabase";

// ── Constantes ────────────────────────────────────────────────────────────────

type Filtre = "toutes" | "a_envoyer" | "envoyees";

const TYPE_LABELS: Record<DepenseType, string> = {
  facture_prestataire: "Facture prestataire",
  achat_fournisseur: "Achat fournisseur",
  achat_magasin: "Achat magasin",
};

const TYPE_COLORS: Record<DepenseType, { color: string; bg: string }> = {
  facture_prestataire: { color: "#1D4ED8", bg: "#EFF6FF" },
  achat_fournisseur:   { color: "#D97706", bg: "#FFFBEB" },
  achat_magasin:       { color: "#15803D", bg: "#F0FDF4" },
};

const TYPES: DepenseType[] = ["facture_prestataire", "achat_fournisseur", "achat_magasin"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateFull(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function fmtEur(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

function isThisMonth(iso: string) {
  const d = new Date(iso), now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

// ── TypeBadge ─────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: DepenseType }) {
  const { color, bg } = TYPE_COLORS[type];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color, backgroundColor: bg, whiteSpace: "nowrap" }}>
      {TYPE_LABELS[type]}
    </span>
  );
}

// ── StatutBadge ───────────────────────────────────────────────────────────────

function StatutBadge({ envoyee, envoye_le }: { envoyee: boolean; envoye_le: string | null }) {
  if (envoyee) {
    return (
      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: "#15803D", backgroundColor: "#F0FDF4", whiteSpace: "nowrap" }}>
        Envoyée{envoye_le ? ` le ${fmtDateShort(envoye_le)}` : ""}
      </span>
    );
  }
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: "#6E6E73", backgroundColor: "#F5F5F7", whiteSpace: "nowrap" }}>
      À envoyer
    </span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ title, value, sub }: { title: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "#AEAEB2" }}>{title}</p>
      <span style={{ fontSize: 24, fontWeight: 700, color: "#1D1D1F", lineHeight: 1.1 }}>{value}</span>
      {sub && <div style={{ fontSize: 11, color: "#6E6E73", lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4500);
    return () => clearTimeout(t);
  }, [onDone]);

  const isError = message.startsWith("Erreur");
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 2000,
      background: "#1D1D1F", color: "#FFFFFF", borderRadius: 14,
      padding: "13px 18px", fontSize: 13, fontWeight: 600,
      display: "flex", alignItems: "center", gap: 8,
      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    }}>
      {isError
        ? <X size={15} color="#F87171" />
        : <Check size={15} color="#34D399" />
      }
      {message}
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const isImage = /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(url);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(0,0,0,0.90)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#FFF" }}>
        <X size={20} />
      </button>
      {isImage ? (
        <img src={url} alt="Justificatif" onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "90vw", maxHeight: "90dvh", borderRadius: 12, objectFit: "contain", boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }} />
      ) : (
        <iframe src={url} onClick={(e: React.MouseEvent) => e.stopPropagation()}
          style={{ width: "88vw", height: "88dvh", borderRadius: 12, border: "none" }} />
      )}
    </div>
  );
}

// ── Modal Dépense ─────────────────────────────────────────────────────────────

type AiField = "type" | "fournisseur" | "montant" | "date" | "description";

function DepenseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [type, setType]               = useState<DepenseType>("facture_prestataire");
  const [date, setDate]               = useState(todayISO());
  const [fournisseur, setFournisseur] = useState("");
  const [description, setDescription] = useState("");
  const [montant, setMontant]         = useState("");
  const [file, setFile]               = useState<File | null>(null);
  const [preview, setPreview]         = useState<string | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [scanning, setScanning]       = useState(false);
  const [aiFields, setAiFields]       = useState<Set<AiField>>(new Set());
  const [scanToast, setScanToast]     = useState<{ ok: boolean; msg: string } | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const scanFileRef = useRef<HTMLInputElement>(null);
  const manualFileRef = useRef<HTMLInputElement>(null);

  // Dismiss scan toast after 4s
  useEffect(() => {
    if (!scanToast) return;
    const t = setTimeout(() => setScanToast(null), 4000);
    return () => clearTimeout(t);
  }, [scanToast]);

  function handleManualFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setAiFields(new Set()); // manual — no AI highlights
    if (f.type.startsWith("image/")) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  }

  async function handleScanFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    // Store photo immediately
    setFile(f);
    if (f.type.startsWith("image/")) setPreview(URL.createObjectURL(f));

    if (!f.type.startsWith("image/")) {
      setScanToast({ ok: false, msg: "Scan IA disponible uniquement pour les images" });
      setAiFields(new Set());
      return;
    }

    setScanning(true);
    setAiFields(new Set());

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });

      const res = await fetch("/api/scan-facture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: f.type }),
      });

      const json = await res.json() as { success: boolean; data?: { type: string | null; fournisseur: string | null; montant: number | null; date: string | null; description: string | null }; error?: string };

      if (!json.success || !json.data) {
        throw new Error(json.error ?? "Erreur d'analyse");
      }

      const d = json.data;
      const filled = new Set<AiField>();

      if (d.type && TYPES.includes(d.type as DepenseType)) {
        setType(d.type as DepenseType);
        filled.add("type");
      }
      if (d.fournisseur) { setFournisseur(d.fournisseur); filled.add("fournisseur"); }
      if (d.montant != null) { setMontant(String(d.montant)); filled.add("montant"); }
      if (d.date) { setDate(d.date); filled.add("date"); }
      if (d.description) { setDescription(d.description); filled.add("description"); }

      setAiFields(filled);
      setScanToast({ ok: true, msg: "✨ Facture analysée — vérifiez les informations" });
    } catch (err) {
      setScanToast({ ok: false, msg: `Impossible de lire la facture — remplissez manuellement` });
    } finally {
      setScanning(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const m = parseFloat(montant.replace(",", "."));
    if (!date || !fournisseur.trim() || isNaN(m) || m <= 0) {
      setError("Remplissez tous les champs obligatoires (date, fournisseur, montant).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let photo_url: string | undefined;
      if (file) {
        setUploading(true);
        photo_url = await uploadDepensePhoto(file);
        setUploading(false);
      }
      await createDepense({
        date, type,
        fournisseur: fournisseur.trim(),
        description: description.trim() || undefined,
        montant: m,
        photo_url,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
      setSaving(false);
      setUploading(false);
    }
  }

  function aiInp(field: AiField): React.CSSProperties {
    const base: React.CSSProperties = {
      display: "block", width: "100%", marginTop: 5, padding: "10px 12px",
      borderRadius: 10, fontSize: 14, outline: "none",
      boxSizing: "border-box", fontFamily: "inherit",
    };
    if (aiFields.has(field)) {
      return { ...base, border: "2px solid #2563EB", background: "#EFF6FF" };
    }
    return { ...base, border: "1px solid rgba(0,0,0,0.12)" };
  }

  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#3C3C43" };
  const disabled = scanning || saving;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#FFFFFF", borderRadius: 20, width: "100%", maxWidth: 500, margin: "0 16px", boxShadow: "0 24px 48px rgba(0,0,0,0.18)", maxHeight: "94dvh", overflowY: "auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 0" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1D1D1F" }}>Ajouter une dépense</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8E8E93", display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        {/* Scan toast */}
        {scanToast && (
          <div style={{
            margin: "12px 24px 0",
            padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: scanToast.ok ? "#EFF6FF" : "#FEF2F2",
            color: scanToast.ok ? "#1D4ED8" : "#B91C1C",
            border: `1px solid ${scanToast.ok ? "#BFDBFE" : "#FECACA"}`,
          }}>
            {scanToast.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Photo / Scan section — always first ─────────────────────── */}
          <div>
            {/* Hidden inputs */}
            <input ref={scanFileRef} type="file" accept="image/*" capture="environment"
              onChange={handleScanFile} style={{ display: "none" }} />
            <input ref={manualFileRef} type="file" accept="image/*,application/pdf"
              onChange={handleManualFile} style={{ display: "none" }} />

            {!file ? (
              /* ── No file yet: show two CTA buttons ── */
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Primary: AI scan */}
                <button type="button" onClick={() => scanFileRef.current?.click()}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    padding: "18px 20px", width: "100%", minHeight: 60,
                    borderRadius: 14, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
                    color: "#FFF", fontSize: 14, fontWeight: 700,
                    boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
                    boxSizing: "border-box",
                  }}>
                  <span style={{ fontSize: 18 }}>✨</span>
                  Scanner la facture avec l'IA
                </button>
                {/* Secondary: manual */}
                <button type="button" onClick={() => manualFileRef.current?.click()}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "12px 16px", width: "100%",
                    borderRadius: 12, border: "1px solid rgba(0,0,0,0.10)",
                    background: "#FAFAFA", color: "#6E6E73",
                    fontSize: 12, fontWeight: 500, cursor: "pointer",
                    boxSizing: "border-box",
                  }}>
                  <Camera size={14} />
                  Ajouter un justificatif sans scan
                </button>
              </div>
            ) : scanning ? (
              /* ── Scanning in progress ── */
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#F5F3FF", borderRadius: 14, border: "1px solid #DDD6FE" }}>
                {preview && (
                  <img src={preview} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Loader2 size={14} color="#7C3AED" className="animate-spin" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#5B21B6" }}>Analyse IA en cours…</span>
                  </div>
                  <span style={{ fontSize: 11, color: "#7C3AED" }}>Claude lit votre facture</span>
                </div>
              </div>
            ) : (
              /* ── File selected, not scanning ── */
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: aiFields.size > 0 ? "#EFF6FF" : "#F5F5F7", borderRadius: 12, border: `1px solid ${aiFields.size > 0 ? "#BFDBFE" : "rgba(0,0,0,0.08)"}` }}>
                {preview ? (
                  <img src={preview} alt="Aperçu" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                ) : (
                  <span style={{ fontSize: 24, flexShrink: 0 }}>📄</span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#1D1D1F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {aiFields.size > 0 ? "✨ Facture analysée" : file.name}
                  </p>
                  {aiFields.size > 0 && (
                    <p style={{ margin: "2px 0 0", fontSize: 10, color: "#2563EB" }}>
                      {aiFields.size} champ{aiFields.size > 1 ? "s" : ""} pré-rempli{aiFields.size > 1 ? "s" : ""} — vérifiez ci-dessous
                    </p>
                  )}
                </div>
                <button type="button"
                  onClick={() => { setFile(null); setPreview(null); setAiFields(new Set()); if (scanFileRef.current) scanFileRef.current.value = ""; if (manualFileRef.current) manualFileRef.current.value = ""; }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#8E8E93", flexShrink: 0 }}>
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* ── Type ────────────────────────────────────────────────────── */}
          <div>
            <label style={lbl}>
              Type de dépense *
              {aiFields.has("type") && <span style={{ marginLeft: 6, fontSize: 10, color: "#2563EB", fontWeight: 700 }}>✨ IA</span>}
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {TYPES.map((t) => {
                const { color, bg } = TYPE_COLORS[t];
                const active = type === t;
                const isAi = active && aiFields.has("type");
                return (
                  <button
                    key={t} type="button" onClick={() => { if (!disabled) setType(t); }}
                    disabled={disabled}
                    style={{
                      padding: "11px 14px", borderRadius: 10, textAlign: "left", cursor: disabled ? "not-allowed" : "pointer",
                      border: isAi ? "2px solid #2563EB" : active ? `2px solid ${color}` : "2px solid rgba(0,0,0,0.08)",
                      background: isAi ? "#EFF6FF" : active ? bg : "#FAFAFA",
                      color: active ? color : "#6E6E73",
                      fontSize: 13, fontWeight: active ? 700 : 400,
                    }}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Date + Montant ───────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>
                Date *
                {aiFields.has("date") && <span style={{ marginLeft: 6, fontSize: 10, color: "#2563EB", fontWeight: 700 }}>✨ IA</span>}
              </label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                style={aiInp("date")} disabled={disabled} />
            </div>
            <div>
              <label style={lbl}>
                Montant (€) *
                {aiFields.has("montant") && <span style={{ marginLeft: 6, fontSize: 10, color: "#2563EB", fontWeight: 700 }}>✨ IA</span>}
              </label>
              <input type="number" min="0.01" step="0.01" placeholder="0,00" value={montant}
                onChange={(e) => setMontant(e.target.value)} style={aiInp("montant")} disabled={disabled} />
            </div>
          </div>

          {/* ── Fournisseur ──────────────────────────────────────────────── */}
          <div>
            <label style={lbl}>
              Fournisseur / Magasin *
              {aiFields.has("fournisseur") && <span style={{ marginLeft: 6, fontSize: 10, color: "#2563EB", fontWeight: 700 }}>✨ IA</span>}
            </label>
            <input type="text" placeholder="ex : Sider, Monsieur Bricolage, SUEZ…" value={fournisseur}
              onChange={(e) => setFournisseur(e.target.value)} style={aiInp("fournisseur")} disabled={disabled} />
          </div>

          {/* ── Description ──────────────────────────────────────────────── */}
          <div>
            <label style={lbl}>
              Description
              {aiFields.has("description") && <span style={{ marginLeft: 6, fontSize: 10, color: "#2563EB", fontWeight: 700 }}>✨ IA</span>}
            </label>
            <input type="text" placeholder="ex : Joints époxy, pompe de relevage…" value={description}
              onChange={(e) => setDescription(e.target.value)} style={aiInp("description")} disabled={disabled} />
          </div>

          {error && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "#FEF2F2", color: "#B91C1C", fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", background: "#F5F5F7", color: "#1D1D1F", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Annuler
            </button>
            <button type="submit" disabled={disabled}
              style={{ flex: 2, padding: 12, borderRadius: 12, border: "none", background: "#2563EB", color: "#FFF", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.7 : 1 }}>
              {scanning ? "Analyse en cours…" : uploading ? "Upload photo…" : saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function DepensesPage() {
  const [depenses, setDepenses]   = useState<Depense[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [filtre, setFiltre]       = useState<Filtre>("toutes");
  const [showModal, setShowModal] = useState(false);
  const [lightbox, setLightbox]   = useState<string | null>(null);
  const [toast, setToast]         = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const d = await fetchDepenses();
    setDepenses(d);
    setLoading(false);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  // ── KPIs ────────────────────────────────────────────────────────────────────

  const depensesMois     = depenses.filter((d) => isThisMonth(d.date));
  const totalMois        = depensesMois.reduce((s, d) => s + d.montant, 0);
  const aEnvoyer         = depenses.filter((d) => !d.envoye_compta);
  const totalAEnvoyer    = aEnvoyer.reduce((s, d) => s + d.montant, 0);
  const envoyesMoisCount = depensesMois.filter((d) => d.envoye_compta).length;
  const attentesMoisCount= depensesMois.filter((d) => !d.envoye_compta).length;

  // ── Table filtrée ────────────────────────────────────────────────────────────

  const displayed = depenses.filter((d) => {
    if (filtre === "a_envoyer") return !d.envoye_compta;
    if (filtre === "envoyees")  return d.envoye_compta;
    return true;
  });

  // ── Sélection ────────────────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(selected.size === displayed.length ? new Set() : new Set(displayed.map((d) => d.id)));
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", color: "#AEAEB2", gap: 10 }}>
        <Loader2 size={20} className="animate-spin" />
        <span style={{ fontSize: 14 }}>Chargement des dépenses…</span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100dvh", background: "#F5F5F7" }}>
      <Header title="Dépenses & Factures" />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }} className="page-main">

        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1D1D1F" }}>Dépenses & Factures</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6E6E73" }}>
              Service Technique · Sofitel Golfe d'Ajaccio
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => setShowModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 12, border: "none", background: "#2563EB", color: "#FFF", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(37,99,235,0.28)" }}
            >
              <Plus size={15} />
              Ajouter une dépense
            </button>
          </div>
        </div>

        {/* ── KPIs ────────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gap: 16 }} className="grid-3-resp">
          <KpiCard
            title="Total ce mois"
            value={fmtEur(totalMois)}
            sub={`${depensesMois.length} dépense${depensesMois.length > 1 ? "s" : ""} enregistrée${depensesMois.length > 1 ? "s" : ""}`}
          />
          <KpiCard
            title="En attente d'envoi"
            value={fmtEur(totalAEnvoyer)}
            sub={`${aEnvoyer.length} document${aEnvoyer.length > 1 ? "s" : ""} à transmettre à la comptable`}
          />
          <KpiCard
            title="Documents ce mois"
            value={String(depensesMois.length)}
            sub={`${envoyesMoisCount} envoyé${envoyesMoisCount > 1 ? "s" : ""} · ${attentesMoisCount} en attente`}
          />
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>

          {/* Barre filtres */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid rgba(0,0,0,0.06)", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {(
                [["toutes", "Toutes"], ["a_envoyer", "À envoyer"], ["envoyees", "Envoyées"]] as [Filtre, string][]
              ).map(([k, label]) => (
                <button key={k} onClick={() => setFiltre(k)}
                  style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: filtre === k ? "#1D1D1F" : "transparent", color: filtre === k ? "#FFFFFF" : "#6E6E73", fontSize: 12, fontWeight: filtre === k ? 700 : 400, cursor: "pointer" }}>
                  {label}
                  {k === "a_envoyer" && aEnvoyer.length > 0 && (
                    <span style={{ marginLeft: 5, background: "#DC2626", color: "#FFF", borderRadius: 10, padding: "1px 5px", fontSize: 9, fontWeight: 700, verticalAlign: "middle" }}>
                      {aEnvoyer.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {selected.size > 0 && (
              <span style={{ fontSize: 12, color: "#2563EB", fontWeight: 600 }}>
                {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {displayed.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#AEAEB2", fontSize: 13 }}>
              Aucune dépense{filtre !== "toutes" ? " dans cette catégorie" : ""} —{" "}
              {filtre === "toutes" && (
                <button onClick={() => setShowModal(true)} style={{ background: "none", border: "none", color: "#2563EB", fontSize: 13, cursor: "pointer", padding: 0 }}>
                  Ajouter la première dépense
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: "#F9F9FB" }}>
                    <th style={{ padding: "9px 14px", width: 40 }}>
                      <input type="checkbox"
                        checked={selected.size === displayed.length && displayed.length > 0}
                        onChange={toggleAll}
                        style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#2563EB" }} />
                    </th>
                    {["Date", "Type", "Fournisseur", "Description", "Montant", "Photo", "Statut"].map((c) => (
                      <th key={c} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "1px solid rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((d, i) => {
                    const isSel = selected.has(d.id);
                    return (
                      <tr key={d.id}
                        style={{ backgroundColor: isSel ? "#EFF6FF" : i % 2 === 0 ? "#FFFFFF" : "#FAFAFA", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                        <td style={{ padding: "9px 14px" }}>
                          <input type="checkbox" checked={isSel} onChange={() => toggleSelect(d.id)}
                            style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#2563EB" }} />
                        </td>
                        <td style={{ padding: "9px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>{fmtDateFull(d.date)}</td>
                        <td style={{ padding: "9px 12px" }}><TypeBadge type={d.type} /></td>
                        <td style={{ padding: "9px 12px", fontWeight: 600 }}>{d.fournisseur}</td>
                        <td style={{ padding: "9px 12px", color: "#6E6E73", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {d.description ?? "—"}
                        </td>
                        <td style={{ padding: "9px 12px", fontWeight: 700 }}>{fmtEur(d.montant)}</td>
                        <td style={{ padding: "9px 12px" }}>
                          {d.photo_url ? (
                            <button onClick={() => setLightbox(d.photo_url!)}
                              style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 9px", borderRadius: 8, border: "1px solid rgba(37,99,235,0.2)", background: "#EFF6FF", color: "#2563EB", fontSize: 11, cursor: "pointer" }}>
                              <Eye size={11} />
                              Voir
                            </button>
                          ) : (
                            <span style={{ color: "#C7C7CC" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <StatutBadge envoyee={d.envoye_compta} envoye_le={d.envoye_le} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* ── Modals & overlays ─────────────────────────────────────────────── */}
      {showModal && (
        <DepenseModal onClose={() => setShowModal(false)} onCreated={() => void loadData()} />
      )}
      {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
