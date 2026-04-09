"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, FileDown, RotateCcw } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { saveRonde } from "@/lib/supabase";
import {
  cloneDefaultDonnees,
  detectHorsNorme,
  fieldHasAlert,
  formatThresholdHint,
  getFieldValue,
  getVisibleRondeSections,
  sectionHasAlert,
  setFieldValue,
  type DonneesRonde,
  type OkNok,
  type RondeFieldConfig,
} from "@/lib/rondes";

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
        { value: "ok" as const, label: okLabel, color: "#34C759", background: "#F0FDF4" },
        { value: "nok" as const, label: nokLabel, color: "#FF3B30", background: "#FFF1F0" },
      ]).map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(selected ? null : option.value)}
            style={{
              minWidth: 82,
              padding: "10px 14px",
              borderRadius: 10,
              border: `1.5px solid ${selected ? option.color : "rgba(0,0,0,0.1)"}`,
              backgroundColor: selected ? option.background : "#FFFFFF",
              color: selected ? option.color : "#6E6E73",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  unit,
  alert,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
  alert: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
        style={{
          width: 96,
          padding: "10px 12px",
          textAlign: "right",
          borderRadius: 10,
          border: `1.5px solid ${alert ? "#FF3B30" : "rgba(0,0,0,0.12)"}`,
          backgroundColor: alert ? "#FFF1F0" : "#FFFFFF",
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
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: alert ? 700 : 500,
            color: alert ? "#FF3B30" : "#1D1D1F",
            lineHeight: 1.35,
          }}
        >
          {field.label}
        </p>
        {field.kind === "number" && formatThresholdHint(field) ? (
          <p style={{ margin: "3px 0 0", fontSize: 12, color: alert ? "#FF3B30" : "#8E8E93" }}>
            {formatThresholdHint(field)}
          </p>
        ) : null}
      </div>

      {field.kind === "number" ? (
        <NumberInput
          value={typeof rawValue === "number" ? rawValue : null}
          onChange={(value) => onChange(field.path, value)}
          unit={field.unit}
          alert={alert}
        />
      ) : (
        <BinaryToggle
          value={rawValue === "ok" || rawValue === "nok" ? rawValue : null}
          onChange={(value) => onChange(field.path, value)}
          okLabel={field.labels?.ok ?? "OK"}
          nokLabel={field.labels?.nok ?? "NOK"}
        />
      )}
    </div>
  );
}

function SectionCard({
  title,
  hasAlert,
  children,
}: {
  title: string;
  hasAlert: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        border: `1px solid ${hasAlert ? "rgba(255,59,48,0.22)" : "rgba(0,0,0,0.06)"}`,
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        padding: "16px 18px 2px",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1D1D1F" }}>{title}</h2>
        <span
          style={{
            padding: "5px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            color: hasAlert ? "#FF3B30" : "#34C759",
            backgroundColor: hasAlert ? "#FFF1F0" : "#F0FDF4",
            whiteSpace: "nowrap",
          }}
        >
          {hasAlert ? "Anomalie" : "OK"}
        </span>
      </div>
      {children}
    </section>
  );
}

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

