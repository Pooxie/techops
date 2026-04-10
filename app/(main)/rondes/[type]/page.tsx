"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, ChevronDown, ChevronRight, FileDown, RotateCcw } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { createRondeEnCours, updateRondeDonnees, validateRonde } from "@/lib/supabase";
import {
  cloneDefaultDonnees,
  detectHorsNorme,
  fieldHasAlert,
  fieldHasWarn,
  formatThresholdHint,
  getFieldValue,
  getVisibleRondeSections,
  sectionHasAlert,
  setFieldValue,
  BASSINS_CONFIG,
  isTempBassinOk,
  isCloreLibreOk,
  isChloreComibineOk,
  type DonneesRonde,
  type OkNok,
  type RondeFieldConfig,
  type RondeSectionConfig,
  type BassinMeasure,
  type BassinKey,
  type BassinConfig,
  type Transparence,
} from "@/lib/rondes";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sectionCompletedCount(section: RondeSectionConfig, donnees: DonneesRonde): number {
  return section.fields.filter((field) => {
    const v = getFieldValue(donnees, field.path);
    if (field.kind === "binary") return v === "ok" || v === "nok";
    return v !== null && v !== undefined && v !== "";
  }).length;
}

function sectionIsComplete(section: RondeSectionConfig, donnees: DonneesRonde): boolean {
  return sectionCompletedCount(section, donnees) === section.fields.length;
}

function bassinMeasureFilledCount(m: BassinMeasure): number {
  return [m.heure, m.transparence, m.temperature, m.chlore_libre, m.chlore_total, m.chlore_combine]
    .filter((v) => v !== null && v !== undefined).length;
}

const BASSIN_FIELDS_PER_SLOT = 6; // matin only

// ── Toggle OK/NOK ─────────────────────────────────────────────────────────────

