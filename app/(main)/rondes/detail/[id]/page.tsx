"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sunrise, Sunset, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import {
  LineChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, YAxis,
} from "recharts";
import Header from "@/components/layout/Header";
import {
  fetchRondeById,
  fetchRondesHistoriqueWithDonnees,
  type RondeWithDonnees,
} from "@/lib/supabase";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

// ── Sparkline ────────────────────────────────────────────────────────────────

type SparkPoint = { t: string; v: number | null };

function Sparkline({
  title,
  data,
  unit,
  thresholdMin,
  thresholdMax,
  color,
}: {
  title: string;
  data: SparkPoint[];
  unit: string;
  thresholdMin?: number;
  thresholdMax?: number;
  color: string;
}) {
  const hasData = data.some((d) => d.v !== null);
  const filled = data.map((d) => ({ t: d.t, v: d.v })).filter((d) => d.v !== null);

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
            {thresholdMin !== undefined && (
              <ReferenceLine y={thresholdMin} stroke="#FF3B30" strokeDasharray="3 3" strokeWidth={1} />
            )}
            {thresholdMax !== undefined && (
              <ReferenceLine y={thresholdMax} stroke="#FF3B30" strokeDasharray="3 3" strokeWidth={1} />
            )}
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

// ── Section values ────────────────────────────────────────────────────────────

type OkNok = "ok" | "nok" | null;

function ValueRow({ label, value, unit, min, max }: { label: string; value: number | null; unit?: string; min?: number; max?: number }) {
  const isOk = value === null ? null : (
    (min !== undefined && value < min) || (max !== undefined && value > max) ? false : true
  );
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
      <span style={{ fontSize: 13, color: "#6E6E73" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: isOk === false ? "#FF3B30" : "#1D1D1F" }}>
          {value !== null ? `${value}${unit ?? ""}` : "—"}
        </span>
        {isOk !== null && (
          isOk
            ? <CheckCircle size={13} color="#34C759" />
            : <AlertCircle size={13} color="#FF3B30" />
        )}
      </div>
    </div>
  );
}

