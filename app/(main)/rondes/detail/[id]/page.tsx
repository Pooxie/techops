"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Sunrise, Sunset, ArrowLeft, AlertCircle, CheckCircle, FileDown } from "lucide-react";
import {
  LineChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, YAxis,
} from "recharts";
import Header from "@/components/layout/Header";
import {
  fetchRondeById,
  fetchRondesHistoriqueWithDonnees,
  type RondeWithDonnees,
} from "@/lib/supabase";
import {
  formatFieldValue,
  formatThresholdHint,
  getDetailTrendFields,
  getFieldStatus,
  getFieldValue,
  getVisibleRondeSections,
  type NumberFieldConfig,
  type RondeFieldConfig,
} from "@/lib/rondes";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

type SparkPoint = { t: string; v: number | null };

function Sparkline({
  title,
  data,
  unit,
  field,
  color,
}: {
  title: string;
  data: SparkPoint[];
  unit: string;
  field: NumberFieldConfig;
  color: string;
}) {
  const hasData = data.some((d) => d.v !== null);
  const filled = data.map((d) => ({ t: d.t, v: d.v })).filter((d) => d.v !== null);

  function renderThresholds() {
    if (!field.threshold) return null;
    if (field.threshold.kind === "range") {
      return (
        <>
          <ReferenceLine y={field.threshold.min} stroke="#FF3B30" strokeDasharray="3 3" strokeWidth={1} />
          <ReferenceLine y={field.threshold.max} stroke="#FF3B30" strokeDasharray="3 3" strokeWidth={1} />
        </>
      );
    }
    return (
      <ReferenceLine
        y={field.threshold.value}
        stroke="#FF3B30"
        strokeDasharray="3 3"
        strokeWidth={1}
      />
    );
  }

  return (
    <div style={{
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      border: "1px solid rgba(0,0,0,0.06)",
      padding: "12px 14px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <p style={{ fontSize: 11, color: "#8E8E93", margin: "0 0 6px", fontWeight: 600, letterSpacing: "0.3px" }}>
        {title}
      </p>
      {formatThresholdHint(field) ? (
        <p style={{ fontSize: 10, color: "#AEAEB2", margin: "0 0 8px" }}>{formatThresholdHint(field)}</p>
      ) : null}
      {!hasData ? (
        <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 11, color: "#C7C7CC" }}>Pas de données</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={64}>
          <LineChart data={filled} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fontSize: 9, fill: "#AEAEB2" }}
              width={36}
              tickCount={3}
            />
            {renderThresholds()}
            <Tooltip
              contentStyle={{ fontSize: 11, padding: "4px 8px", borderRadius: 8 }}
              formatter={(v) => [`${v}${unit}`, ""]}
              labelFormatter={() => ""}
            />
            <Line
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function ValueRow({ field, ronde }: { field: RondeFieldConfig; ronde: RondeWithDonnees }) {
  const value = getFieldValue(ronde.donnees, field.path);
  const status = getFieldStatus(field, ronde.donnees);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
      <div>
        <span style={{ fontSize: 13, color: "#6E6E73" }}>{field.label}</span>
        {field.kind === "number" && formatThresholdHint(field) ? (
          <p style={{ margin: "2px 0 0", fontSize: 10, color: "#AEAEB2" }}>{formatThresholdHint(field)}</p>
        ) : null}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: status === "alert" ? "#FF3B30" : "#1D1D1F" }}>
          {formatFieldValue(field, value)}
        </span>
        {status !== "empty" && (
          status === "ok"
            ? <CheckCircle size={13} color="#34C759" />
            : <AlertCircle size={13} color="#FF3B30" />
        )}
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color: "#AEAEB2", letterSpacing: "0.7px", textTransform: "uppercase", margin: "18px 0 8px" }}>
      {title}
    </p>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RondeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [ronde, setRonde] = useState<RondeWithDonnees | null>(null);
  const [historique, setHistorique] = useState<RondeWithDonnees[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchRondeById(id),
      fetchRondesHistoriqueWithDonnees(7),
    ]).then(([r, hist]) => {
      setRonde(r);
      setHistorique(hist);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div>
        <Header title="Détail ronde" />
        <div style={{ padding: "32px 20px" }}>
          <p style={{ fontSize: 14, color: "#AEAEB2" }}>Chargement…</p>
        </div>
      </div>
    );
  }

  if (!ronde) {
    return (
      <div>
        <Header title="Détail ronde" />
        <div style={{ padding: "32px 20px" }}>
          <p style={{ fontSize: 14, color: "#FF3B30" }}>Ronde introuvable.</p>
        </div>
      </div>
    );
  }

  const currentRonde = ronde;
  const isOuv = currentRonde.type === "ouverture";
  const sorted = [...historique].sort((a, b) => a.date_heure.localeCompare(b.date_heure));
  const sections = getVisibleRondeSections(currentRonde.type);

  function spark(field: NumberFieldConfig): SparkPoint[] {
    return sorted.map((r) => ({
      t: r.date_heure.split("T")[0],
      v: (getFieldValue(r.donnees, field.path) as number | null) ?? null,
    }));
  }

  const trendFields = getDetailTrendFields(currentRonde.type).map((field, index) => ({
    field,
    title: field.label,
    data: spark(field),
    unit: field.unit ? ` ${field.unit}` : "",
    color: ["#2563EB", "#5856D6", "#FF9500", "#FF3B30", "#34C759", "#0EA5E9"][index % 6],
  }));

  async function handleDownloadPdf() {
    setExportingPdf(true);

    try {
      const [{ pdf }, { RondeRecapPdf }, React] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/pdf/RondeRecapPdf"),
        import("react"),
      ]);

      const element = React.default.createElement(RondeRecapPdf, {
        type: currentRonde.type,
        donnees: currentRonde.donnees,
        observations: currentRonde.observations,
        signature: currentRonde.signature,
        generatedAt: currentRonde.date_heure,
        technicien: currentRonde.technicien_prenom,
        title: `Récap ronde ${currentRonde.type}`,
      });

      const blob = await pdf(element).toBlob();

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ronde_${currentRonde.type}_${currentRonde.date_heure.slice(0, 10)}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div>
      <Header title="Détail ronde" />

      <div style={{ padding: "24px 20px", maxWidth: 640 }}>
        {/* Bouton retour */}
        <button
          onClick={() => router.back()}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", padding: "0 0 16px",
            cursor: "pointer", color: "#2563EB", fontSize: 15,
          }}
        >
          <ArrowLeft size={16} />
          Retour
        </button>

        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={exportingPdf}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(37,99,235,0.16)",
            backgroundColor: "#FFFFFF",
            color: "#2563EB",
            fontSize: 14,
            fontWeight: 700,
            cursor: exportingPdf ? "not-allowed" : "pointer",
          }}
        >
          <FileDown size={16} />
          {exportingPdf ? "Génération du PDF..." : "Télécharger le PDF"}
        </button>

        {/* Header ronde */}
        <div style={{
          backgroundColor: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)",
          padding: "18px 20px", marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {isOuv
                ? <Sunrise size={24} color="#FF9500" strokeWidth={2} />
                : <Sunset size={24} color="#5856D6" strokeWidth={2} />}
              <div>
                <p style={{ fontSize: 17, fontWeight: 700, color: "#1D1D1F", margin: 0, textTransform: "capitalize" }}>
                  Ronde {ronde.type}
                </p>
                <p style={{ fontSize: 13, color: "#8E8E93", margin: "2px 0 0", textTransform: "capitalize" }}>
                  {formatDateLong(ronde.date_heure)} · {formatTime(ronde.date_heure)}
                </p>
                <p style={{ fontSize: 12, color: "#AEAEB2", margin: "2px 0 0" }}>
                  {ronde.technicien_prenom}
                </p>
              </div>
            </div>
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: ronde.hors_norme ? "#FF9500" : "#34C759",
              backgroundColor: ronde.hors_norme ? "#FFF5E6" : "#F0FDF4",
              padding: "4px 12px", borderRadius: 16,
            }}>
              {ronde.hors_norme ? "⚠ anomalie" : "✓ Tout OK"}
            </span>
          </div>
        </div>

        {/* Graphiques sparklines */}
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.7px", textTransform: "uppercase", color: "#AEAEB2", margin: "0 0 12px" }}>
          Tendances 7 jours
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 28 }}>
          {trendFields.map((chart) => (
            <Sparkline key={chart.title} title={chart.title} data={chart.data} unit={chart.unit} field={chart.field} color={chart.color} />
          ))}
        </div>

        {/* Valeurs détaillées */}
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.7px", textTransform: "uppercase", color: "#AEAEB2", margin: "0 0 12px" }}>
          Valeurs relevées
        </p>

        {sections.map((section) => (
          <div key={section.id} style={{ backgroundColor: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", padding: "4px 16px 8px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 14 }}>
            <SectionTitle title={section.title} />
            {section.fields.map((field) => (
              <ValueRow key={field.id} field={field} ronde={ronde} />
            ))}
          </div>
        ))}

        {ronde.observations ? (
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.7px", textTransform: "uppercase", color: "#AEAEB2", margin: "0 0 8px" }}>
              Observations generales
            </p>
            <p style={{ margin: 0, fontSize: 14, color: "#1D1D1F", lineHeight: 1.5 }}>{ronde.observations}</p>
          </div>
        ) : null}

        {ronde.signature ? (
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.7px", textTransform: "uppercase", color: "#AEAEB2", margin: "0 0 8px" }}>
              Signature
            </p>
            <Image
              src={ronde.signature}
              alt="Signature de la ronde"
              width={420}
              height={180}
              unoptimized
              style={{ width: "100%", maxWidth: 420, height: "auto", borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)" }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