function BinaryToggle({
  value,
  onChange,
  okLabel,
  nokLabel,
}: {
  value: OkNok;
  onChange: (value: OkNok) => void;
  okLabel: string;
  nokLabel: string;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      {([
        { value: "ok" as const, label: okLabel, color: "#15803D", bg: "#F0FDF4" },
        { value: "nok" as const, label: nokLabel, color: "#DC2626", bg: "#FEF2F2" },
      ] as const).map((opt) => {
        const sel = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(sel ? null : opt.value)}
            style={{
              minWidth: 80,
              padding: "10px 14px",
              borderRadius: 10,
              border: `1.5px solid ${sel ? opt.color : "rgba(0,0,0,0.1)"}`,
              backgroundColor: sel ? opt.bg : "#FFFFFF",
              color: sel ? opt.color : "#6E6E73",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Input numérique ───────────────────────────────────────────────────────────

function NumberInput({
  value,
  onChange,
  unit,
  alert,
  warn,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
  alert: boolean;
  warn?: boolean;
}) {
  const borderColor = alert ? "#DC2626" : warn ? "#D97706" : "rgba(0,0,0,0.12)";
  const bgColor = alert ? "#FEF2F2" : warn ? "#FFFBEB" : "#FFFFFF";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        style={{
          width: 96,
          padding: "10px 12px",
          textAlign: "right",
          borderRadius: 10,
          border: `1.5px solid ${borderColor}`,
          backgroundColor: bgColor,
          fontSize: 15,
          fontWeight: 600,
          color: "#1D1D1F",
          outline: "none",
        }}
      />
      {unit ? <span style={{ minWidth: 40, fontSize: 12, color: "#8E8E93" }}>{unit}</span> : null}
    </div>
  );
}

// ── Ligne de champ ────────────────────────────────────────────────────────────

function FieldRow({
  field,
  data,
  onChange,
}: {
  field: RondeFieldConfig;
  data: DonneesRonde;
  onChange: (path: readonly string[], value: number | OkNok | null) => void;
}) {
  const rawValue = getFieldValue(data, field.path);
  const alert = fieldHasAlert(field, data);
  const warn = field.kind === "number" ? fieldHasWarn(field, data) : false;
  const labelColor = alert ? "#DC2626" : warn ? "#D97706" : "#1D1D1F";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "14px 0",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: alert || warn ? 700 : 500, color: labelColor, lineHeight: 1.35 }}>
          {field.label}
        </p>
        {field.kind === "number" && formatThresholdHint(field) ? (
          <p style={{ margin: "3px 0 0", fontSize: 12, color: alert ? "#DC2626" : warn ? "#D97706" : "#8E8E93" }}>
            {formatThresholdHint(field)}
            {field.warnOnly ? " (indicatif)" : ""}
          </p>
        ) : null}
        {alert && field.kind === "number" && field.threshold ? (
          <p style={{ margin: "3px 0 0", fontSize: 11, fontWeight: 700, color: "#DC2626" }}>
            {field.threshold.kind === "range"
              ? `⚠ Hors seuil (${field.threshold.min}–${field.threshold.max} ${field.unit ?? ""})`
              : field.threshold.kind === "max"
              ? `⚠ Dépassement max (${field.threshold.value} ${field.unit ?? ""})`
              : `⚠ Valeur cible : ${field.threshold.value} ${field.unit ?? ""}`}
          </p>
        ) : null}
        {warn && field.kind === "number" && field.threshold && field.threshold.kind === "range" ? (
          <p style={{ margin: "3px 0 0", fontSize: 11, fontWeight: 700, color: "#D97706" }}>
            ⚠ Hors seuil indicatif ({field.threshold.min}–{field.threshold.max} {field.unit ?? ""})
          </p>
        ) : null}
      </div>

      {field.kind === "number" ? (
        <NumberInput
          value={typeof rawValue === "number" ? rawValue : null}
          onChange={(v) => onChange(field.path, v)}
          unit={field.unit}
          alert={alert}
          warn={warn}
        />
      ) : (
        <BinaryToggle
          value={rawValue === "ok" || rawValue === "nok" ? rawValue : null}
          onChange={(v) => onChange(field.path, v)}
          okLabel={field.labels?.ok ?? "OK"}
          nokLabel={field.labels?.nok ?? "NOK"}
        />
      )}
    </div>
  );
}

// ── Accordéon section ─────────────────────────────────────────────────────────

function AccordionSection({
  title,
  hasAlert,
  isComplete,
  completedCount,
  totalCount,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  hasAlert: boolean;
  isComplete: boolean;
  completedCount: number;
  totalCount: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const titleColor = hasAlert ? "#DC2626" : isComplete ? "#15803D" : "#1D1D1F";

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        border: `1px solid ${hasAlert ? "rgba(220,38,38,0.2)" : isComplete ? "rgba(21,128,61,0.2)" : "rgba(0,0,0,0.06)"}`,
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        marginBottom: 10,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "14px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          {isOpen
            ? <ChevronDown size={16} color="#8E8E93" />
            : <ChevronRight size={16} color="#8E8E93" />}
          <span style={{ fontSize: 15, fontWeight: 700, color: titleColor, flex: 1 }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {isComplete ? (
            <span style={{
              display: "flex", alignItems: "center", gap: 3,
              padding: "3px 9px", borderRadius: 999,
              fontSize: 11, fontWeight: 700, color: "#15803D", backgroundColor: "#F0FDF4",
            }}>
              <Check size={10} />
              Complet
            </span>
          ) : totalCount > 0 ? (
            <span style={{
              padding: "3px 9px", borderRadius: 999,
              fontSize: 11, fontWeight: 600, color: "#6E6E73", backgroundColor: "#F5F5F7",
            }}>
              {completedCount}/{totalCount}
            </span>
          ) : null}
          {hasAlert && (
            <span style={{
              padding: "3px 9px", borderRadius: 999,
              fontSize: 11, fontWeight: 700, color: "#DC2626", backgroundColor: "#FEF2F2",
            }}>
              Anomalie
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div style={{ padding: "0 16px 14px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Transparence toggle ───────────────────────────────────────────────────────

function TransparenceToggle({ value, onChange }: { value: Transparence; onChange: (v: Transparence) => void }) {
  const options: { v: NonNullable<Transparence>; label: string; color: string; bg: string }[] = [
    { v: "TB", label: "TB", color: "#15803D", bg: "#F0FDF4" },
    { v: "B",  label: "B",  color: "#D97706", bg: "#FFFBEB" },
    { v: "M",  label: "M",  color: "#DC2626", bg: "#FEF2F2" },
  ];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map((opt) => {
        const sel = value === opt.v;
        return (
          <button
            key={opt.v}
            type="button"
            onClick={() => onChange(sel ? null : opt.v)}
            style={{
              width: 40, height: 36, borderRadius: 9,
              border: `1.5px solid ${sel ? opt.color : "rgba(0,0,0,0.1)"}`,
              backgroundColor: sel ? opt.bg : "#FFFFFF",
              color: sel ? opt.color : "#6E6E73",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Colonne MATIN / SOIR d'un bassin ─────────────────────────────────────────

function BassinColumn({
  label,
  measure,
  config,
  onChange,
}: {
  label: string;
  measure: BassinMeasure;
  config: BassinConfig;
  onChange: (field: keyof BassinMeasure, value: string | number | null) => void;
}) {
  const tempAlert = !isTempBassinOk(config, measure.temperature);
  const clLibreAlert = !isCloreLibreOk(measure.chlore_libre);
  const clCombAlert = !isChloreComibineOk(measure.chlore_combine);

  function numInput(
    val: number | null,
    onChg: (v: number | null) => void,
    alert: boolean,
    unit?: string,
  ) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          type="number"
          inputMode="decimal"
          value={val ?? ""}
          onChange={(e) => onChg(e.target.value === "" ? null : Number(e.target.value))}
          style={{
            width: 74, padding: "8px 10px", borderRadius: 9, textAlign: "right",
            border: `1.5px solid ${alert ? "#DC2626" : "rgba(0,0,0,0.12)"}`,
            backgroundColor: alert ? "#FEF2F2" : "#FFFFFF",
            fontSize: 14, fontWeight: 600, color: "#1D1D1F", outline: "none",
          }}
        />
        {unit && <span style={{ fontSize: 11, color: "#8E8E93" }}>{unit}</span>}
      </div>
    );
  }

  function row(lbl: string, node: React.ReactNode, hint?: string) {
    return (
      <div style={{ borderBottom: "1px solid rgba(0,0,0,0.04)", paddingBottom: 10, marginBottom: 10 }}>
        <p style={{ margin: "0 0 5px", fontSize: 12, fontWeight: 600, color: "#6E6E73" }}>{lbl}</p>
        {hint && <p style={{ margin: "0 0 5px", fontSize: 10, color: "#AEAEB2" }}>{hint}</p>}
        {node}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{
        margin: "0 0 12px", fontSize: 11, fontWeight: 800,
        letterSpacing: "0.8px", textTransform: "uppercase",
        color: "#2563EB", textAlign: "center",
        padding: "5px 0", backgroundColor: "#EFF6FF", borderRadius: 8,
      }}>
        {label}
      </p>
      {row("Heure", (
        <input
          type="time"
          value={measure.heure ?? ""}
          onChange={(e) => onChange("heure", e.target.value || null)}
          style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: "1.5px solid rgba(0,0,0,0.12)", fontSize: 14, color: "#1D1D1F", outline: "none", backgroundColor: "#FFFFFF" }}
        />
      ))}
      {row("Transparence", (
        <TransparenceToggle value={measure.transparence} onChange={(v) => onChange("transparence", v)} />
      ))}
      {row("Température", numInput(measure.temperature, (v) => onChange("temperature", v), tempAlert, "°C"),
        config.tempRange ? `${config.tempRange.min}–${config.tempRange.max}°C` : config.tempMax ? `≤${config.tempMax}°C` : undefined)}
      {row("Chlore libre DPD1", numInput(measure.chlore_libre, (v) => onChange("chlore_libre", v), clLibreAlert, "mg/L"), "0,4 – 1,4 mg/L")}
      {row("Chlore total DPD3", numInput(measure.chlore_total, (v) => onChange("chlore_total", v), false, "mg/L"))}
      {row(
        "Chloramine (DPD3–DPD1)",
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{
            width: 74, padding: "8px 10px", borderRadius: 9, textAlign: "right",
            border: `1.5px solid ${clCombAlert ? "#DC2626" : "rgba(0,0,0,0.08)"}`,
            backgroundColor: clCombAlert ? "#FEF2F2" : "#F5F5F7",
            fontSize: 14, fontWeight: 600,
            color: clCombAlert ? "#DC2626" : "#6E6E73",
          }}>
            {measure.chlore_libre !== null && measure.chlore_total !== null
              ? ((measure.chlore_total - measure.chlore_libre) >= 0
                  ? (measure.chlore_total - measure.chlore_libre).toFixed(2)
                  : "—")
              : "—"}
          </div>
          <span style={{ fontSize: 11, color: "#8E8E93" }}>mg/L</span>
        </div>,
        "< 0,6 mg/L (calculé)",
      )}
    </div>
  );
}

// ── Section bassin accordéon ──────────────────────────────────────────────────

function BassinAccordionSection({
  config,
  donnees,
  isOpen,
  onToggle,
  onChangeMatin,
}: {
  config: BassinConfig;
  donnees: DonneesRonde;
  isOpen: boolean;
  onToggle: () => void;
  onChangeMatin: (field: keyof BassinMeasure, value: string | number | null) => void;
}) {
  const matin = donnees[config.matinKey] as BassinMeasure;
  const hasAlert = !isTempBassinOk(config, matin.temperature) || !isCloreLibreOk(matin.chlore_libre) || !isChloreComibineOk(matin.chlore_combine);

  const filled = bassinMeasureFilledCount(matin);
  const totalFields = BASSIN_FIELDS_PER_SLOT;
  const isComplete = filled === totalFields;

  const titleColor = hasAlert ? "#DC2626" : isComplete ? "#15803D" : "#1D1D1F";

  return (
    <div style={{
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      border: `1px solid ${hasAlert ? "rgba(220,38,38,0.2)" : isComplete ? "rgba(21,128,61,0.2)" : "rgba(0,0,0,0.06)"}`,
      boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
      marginBottom: 10,
      overflow: "hidden",
    }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 10,
          padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          {isOpen ? <ChevronDown size={16} color="#8E8E93" /> : <ChevronRight size={16} color="#8E8E93" />}
          <span style={{ fontSize: 15, fontWeight: 700, color: titleColor, flex: 1 }}>{config.label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {isComplete ? (
            <span style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#15803D", backgroundColor: "#F0FDF4" }}>
              <Check size={10} />Complet
            </span>
          ) : (
            <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: "#6E6E73", backgroundColor: "#F5F5F7" }}>
              {filled}/{totalFields}
            </span>
          )}
          {hasAlert && (
            <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#DC2626", backgroundColor: "#FEF2F2" }}>
              Anomalie
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div style={{ padding: "0 16px 16px" }}>
          <BassinColumn label="MATIN" measure={matin} config={config} onChange={onChangeMatin} />
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const primaryButton: CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: 14,
  padding: "16px",
  backgroundColor: "#2563EB",
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(37,99,235,0.22)",
};

// ── Page principale ───────────────────────────────────────────────────────────

export default function RondeFormPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as "ouverture" | "fermeture";

  const [donnees, setDonnees] = useState<DonneesRonde>(cloneDefaultDonnees());
  const [observations, setObservations] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  // Auto-save state
  const [rondeId, setRondeId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sigRef = useRef<SignatureCanvas>(null);
  const sigContainerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(320);

  // Keep refs in sync for the auto-save interval
  const donneesPendingRef = useRef(donnees);
  useEffect(() => { donneesPendingRef.current = donnees; }, [donnees]);
  const observationsRef = useRef(observations);
  useEffect(() => { observationsRef.current = observations; }, [observations]);

  useEffect(() => {
    function refreshWidth() {
      if (sigContainerRef.current) setCanvasWidth(sigContainerRef.current.offsetWidth);
    }
    refreshWidth();
    window.addEventListener("resize", refreshWidth);
    return () => window.removeEventListener("resize", refreshWidth);
  }, []);

  // Auto-save every 30 s once a ronde is created
  useEffect(() => {
    if (!rondeId) return;
    const iv = setInterval(async () => {
      setAutoSaving(true);
      try {
        await updateRondeDonnees(rondeId, donneesPendingRef.current, observationsRef.current);
        setSavedAt(new Date());
      } catch {
        // Silently fail auto-save — user can still submit manually
      } finally {
        setAutoSaving(false);
      }
    }, 30_000);
    return () => clearInterval(iv);
  }, [rondeId]);

  // Create ronde on first input
  const maybeCreateRonde = useCallback(async () => {
    if (rondeId) return;
    try {
      const id = await createRondeEnCours(type);
      setRondeId(id);
    } catch {
      // Non-blocking — user can still fill the form, just no auto-save
    }
  }, [rondeId, type]);

  const sections = useMemo(() => getVisibleRondeSections(type), [type]);

  const anomalyCount = useMemo(
    () => sections.filter((s) => sectionHasAlert(s, donnees)).length,
    [sections, donnees],
  );

  const allSectionsComplete = useMemo(
    () => sections.every((s) => sectionIsComplete(s, donnees)),
    [sections, donnees],
  );

  const allBassinsComplete = useMemo(
    () => BASSINS_CONFIG.every((cfg) => {
      const m = donnees[cfg.matinKey] as BassinMeasure;
      return bassinMeasureFilledCount(m) === BASSIN_FIELDS_PER_SLOT;
    }),
    [donnees],
  );

  const allComplete = allSectionsComplete && allBassinsComplete;

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleFieldChange(path: readonly string[], value: number | OkNok | null) {
    setDonnees((cur) => setFieldValue(cur, path, value));
    maybeCreateRonde();
  }

  function handleBassinChange(key: BassinKey, field: keyof BassinMeasure, value: string | number | null) {
    setDonnees((prev) => ({
      ...prev,
      [key]: { ...(prev[key] as BassinMeasure), [field]: value },
    }));
    maybeCreateRonde();
  }

  async function handleDownloadPdf() {
    setExportingPdf(true);
    setError(null);
    try {
      const signature = sigRef.current && !sigRef.current.isEmpty()
        ? sigRef.current.toDataURL("image/png")
        : null;
      const [{ pdf }, { RondeRecapPdf }, React] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/pdf/RondeRecapPdf"),
        import("react"),
      ]);
      const element = React.default.createElement(RondeRecapPdf, {
        type, donnees, observations, signature,
        generatedAt: new Date().toISOString(),
        title: `Récap ronde ${type}`,
      });
      const blob = await pdf(element).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recap_ronde_${type}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la génération du PDF.");
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleSubmit() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setError("Veuillez signer avant de valider la ronde.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let id = rondeId;
      if (!id) {
        id = await createRondeEnCours(type);
        setRondeId(id);
      }
      await validateRonde(id, {
        donnees,
        observations,
        signature: sigRef.current.toDataURL("image/png"),
        hors_norme: detectHorsNorme(donnees),
      });
      router.push("/rondes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
      setSubmitting(false);
    }
  }

  const savedLabel = savedAt
    ? `Sauvegardé à ${savedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
    : rondeId
    ? "Non encore sauvegardé"
    : "Saisie en cours";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F5F7" }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        padding: "14px 16px 12px",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        backgroundColor: "rgba(245,245,247,0.95)",
        backdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => router.push("/rondes")}
            style={{ background: "none", border: "none", color: "#2563EB", padding: 0, cursor: "pointer" }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, textTransform: "capitalize", color: "#1D1D1F" }}>
              Ronde {type}
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8E8E93", textTransform: "capitalize" }}>
              Sofitel · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            {autoSaving ? (
              <p style={{ margin: 0, fontSize: 11, color: "#8E8E93" }}>Sauvegarde…</p>
            ) : (
              <p style={{ margin: 0, fontSize: 11, color: "#AEAEB2" }}>{savedLabel}</p>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "16px 14px 32px" }}>

        {/* Barre de progression */}
        <div style={{
          backgroundColor: "#FFFFFF", borderRadius: 14,
          border: "1px solid rgba(0,0,0,0.06)",
          padding: "14px 16px", marginBottom: 14,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1D1D1F" }}>
              {sections.filter((s) => sectionIsComplete(s, donnees)).length + (allBassinsComplete ? BASSINS_CONFIG.length : 0)}/{sections.length + BASSINS_CONFIG.length} sections complètes
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8E8E93" }}>
              Cliquez sur chaque section pour la compléter
            </p>
          </div>
          <span style={{
            padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
            color: anomalyCount > 0 ? "#DC2626" : "#15803D",
            backgroundColor: anomalyCount > 0 ? "#FEF2F2" : "#F0FDF4",
          }}>
            {anomalyCount > 0 ? `${anomalyCount} anomalie${anomalyCount > 1 ? "s" : ""}` : "Aucune anomalie"}
          </span>
        </div>

        {/* Section Régulation Bassins — en tête de formulaire */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ margin: "0 0 8px 4px", fontSize: 11, fontWeight: 800, letterSpacing: "0.7px", textTransform: "uppercase", color: "#64748B" }}>
            Régulation Bassins
          </p>
          {BASSINS_CONFIG.map((config) => (
            <BassinAccordionSection
              key={config.id}
              config={config}
              donnees={donnees}
              isOpen={openSections.has(`bassin-${config.id}`)}
              onToggle={() => toggleSection(`bassin-${config.id}`)}
              onChangeMatin={(field, value) => handleBassinChange(config.matinKey, field, value)}
            />
          ))}
        </div>

        {/* Sections accordéon — données techniques */}
        {sections.map((section) => {
          const completed = sectionCompletedCount(section, donnees);
          const total = section.fields.length;
          const hasAlert = sectionHasAlert(section, donnees);
          const isComplete = completed === total;
          const isOpen = openSections.has(section.id);

          return (
            <AccordionSection
              key={section.id}
              title={section.title}
              hasAlert={hasAlert}
              isComplete={isComplete}
              completedCount={completed}
              totalCount={total}
              isOpen={isOpen}
              onToggle={() => toggleSection(section.id)}
            >
              {section.fields.map((field, idx) => (
                <div key={field.id} style={{ borderBottom: idx === section.fields.length - 1 ? "none" : undefined }}>
                  <FieldRow field={field} data={donnees} onChange={handleFieldChange} />
                </div>
              ))}
            </AccordionSection>
          );
        })}

        {/* Anomalies warning */}
        {anomalyCount > 0 ? (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "14px 16px", marginTop: 8, marginBottom: 8,
            borderRadius: 14, border: "1px solid rgba(220,38,38,0.2)",
            backgroundColor: "#FEF2F2",
          }}>
            <AlertTriangle size={18} color="#DC2626" style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#DC2626" }}>
                Valeurs hors seuil détectées
              </p>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "#991B1B" }}>
                La ronde sera marquée hors norme et une notification sera envoyée au DT.
              </p>
            </div>
          </div>
        ) : null}

        {/* Observations */}
        <section style={{
          backgroundColor: "#FFFFFF", borderRadius: 16,
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          padding: "16px 18px", marginTop: 16, marginBottom: 14,
        }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1D1D1F" }}>Observations générales</h2>
          <textarea
            value={observations}
            onChange={(e) => { setObservations(e.target.value); maybeCreateRonde(); }}
            rows={4}
            placeholder="Saisir un commentaire libre sur la ronde..."
            style={{
              width: "100%", marginTop: 12, padding: "12px 14px",
              borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)",
              backgroundColor: "#FFFFFF", fontSize: 14, color: "#1D1D1F",
              resize: "vertical", fontFamily: "inherit", outline: "none",
              boxSizing: "border-box",
            }}
          />
        </section>

        {/* Signature */}
        <section style={{
          backgroundColor: "#FFFFFF", borderRadius: 16,
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          padding: "16px 18px", marginBottom: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1D1D1F" }}>Signature</h2>
            <button
              type="button"
              onClick={() => sigRef.current?.clear()}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#6E6E73", fontSize: 13, cursor: "pointer", padding: 0 }}
            >
              <RotateCcw size={14} />
              Effacer
            </button>
          </div>
          <div
            ref={sigContainerRef}
            style={{ borderRadius: 14, overflow: "hidden", border: "1.5px solid rgba(0,0,0,0.12)", backgroundColor: "#FFFFFF", touchAction: "none" }}
          >
            <SignatureCanvas
              ref={sigRef}
              canvasProps={{ width: canvasWidth, height: 180, style: { display: "block" } }}
              backgroundColor="white"
              penColor="#1D1D1F"
            />
          </div>
        </section>

        {/* Erreur */}
        {error ? (
          <div style={{
            marginBottom: 14, padding: "12px 14px", borderRadius: 12,
            border: "1px solid rgba(220,38,38,0.2)", backgroundColor: "#FEF2F2",
            fontSize: 13, color: "#991B1B",
          }}>
            {error}
          </div>
        ) : null}

        {/* Boutons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={exportingPdf}
            style={{
              width: "100%", borderRadius: 14, padding: "14px 16px",
              border: "1px solid rgba(37,99,235,0.16)", backgroundColor: "#FFFFFF",
              color: "#2563EB", fontSize: 15, fontWeight: 700,
              cursor: exportingPdf ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <FileDown size={16} />
            {exportingPdf ? "Génération du PDF…" : "Télécharger le récap PDF"}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              ...primaryButton,
              backgroundColor: submitting ? "#9CA3AF" : "#2563EB",
              boxShadow: submitting ? "none" : primaryButton.boxShadow,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Sauvegarde en cours…" : "Valider la ronde"}
          </button>
        </div>
      </div>
    </div>
  );
}