export default function RondeFormPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as "ouverture" | "fermeture";

  const [donnees, setDonnees] = useState<DonneesRonde>(cloneDefaultDonnees());
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sigRef = useRef<SignatureCanvas>(null);
  const sigContainerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(320);

  useEffect(() => {
    function refreshCanvasWidth() {
      if (sigContainerRef.current) {
        setCanvasWidth(sigContainerRef.current.offsetWidth);
      }
    }

    refreshCanvasWidth();
    window.addEventListener("resize", refreshCanvasWidth);
    return () => window.removeEventListener("resize", refreshCanvasWidth);
  }, []);

  const sections = useMemo(() => getVisibleRondeSections(type), [type]);
  const anomalyCount = sections.filter((section) => sectionHasAlert(section, donnees)).length;
  const totalFields = sections.reduce((count, section) => count + section.fields.length, 0);
  const completedFields = sections.reduce(
    (count, section) => count + section.fields.filter((field) => {
      const value = getFieldValue(donnees, field.path);
      return value !== null && value !== undefined && value !== "";
    }).length,
    0,
  );

  function handleFieldChange(path: readonly string[], value: number | OkNok | null) {
    setDonnees((current) => setFieldValue(current, path, value));
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
        type,
        donnees,
        observations,
        signature,
        generatedAt: new Date().toISOString(),
        title: `Récap ronde ${type}`,
      });

      const blob = await pdf(element).toBlob();

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `recap_ronde_${type}_${new Date().toISOString().slice(0, 10)}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (pdfError) {
      setError(pdfError instanceof Error ? pdfError.message : "Erreur lors de la génération du PDF.");
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleSubmit() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setError("Veuillez signer avant de valider la ronde.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveRonde({
        type,
        donnees,
        observations,
        signature: sigRef.current.toDataURL("image/png"),
        hors_norme: detectHorsNorme(donnees),
      });
      router.push("/rondes");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Erreur lors de la sauvegarde");
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F5F5F7" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          padding: "14px 16px 12px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          backgroundColor: "rgba(245,245,247,0.95)",
          backdropFilter: "blur(20px)",
        }}
      >
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
              Feuille Sofitel · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "18px 16px 32px" }}>
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            padding: "18px 20px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1D1D1F" }}>
                {completedFields}/{totalFields} champs renseignes
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#8E8E93" }}>
                Les valeurs cibles et seuils s&apos;affichent directement dans chaque section.
              </p>
            </div>
            <span
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                color: anomalyCount > 0 ? "#FF3B30" : "#34C759",
                backgroundColor: anomalyCount > 0 ? "#FFF1F0" : "#F0FDF4",
              }}
            >
              {anomalyCount > 0 ? `${anomalyCount} section(s) en anomalie` : "Aucune anomalie"}
            </span>
          </div>
        </div>

        {sections.map((section) => (
          <SectionCard key={section.id} title={section.title} hasAlert={sectionHasAlert(section, donnees)}>
            {section.fields.map((field, index) => (
              <div key={field.id} style={{ borderBottom: index === section.fields.length - 1 ? "none" : undefined }}>
                <FieldRow field={field} data={donnees} onChange={handleFieldChange} />
              </div>
            ))}
          </SectionCard>
        ))}

        {anomalyCount > 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "14px 16px",
              marginBottom: 16,
              borderRadius: 14,
              border: "1px solid rgba(255,59,48,0.2)",
              backgroundColor: "#FFF1F0",
            }}
          >
            <AlertTriangle size={18} color="#FF3B30" style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#FF3B30" }}>
                Valeurs hors seuil detectees
              </p>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: "#B42318" }}>
                La ronde sera marquee hors norme et une notification sera envoyee au DT.
              </p>
            </div>
          </div>
        ) : null}

        <section
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            padding: "16px 18px",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1D1D1F" }}>Observations generales</h2>
          <textarea
            value={observations}
            onChange={(event) => setObservations(event.target.value)}
            rows={4}
            placeholder="Saisir un commentaire libre sur la ronde..."
            style={{
              width: "100%",
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              backgroundColor: "#FFFFFF",
              fontSize: 14,
              color: "#1D1D1F",
              resize: "vertical",
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </section>

        <section
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            padding: "16px 18px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1D1D1F" }}>Signature</h2>
            <button
              type="button"
              onClick={() => sigRef.current?.clear()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                color: "#6E6E73",
                fontSize: 13,
                cursor: "pointer",
                padding: 0,
              }}
            >
              <RotateCcw size={14} />
              Effacer
            </button>
          </div>
          <div
            ref={sigContainerRef}
            style={{
              borderRadius: 14,
              overflow: "hidden",
              border: "1.5px solid rgba(0,0,0,0.12)",
              backgroundColor: "#FFFFFF",
              touchAction: "none",
            }}
          >
            <SignatureCanvas
              ref={sigRef}
              canvasProps={{ width: canvasWidth, height: 180, style: { display: "block" } }}
              backgroundColor="white"
              penColor="#1D1D1F"
            />
          </div>
        </section>

        {error ? (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,59,48,0.2)",
              backgroundColor: "#FFF1F0",
              fontSize: 13,
              color: "#B42318",
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={exportingPdf}
            style={{
              width: "100%",
              borderRadius: 14,
              padding: "14px 16px",
              border: "1px solid rgba(37,99,235,0.16)",
              backgroundColor: "#FFFFFF",
              color: "#2563EB",
              fontSize: 15,
              fontWeight: 700,
              cursor: exportingPdf ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <FileDown size={16} />
            {exportingPdf ? "Génération du PDF..." : "Télécharger le récap PDF"}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            style={{
              ...primaryButton,
              backgroundColor: saving ? "#9CA3AF" : "#2563EB",
              boxShadow: saving ? "none" : primaryButton.boxShadow,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Sauvegarde en cours..." : "Valider la ronde"}
          </button>
        </div>
      </div>
    </div>
  );
}
