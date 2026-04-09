"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatFieldValue,
  formatThresholdHint,
  getDashboardTrendFields,
  getFieldStatus,
  getFieldValue,
  type NumberFieldConfig,
  type RondeType,
} from "@/lib/rondes";
import type { RondeWithDonnees } from "@/lib/supabase";

type TrendPoint = {
  label: string;
  value: number | null;
};

function shortDateLabel(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function renderThreshold(field: NumberFieldConfig, stroke: string) {
  if (!field.threshold) return null;
  if (field.threshold.kind === "range") {
    return (
      <>
        <ReferenceLine y={field.threshold.min} stroke={stroke} strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.5} />
        <ReferenceLine y={field.threshold.max} stroke={stroke} strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.5} />
      </>
    );
  }
  return (
    <ReferenceLine
      y={field.threshold.value}
      stroke={stroke}
      strokeDasharray="4 4"
      strokeWidth={1}
      strokeOpacity={0.5}
    />
  );
}

function TrendCard({
  field,
  rounds,
  stroke,
}: {
  field: NumberFieldConfig;
  rounds: RondeWithDonnees[];
  stroke: string;
}) {
  const data: TrendPoint[] = rounds
    .slice()
    .sort((a, b) => a.date_heure.localeCompare(b.date_heure))
    .map((round) => ({
      label: shortDateLabel(round.date_heure.split("T")[0]),
      value: (getFieldValue(round.donnees, field.path) as number | null) ?? null,
    }));

  const latestRound = rounds[0] ?? null;
  const latestValue = latestRound ? getFieldValue(latestRound.donnees, field.path) : null;
  const status = latestRound ? getFieldStatus(field, latestRound.donnees) : "empty";
  const hasData = data.some((point) => point.value !== null);
  const gradientId = `trend-${field.id}-${stroke.replace(/[^a-zA-Z0-9]/g, "")}`;

  const badgeStyle: { color: string; backgroundColor: string } =
    status === "alert"
      ? { color: "#FF3B30", backgroundColor: "#FFF1F0" }
      : status === "ok"
      ? { color: "#34C759", backgroundColor: "#F0FDF4" }
      : { color: "#AEAEB2", backgroundColor: "#F5F5F7" };

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 12,
        padding: "14px 14px 12px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {field.label}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: "#1D1D1F", lineHeight: 1.1 }}>
            {formatFieldValue(field, latestValue)}
          </p>
        </div>
        <span
          style={{
            padding: "3px 10px",
            borderRadius: 16,
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: "nowrap",
            ...badgeStyle,
          }}
        >
          {status === "alert" ? "⚠ Anomalie" : status === "ok" ? "✓ Stable" : "Sans donnée"}
        </span>
      </div>

      {formatThresholdHint(field) && (
        <p style={{ margin: "0 0 8px", fontSize: 11, color: "#AEAEB2" }}>
          {formatThresholdHint(field)}
        </p>
      )}

      <div style={{ height: 80 }}>
        {!hasData ? (
          <div
            style={{
              height: "100%",
              borderRadius: 10,
              backgroundColor: "#F5F5F7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#AEAEB2",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Pas encore de relevé
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#AEAEB2" }} tickLine={false} axisLine={false} />
              <YAxis hide domain={["auto", "auto"]} />
              {renderThreshold(field, stroke)}
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
                formatter={(value) => [`${value}${field.unit ? ` ${field.unit}` : ""}`, field.label]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={stroke}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={{ r: 3, fill: stroke, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

const ACCENTS: Record<RondeType, { stroke: string; title: string; subtitle: string }> = {
  ouverture: {
    stroke: "#FF9500",
    title: "Tendances ouverture",
    subtitle: "Les indicateurs les plus sensibles du matin sur les 7 derniers jours.",
  },
  fermeture: {
    stroke: "#5856D6",
    title: "Tendances fermeture",
    subtitle: "Le suivi du soir pour anticiper les dérives avant la nuit.",
  },
};

export default function RondeTrendSection({
  type,
  historique,
}: {
  type: RondeType;
  historique: RondeWithDonnees[];
}) {
  const accent = ACCENTS[type];
  const rounds = historique.filter((round) => round.type === type);
  const fields = getDashboardTrendFields(type);

  return (
    <section
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        padding: "18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.7px", textTransform: "uppercase", color: accent.stroke }}>
            {accent.title}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#AEAEB2" }}>
            {accent.subtitle}
          </p>
        </div>
        <span
          style={{
            padding: "3px 10px",
            borderRadius: 16,
            backgroundColor: "#F5F5F7",
            color: "#6E6E73",
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {rounds.length} ronde{rounds.length > 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
        {fields.map((field) => (
          <TrendCard key={field.id} field={field} rounds={rounds} stroke={accent.stroke} />
        ))}
      </div>
    </section>
  );
}