function OkNokRow({ label, value }: { label: string; value: OkNok }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
      <span style={{ fontSize: 13, color: "#6E6E73" }}>{label}</span>
      {value === null
        ? <span style={{ fontSize: 12, color: "#C7C7CC" }}>—</span>
        : value === "ok"
          ? <CheckCircle size={14} color="#34C759" />
          : <AlertCircle size={14} color="#FF3B30" />}
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

  const isOuv = ronde.type === "ouverture";
  const d = ronde.donnees;

  // Sparkline data: last 7 days, all rondes sorted ascending
  const sorted = [...historique].sort((a, b) => a.date_heure.localeCompare(b.date_heure));

  function spark(getter: (r: RondeWithDonnees) => number | null): SparkPoint[] {
    return sorted.map((r) => ({
      t: r.date_heure.split("T")[0],
      v: getter(r),
    }));
  }

  const chartData = [
    {
      title: "pH Piscine hôtel",
      data: spark((r) => r.donnees.piscine_thalasso.piscine_hotel.ph),
      unit: "",
      thresholdMin: 7.2,
      thresholdMax: 7.6,
      color: "#2563EB",
    },
    {
      title: "Chlore Piscine hôtel",
      data: spark((r) => r.donnees.piscine_thalasso.piscine_hotel.chlore_libre),
      unit: " mg/L",
      thresholdMin: 0.4,
      thresholdMax: 1.4,
      color: "#5856D6",
    },
    {
      title: "T° Thalasso",
      data: spark((r) => r.donnees.piscine_thalasso.thalasso.temp_echange),
      unit: "°C",
      thresholdMax: 32,
      color: "#FF9500",
    },
    {
      title: "T° Départ ECS",
      data: spark((r) => r.donnees.chaufferie_ecs.chaufferie.temp_depart_ecs),
      unit: "°C",
      thresholdMin: 55,
      thresholdMax: 65,
      color: "#FF3B30",
    },
    {
      title: "T° Ballon ECS",
      data: spark((r) => r.donnees.chaufferie_ecs.chaufferie.temp_ballon),
      unit: "°C",
      thresholdMin: 55,
      color: "#FF6B00",
    },
    {
      title: "Niveau fuel",
      data: spark((r) => r.donnees.chaufferie_ecs.dry_cooling.niveau_fuel),
      unit: "%",
      color: "#34C759",
    },
  ];

  const { piscine_hotel: ph, piscine_institut: pi, thalasso: th, surpresseur: sur, baches: bac, filtration_emf: filt } = d.piscine_thalasso;
  const { chaufferie: ch, recyclage: rec, geg_hotel: geg, dry_cooling: dry, compteurs_pompes_edm: pompes, compteur_emu: emu } = d.chaufferie_ecs;
  const { reception: recep, cave_economat: cave, compresseur_air: compr, coffret_relevage: crel, coffret_puisard: cpuis } = d.technique_generale;

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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 28 }}>
          {chartData.map((chart) => (
            <Sparkline key={chart.title} {...chart} />
          ))}
        </div>

        {/* Valeurs détaillées */}
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.7px", textTransform: "uppercase", color: "#AEAEB2", margin: "0 0 12px" }}>
          Valeurs relevées
        </p>

        <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", padding: "4px 16px 8px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 14 }}>
          <SectionTitle title="Piscine hôtel" />
          <ValueRow label="pH" value={ph.ph} min={7.2} max={7.6} />
          <ValueRow label="Chlore libre" value={ph.chlore_libre} unit=" mg/L" min={0.4} max={1.4} />
          <ValueRow label="Température" value={ph.temperature} unit="°C" />
          <ValueRow label="Hypochlorite" value={ph.niveau_hypochlorite} unit="%" />
          <ValueRow label="Compteur débit" value={ph.compteur_debit} />
          <OkNokRow label="Nettoyage filtres" value={ph.nettoyage_filtres} />
          <OkNokRow label="Contrôle Swan" value={ph.controle_swan} />
          <OkNokRow label="Débordement" value={ph.debordement} />

          <SectionTitle title="Piscine institut" />
          <ValueRow label="pH" value={pi.ph} min={7.2} max={7.6} />
          <ValueRow label="Chlore libre" value={pi.chlore_libre} unit=" mg/L" min={0.4} max={1.4} />
          <ValueRow label="Température" value={pi.temperature} unit="°C" />
          <OkNokRow label="Gallet pédiluves" value={pi.gallet_pediluves} />
          <OkNokRow label="Débordement" value={pi.debordement} />

          <SectionTitle title="Thalasso" />
          <ValueRow label="T° échange" value={th.temp_echange} unit="°C" max={32} />
          <ValueRow label="Compteur remplissage" value={th.compteur_remplissage} />
          <ValueRow label="N° pompe filtration" value={th.num_pompe_filtration} />
          <ValueRow label="Compteur remplissage EMF" value={th.compteur_remplissage_emf} />
          <OkNokRow label="Nettoyage filtres" value={th.nettoyage_filtres} />
          <OkNokRow label="Contrôle Swan" value={th.controle_swan} />

          <SectionTitle title="Surpresseur" />
          <ValueRow label="P5 eau mer" value={sur.p5_eau_mer} unit=" bar" />
          <ValueRow label="P7C affusions" value={sur.p7c_affusions} unit=" bar" />
          <ValueRow label="P7B douches jet" value={sur.p7b_douches_jet} unit=" bar" />
          <ValueRow label="P7A baignoires" value={sur.p7a_baignoires} unit=" bar" />

          <SectionTitle title="Bâches" />
          <OkNokRow label="Piscine niveau" value={bac.piscine_niveau} />
          <OkNokRow label="EMF niveau" value={bac.emf_niveau} />
          <OkNokRow label="EMC niveau" value={bac.emc_niveau} />

          <SectionTitle title="Filtration EMF" />
          <ValueRow label="Pression avant filtre" value={filt.pression_av_filtre} unit=" bar" />
          <ValueRow label="Pression après filtre" value={filt.pression_apres_filtre} unit=" bar" />
          <OkNokRow label="Contrôle UV" value={filt.controle_uv} />
          <OkNokRow label="Contrôle Swan" value={filt.controle_swan} />

          {d.piscine_thalasso.observations ? (
            <div style={{ padding: "8px 0" }}>
              <p style={{ fontSize: 11, color: "#AEAEB2", margin: "0 0 3px" }}>Observations</p>
              <p style={{ fontSize: 13, color: "#1D1D1F", margin: 0 }}>{d.piscine_thalasso.observations}</p>
            </div>
          ) : null}
        </div>

        <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", padding: "4px 16px 8px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 14 }}>
          <SectionTitle title="Chaufferie" />
          <ValueRow label="Pression primaire" value={ch.pression_primaire} unit=" bar" />
          <ValueRow label="T° primaire échangeur" value={ch.temp_primaire_echangeur} unit="°C" />
          <ValueRow label="T° départ ECS" value={ch.temp_depart_ecs} unit="°C" min={55} max={65} />
          <ValueRow label="T° ballon" value={ch.temp_ballon} unit="°C" min={55} />
          <OkNokRow label="Pompe bouclage" value={ch.pompe_bouclage} />

          <SectionTitle title="Recyclage" />
          <ValueRow label="T° S3" value={rec.temp_s3} unit="°C" />
          <ValueRow label="T° S4" value={rec.temp_s4} unit="°C" />
          <ValueRow label="T° S5" value={rec.temp_s5} unit="°C" />

          <SectionTitle title="GEG hôtel" />
          <ValueRow label="Pression" value={geg.pression} unit=" bar" />
          <ValueRow label="Température" value={geg.temperature} unit="°C" />

          <SectionTitle title="Dry cooling" />
          <ValueRow label="Niveau fuel" value={dry.niveau_fuel} unit="%" />
          <OkNokRow label="Pression circuit" value={dry.pression_circuit} />

          <SectionTitle title="Compteurs pompes EDM" />
          <ValueRow label="Pompe 1" value={pompes.pompe1} />
          <ValueRow label="Pompe 2" value={pompes.pompe2} />

          <SectionTitle title="Compteur EMU" />
          <ValueRow label="Débit" value={emu.debit} />
          <OkNokRow label="Contrôle voyants" value={emu.controle_voyants} />
          <OkNokRow label="Contrôle UV" value={emu.controle_uv} />

          {d.chaufferie_ecs.observations ? (
            <div style={{ padding: "8px 0" }}>
              <p style={{ fontSize: 11, color: "#AEAEB2", margin: "0 0 3px" }}>Observations</p>
              <p style={{ fontSize: 13, color: "#1D1D1F", margin: 0 }}>{d.chaufferie_ecs.observations}</p>
            </div>
          ) : null}
        </div>

        <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", padding: "4px 16px 8px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 14 }}>
          <SectionTitle title="Réception" />
          <OkNokRow label="Alarme incendie" value={recep.alarme_incendie} />
          <OkNokRow label="Éclairage secours" value={recep.eclairage_secours} />
          <OkNokRow label="Pression GEG" value={recep.pression_geg} />

          <SectionTitle title="Cave / économat" />
          <OkNokRow label="Séparateur graisse" value={cave.separateur_graisse} />
          <OkNokRow label="Coffret relevage" value={cave.coffret_relevage} />
          <OkNokRow label="Pompe puisard" value={cave.pompe_puisard} />

          <SectionTitle title="Compresseur air" />
          <ValueRow label="Pression Spilotairs" value={compr.pression_spilotairs} unit=" bar" />
          <OkNokRow label="Mise en route" value={compr.mise_en_route} />
          <OkNokRow label="Contrôle huile" value={compr.controle_huile} />

          <SectionTitle title="Coffrets" />
          <OkNokRow label="Relevage — voyants" value={crel.controle_voyants} />
          <OkNokRow label="Puisard — voyants" value={cpuis.controle_voyants} />

          {d.technique_generale.observations ? (
            <div style={{ padding: "8px 0" }}>
              <p style={{ fontSize: 11, color: "#AEAEB2", margin: "0 0 3px" }}>Observations</p>
              <p style={{ fontSize: 13, color: "#1D1D1F", margin: 0 }}>{d.technique_generale.observations}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
